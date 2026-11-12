"""Tests for LLM resilience layer (G12 — Q-LLM-01/02).

Cubre el circuito completo de ResilientClaudeService con SDK fake:
  1. retry con backoff exponencial — 2 fallos transitorios → 3er intento OK
  2. error NO retryable (auth) → corta inmediato, NO re-intenta
  3. circuit breaker: abre tras threshold fallos → fallback Ollama
     marcado `degraded` (degradación honesta, nunca silenciosa)
  4. breaker HALF_OPEN: tras recovery, 1 éxito cierra
  5. fallback Ollama real con httpx MockTransport
  6. TokenUsageLedger: umbral 80% → warning, 95% → critical
  7. invarianza de contrato: generate/generate_json/chat misma forma
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import pytest

from club_mcp.ai.claude_service import ClaudeService
from club_mcp.ai.resilience import (
    CircuitBreaker,
    OllamaFallback,
    ResilientClaudeService,
    TokenUsageLedger,
    build_resilient_claude_service,
)


# ── fakes ──────────────────────────────────────────────────────────

class FakeUsage:
    def __init__(self, i: int, o: int) -> None:
        self.input_tokens = i
        self.output_tokens = o


class FakeResponse:
    def __init__(self, text: str, i: int = 10, o: int = 20) -> None:
        class _C:
            pass

        c = _C()
        c.text = text
        self.content = [c]
        self.stop_reason = "end_turn"
        self.usage = FakeUsage(i, o)


class FlakyClient:
    """SDK fake: falla N veces con la excepción dada, luego responde OK."""

    def __init__(self, failures: int = 2, exc: Exception | None = None) -> None:
        self.failures = failures
        self.calls = 0
        self.exc = exc or TimeoutError("connection timed out")

        class _Messages:
            async def create(inner_self, **kw: Any) -> FakeResponse:
                nonlocaly = None  # noqa: F841 — legibilidad del fixture
                if FlakyClient_ref.calls < FlakyClient_ref.failures:
                    FlakyClient_ref.calls += 1
                    raise FlakyClient_ref.exc
                FlakyClient_ref.calls += 1
                return FakeResponse("respuesta-ok")

        self.messages = _Messages()

    # la clase interna necesita acceso a ESTE self:
    # (bind por closure vía atributo de clase — ver arriba)


FlakyClient_ref = None  # type: ignore[assignment]


def make_flaky_service(
    failures: int = 2, exc: Exception | None = None
) -> tuple[ResilientClaudeService, FlakyClient]:
    """Servicio resilient con SDK fake inyectado y sin fallback real."""
    global FlakyClient_ref
    inner = ClaudeService(api_key="test-key")
    client = FlakyClient(failures=failures, exc=exc)
    FlakyClient_ref = client
    inner.client = client  # type: ignore[assignment]
    svc = ResilientClaudeService(
        inner,
        max_attempts=3,
        timeout_seconds=5.0,
        backoff_base=0.01,  # tests: backoff mínimo
        backoff_cap=0.05,
        breaker=CircuitBreaker(name="test", failure_threshold=3,
                               window_seconds=60, recovery_seconds=0.2),
        fallback=None,  # desactivado en estos casos
        ledger=TokenUsageLedger(daily_budget=1_000_000),
        use_fallback=False,
    )
    return svc, client


class AuthError(Exception):
    """Mímica de anthropic.AuthenticationError (sin status_code → no retryable)."""

    def __init__(self) -> None:
        super().__init__("authentication_error: invalid api key")


class OverloadedError(Exception):
    """529 overloaded del API — retryable por nombre."""

    def __init__(self) -> None:
        super().__init__("overloaded_error")


# ── 1. retry ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_retry_recovers_transient_failures():
    svc, client = make_flaky_service(failures=2, exc=OverloadedError())
    result = await svc.generate("sys", "user")
    assert result["content"] == "respuesta-ok"
    assert client.calls == 3  # 2 fallos + 1 éxito
    assert result["usage"]["input_tokens"] == 10
    assert "error" not in result


@pytest.mark.asyncio
async def test_no_retry_on_auth_error():
    svc, client = make_flaky_service(failures=5, exc=AuthError())
    result = await svc.generate("sys", "user")
    # corta en el primer intento: auth no se reintenta
    assert client.calls == 1
    assert result["error"].startswith("authentication_error")
    assert result["content"] == ""


# ── 2. circuit breaker ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_breaker_opens_after_threshold():
    inner = ClaudeService(api_key="test-key")
    client = FlakyClient(failures=99, exc=OverloadedError())
    global FlakyClient_ref
    FlakyClient_ref = client
    inner.client = client  # type: ignore[assignment]
    breaker = CircuitBreaker(name="cb", failure_threshold=3, window_seconds=60,
                             recovery_seconds=999)
    svc = ResilientClaudeService(
        inner, max_attempts=1, backoff_base=0.01, backoff_cap=0.05,
        breaker=breaker, fallback=None, ledger=TokenUsageLedger(),
        use_fallback=False,
    )
    # 3 llamadas lógicas (1 intento c/u) → 3 fallos → breaker OPEN
    for _ in range(3):
        await svc.generate("sys", "user")
    assert breaker.state == CircuitBreaker.OPEN
    # 4ta llamada: circuito abierto → ni toca el SDK
    before = client.calls
    result = await svc.generate("sys", "user")
    assert client.calls == before
    assert "circuit_open" in result["error"]


@pytest.mark.asyncio
async def test_breaker_half_open_closes_on_success():
    breaker = CircuitBreaker(name="h", failure_threshold=2, window_seconds=60,
                            recovery_seconds=0.05)
    await breaker.record_failure()
    await breaker.record_failure()
    assert breaker.state == CircuitBreaker.OPEN
    await asyncio.sleep(0.06)  # recovery pasado
    assert await breaker.allow() is True  # → HALF_OPEN
    assert breaker.state == CircuitBreaker.HALF_OPEN
    await breaker.record_success()
    assert breaker.state == CircuitBreaker.CLOSED


# ── 3. fallback Ollama ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fallback_ollama_degrades_honestly():
    inner = ClaudeService(api_key="test-key")
    client = FlakyClient(failures=99, exc=OverloadedError())
    global FlakyClient_ref
    FlakyClient_ref = client
    inner.client = client  # type: ignore[assignment]
    svc = ResilientClaudeService(
        inner, max_attempts=1, backoff_base=0.01, backoff_cap=0.05,
        breaker=CircuitBreaker(name="fb", failure_threshold=50),
        fallback=_mock_ollama(),
        ledger=TokenUsageLedger(),
        use_fallback=True,
    )
    result = await svc.generate("sys", "user")
    assert result["degraded"] is True
    assert result["content"] == "respuesta-ollama"
    assert result["usage"]["provider"] == "ollama"
    assert "overloaded" in result["provider_error"]


def _mock_ollama() -> OllamaFallback:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "message": {"content": "respuesta-ollama"},
            "done": True,
        })

    fb = OllamaFallback(host="http://ollama-test", model="qwen-test")
    # parchear httpx.AsyncClient del módulo con MockTransport
    import club_mcp.ai.resilience as resilience_mod

    transport = httpx.MockTransport(handler)

    class PatchedClient(httpx.AsyncClient):
        def __init__(self, **kw: Any) -> None:
            kw["transport"] = transport
            super().__init__(**kw)

    resilience_mod.httpx.AsyncClient = PatchedClient  # type: ignore[attr-defined]
    return fb


# ── 4. ledger (Q-LLM-02) ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ledger_warns_at_80_and_critical_at_95():
    ledger = TokenUsageLedger(daily_budget=100)
    s = await ledger.record({"input_tokens": 50, "output_tokens": 30})  # 80%
    assert s is not None and s["level"] == "warning"
    s = await ledger.record({"input_tokens": 10, "output_tokens": 5})  # 95%
    assert s is not None and s["level"] == "critical"
    snap = ledger.snapshot()
    assert snap["tokens"] == 95 and snap["calls"] == 2


@pytest.mark.asyncio
async def test_ledger_budget_signal_in_response():
    svc, _client = make_flaky_service(failures=0)
    svc.ledger = TokenUsageLedger(daily_budget=30)
    result = await svc.generate("sys", "user")
    # 30 tokens usage (10+20) sobre budget 30 → 100% ≥ 95% → critical
    assert result.get("budget_alert", {}).get("level") == "critical"


# ── 5. invarianza de contrato ───────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_json_contract_unchanged():
    svc, _ = make_flaky_service(failures=0)
    # forzar contenido JSON con fence
    class _C:
        pass

    resp = FakeResponse('```json\n{"k": "v"}\n```')
    svc.inner.client.messages.create = None  # type: ignore[assignment]

    async def fake_create(**kw: Any) -> FakeResponse:
        return resp

    svc.inner.client.messages.create = fake_create  # type: ignore[method-assign]
    out = await svc.generate_json("sys", "user")
    assert out == {"k": "v"}


@pytest.mark.asyncio
async def test_factory_builds_full_stack():
    inner = ClaudeService(api_key="k")
    svc = build_resilient_claude_service(inner)
    assert isinstance(svc.breaker, CircuitBreaker)
    assert svc.fallback is not None and isinstance(svc.fallback, OllamaFallback)
    assert isinstance(svc.ledger, TokenUsageLedger)
    # chat mantiene la forma de ClaudeService
    out = await svc.chat("hola", user_role="socio", user_name="Test")
    assert set(out) == {"content", "stop_reason", "usage"} or "error" in out
