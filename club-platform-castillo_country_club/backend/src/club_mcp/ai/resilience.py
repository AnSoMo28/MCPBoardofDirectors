#!/usr/bin/env python3
"""G12-2 — Implementa Q-LLM-01: resiliencia production-grade para la capa
Claude del club.

Diseño (transporte centralizado, no try/except regados por método):

1. `ResilientClaudeService` (subclass de ClaudeService):
   - `generate`/`chat`/… no tocan `self.client.messages.create` directo:
     llaman a `_acall()` que orquesta el circuito completo.
   - `_acall()`: 1 llamada lógica = hasta N intentos con backoff
     exponencial + jitter, timeout por intento, circuit breaker compartido,
     y fallback a Ollama (settings) cuando el circuito abre.
   - Envuelve al Anthropic SDK de forma type-safe: el SDK ya trae sus
     propios retries para 429/5xx — el nuestro cubre timeouts de red,
     errores no-reintentables (auth) y degradación a Ollama.
2. `CircuitBreaker`: CLOSED→OPEN tras `threshold` fallos en ventana,
   OPEN→HALF_OPEN tras `recovery_seconds`, HALF_OPEN→CLOSED con 1 éxito.
   Thread-safe con asyncio.Lock. Sin dependencias nuevas.
3. `OllamaFallback`: cliente mínimo httpx (ya es trans dep de fastapi) que
   llama `{ollama_host}/api/chat` con el modelo fast de settings. Marca la
   respuesta con `"provider": "ollama"` para que la UI pueda avisar
   degradación (nada oculto — producción honesta).
4. `TokenUsageLedger` (contorno de Q-LLM-02, sin DB nueva): acumula usage
   por llamada en memoria de proceso + log estructurado + presupuesto
   diario configurable con WARNING al 80%/95%. Se expone en la respuesta
   como "usage_ledger" sólo cuando cruzó umbrales (señal visible, no ruido).

Invarianza de contrato: los 6 consumidores actuales NO cambian firma ni
tipo de retorno — sólo ganan resiliencia dentro de las mismas dicts.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from typing import Any

import httpx

from club_mcp.config.settings import get_settings


logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════
# CircuitBreaker — sin dependencias nuevas (asyncio.Lock)
# ══════════════════════════════════════════════════════════════════

class CircuitBreaker:
    """Circuit breaker por proveedor (estados estándar).

    CLOSED  → normal; cuenta fallos en ventana deslizante.
    OPEN    → rechaza llamadas sin tocar la red; media recovery.
    HALF_OPEN → deja pasar 1 prueba; éxito → CLOSED, fallo → OPEN.
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        name: str = "claude",
        failure_threshold: int = 5,
        window_seconds: float = 60.0,
        recovery_seconds: float = 30.0,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.window_seconds = window_seconds
        self.recovery_seconds = recovery_seconds
        self._state = self.CLOSED
        self._failures: list[float] = []
        self._opened_at = 0.0
        self._lock = asyncio.Lock()

    @property
    def state(self) -> str:
        return self._state

    async def allow(self) -> bool:
        """¿Se puede intentar la llamada ahora? (con transición OPEN→HALF)."""
        async with self._lock:
            if self._state == self.OPEN:
                if time.monotonic() - self._opened_at >= self.recovery_seconds:
                    self._state = self.HALF_OPEN
                    return True
                return False
            return True

    async def record_success(self) -> None:
        async with self._lock:
            self._failures.clear()
            if self._state != self.CLOSED:
                logger.info(
                    "CircuitBreaker[%s] HALF_OPEN→CLOSED (probe OK)", self.name
                )
                self._state = self.CLOSED

    async def record_failure(self) -> None:
        async with self._lock:
            now = time.monotonic()
            self._failures = [f for f in self._failures if now - f < self.window_seconds]
            self._failures.append(now)
            if self._state == self.HALF_OPEN or len(self._failures) >= self.failure_threshold:
                self._trip(now)

    def _trip(self, now: float) -> None:
        self._state = self.OPEN
        self._opened_at = now
        logger.warning(
            "CircuitBreaker[%s] → OPEN tras %d fallos en %.0fs; "
            "degradando a fallback por %.0fs",
            self.name,
            len(self._failures),
            self.window_seconds,
            self.recovery_seconds,
        )

    def snapshot(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "state": self._state,
            "failures_in_window": len(self._failures),
            "threshold": self.failure_threshold,
        }


# ══════════════════════════════════════════════════════════════════
# OllamaFallback — settings fantasma se vuelve real
# ══════════════════════════════════════════════════════════════════

class OllamaFallback:
    """Cliente Ollama mínimo: settings ollama_host/ollama_fast_model."""

    def __init__(
        self,
        host: str | None = None,
        model: str | None = None,
        timeout: float = 20.0,
    ) -> None:
        s = get_settings()
        self.host = host or s.ollama_host
        self.model = model or s.ollama_fast_model
        self.timeout = timeout

    async def chat(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 1024
    ) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(f"{self.host}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()
        content = ""
        for part in data.get("message", {}).get("content", "") or "":
            content += part if isinstance(part, str) else str(part)
        return {
            "content": content,
            "usage": {
                "provider": "ollama",
                "model": self.model,
                # Ollama no reporta tokens estilo Anthropic; contorno honesto
                "input_tokens": 0,
                "output_tokens": 0,
            },
        }


# ══════════════════════════════════════════════════════════════════
# TokenUsageLedger — Q-LLM-02 contorno sin DB nueva
# ══════════════════════════════════════════════════════════════════

class TokenUsageLedger:
    """Acumula usage por día de proceso + presupuesto con umbrales.

    Q-LLM-02 completo (persistencia) llega con Q-PER-01 (PostgreSQL);
    este es el contorno que ya hace el accounting visible y alertable.
    """

    def __init__(self, daily_budget: int = 200_000) -> None:
        self.daily_budget = daily_budget
        self._today = ""
        self._tokens = 0
        self._calls = 0
        self._lock = asyncio.Lock()

    async def record(self, usage: dict[str, Any]) -> dict[str, Any] | None:
        """Registra usage; devuelve señal de alerta si cruzó umbral."""
        async with self._lock:
            today = time.strftime("%Y-%m-%d")
            if today != self._today:
                self._today, self._tokens, self._calls = today, 0, 0
            self._tokens += int(usage.get("input_tokens", 0)) + int(
                usage.get("output_tokens", 0)
            )
            self._calls += 1
            pct = self._tokens / self.daily_budget if self.daily_budget else 0.0
            signal = None
            if pct >= 0.95:
                signal = {
                    "level": "critical",
                    "message": f"Presupuesto LLM diario al {pct:.0%}",
                    "tokens_today": self._tokens,
                    "budget": self.daily_budget,
                }
                logger.warning("LLM budget CRITICAL: %s", signal["message"])
            elif pct >= 0.80:
                signal = {
                    "level": "warning",
                    "message": f"Presupuesto LLM diario al {pct:.0%}",
                    "tokens_today": self._tokens,
                    "budget": self.daily_budget,
                }
                logger.warning("LLM budget warning: %s", signal["message"])
            return signal

    def snapshot(self) -> dict[str, Any]:
        return {
            "date": self._today or time.strftime("%Y-%m-%d"),
            "tokens": self._tokens,
            "calls": self._calls,
            "budget": self.daily_budget,
        }


# ══════════════════════════════════════════════════════════════════
# ResilientClaudeService — la subclase que orquesta todo
# ══════════════════════════════════════════════════════════════════

RETRYABLE_HTTP = {408, 429, 500, 502, 503, 504}
NON_RETRYABLE = ("authentication_error", "permission_error", "not_found_error")


class ResilientClaudeService:
    """Orquestación: retry → circuit breaker → fallback Ollama → ledger.

    Se compone CON ClaudeService (no hereda): los consumidores siguen
    usando ClaudeService; el bootstrap lo envuelve con esta clase proxy
    que comparte los mismos métodos públicos.
    """

    def __init__(
        self,
        inner: Any,  # ClaudeService — Any: evita import circular
        *,
        max_attempts: int = 3,
        timeout_seconds: float = 45.0,
        backoff_base: float = 0.8,
        backoff_cap: float = 8.0,
        breaker: CircuitBreaker | None = None,
        fallback: OllamaFallback | None = None,
        ledger: TokenUsageLedger | None = None,
        use_fallback: bool = True,
    ) -> None:
        self.inner = inner
        self.max_attempts = max_attempts
        self.timeout_seconds = timeout_seconds
        self.backoff_base = backoff_base
        self.backoff_cap = backoff_cap
        self.breaker = breaker or CircuitBreaker()
        self.fallback = fallback
        self.ledger = ledger or TokenUsageLedger()
        self.use_fallback = use_fallback

    # ── transporte ──────────────────────────────────────────────

    async def _attempt(
        self,
        system_prompt: str,
        user_prompt: str | None,
        max_tokens: int,
        history: list[dict[str, Any]] | None,
    ) -> Any:
        """Una llamada física al SDK con timeout propio."""
        msgs: list[dict[str, Any]] = list(history) if history else []
        if user_prompt is not None:
            msgs.append({"role": "user", "content": user_prompt})
        coro = self.inner.client.messages.create(
            model=self.inner.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=msgs,
        )
        return await asyncio.wait_for(coro, timeout=self.timeout_seconds)

    @staticmethod
    def _is_retryable(exc: Exception) -> bool:
        code = getattr(exc, "status_code", None)
        if code is not None:
            return code in RETRYABLE_HTTP
        name = type(exc).__name__.lower()
        if any(n in name for n in ("timeout", "overloaded", "connection", "rate_limit")):
            return True
        authish = "auth" in name or any(n in str(exc).lower() for n in NON_RETRYABLE)
        return not authish

    async def _acall(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """1 llamada lógica = hasta max_attempts intentos + fallback."""
        last_exc: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            if not await self.breaker.allow():
                break
            try:
                response = await self._attempt(
                    system_prompt, user_prompt, max_tokens, history
                )
                await self.breaker.record_success()
                content = response.content[0].text if response.content else ""
                usage = {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
                budget = await self.ledger.record(usage)
                out = {"content": content, "usage": usage}
                if budget:
                    out["budget_alert"] = budget
                return out
            except Exception as exc:
                last_exc = exc
                await self.breaker.record_failure()
                retryable = self._is_retryable(exc)
                logger.warning(
                    "Claude intento %d/%d falló (%s: %s) retryable=%s",
                    attempt,
                    self.max_attempts,
                    type(exc).__name__,
                    exc,
                    retryable,
                )
                if not retryable or attempt == self.max_attempts:
                    break
                # backoff exponencial + jitter completo
                delay = min(
                    self.backoff_cap,
                    self.backoff_base * (2 ** (attempt - 1)),
                )
                delay *= random.uniform(0.5, 1.5)
                await asyncio.sleep(delay)

        # agotados intentos o circuito abierto → fallback Ollama
        if self.use_fallback and self.fallback is not None:
            try:
                fb = await self.fallback.chat(
                    system_prompt, user_prompt or "", max_tokens
                )
                fb["degraded"] = True
                fb["provider_error"] = str(last_exc) if last_exc else "circuit_open"
                logger.warning(
                    "LLM degradado a Ollama (%s) tras fallos Claude",
                    fb.get("provider_error", "")[:120],
                )
                return fb
            except Exception as ollama_exc:
                logger.error("Fallback Ollama también falló: %s", ollama_exc)

        return {
            "content": "",
            "usage": {"input_tokens": 0, "output_tokens": 0},
            "error": str(last_exc) if last_exc else "circuit_open_no_fallback",
        }

    # ── API pública — MISMA forma que ClaudeService ─────────────

    async def chat(
        self,
        user_message: str,
        user_role: str = "socio",
        user_name: str = "",
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        context = (
            f"{self.inner.system_prompt}\n\n"
            f"Usuario actual: {user_name} (rol: {user_role}). "
            f"Ajusta el nivel de detalle según el rol."
        )
        result = await self._acall(
            context, user_message, 2048, history
        )
        if result.get("error"):
            return {
                "content": (
                    "Lo siento, hubo un error procesando tu solicitud. "
                    "Por favor intenta de nuevo."
                ),
                "stop_reason": "error",
                "usage": result["usage"],
                "error": result["error"],
            }
        return {
            "content": result["content"],
            "stop_reason": "ok",
            "usage": result["usage"],
        }

    async def generate(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 2048
    ) -> dict[str, Any]:
        return await self._acall(system_prompt, user_prompt, max_tokens)

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
        fallback: Any = None,
    ) -> dict[str, Any]:
        result = await self._acall(system_prompt, user_prompt, max_tokens)
        if result.get("error"):
            return fallback if fallback is not None else {"error": result["error"]}
        content = result["content"]
        if not content.strip():
            return fallback if fallback is not None else {"error": "Empty response"}
        try:
            parsed: dict[str, Any] = json.loads(content)
            return parsed
        except json.JSONDecodeError:
            pass
        for fence in ("```json", "```"):
            if fence in content:
                try:
                    parsed = json.loads(content.split(fence)[1].split("```")[0].strip())
                    return parsed
                except (IndexError, json.JSONDecodeError):
                    pass
        return fallback if fallback is not None else {"raw_content": content}

    # delegación simple de los métodos específicos (usan generate/generate_json
    # internamente ya refactorizados en ClaudeService base — ver bootstrap)
    def __getattr__(self, item: str) -> Any:
        return getattr(self.inner, item)

    # mypy: delegación devuelve Any deliberadamente (proxy dinámico)


# ══════════════════════════════════════════════════════════════════
# wiring — bootstrap inyecta el resilient en lugar del plano
# ══════════════════════════════════════════════════════════════════

def build_resilient_claude_service(
    inner: Any, *, use_fallback: bool = True
) -> ResilientClaudeService:
    """Factory usada por bootstrap.py (y tests)."""
    return ResilientClaudeService(
        inner=inner,
        breaker=CircuitBreaker(name="claude"),
        fallback=OllamaFallback() if use_fallback else None,
        ledger=TokenUsageLedger(),
        use_fallback=use_fallback,
    )
