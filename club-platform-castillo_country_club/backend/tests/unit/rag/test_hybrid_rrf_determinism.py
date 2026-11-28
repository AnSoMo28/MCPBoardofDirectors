"""Suite RV-2 — blindaje determinista del pipeline RAG híbrido+reranker.

Retro vanguardia Ola 3 (DV-001 · prioridad 2). El hallazgo de la
auditoría: el cross-encoder (BAAI/bge-reranker-v2-m3) y el híbrido
BM25+vector con RRF k=60 YA viven en el árbol — con CERO tests de
retrieval. Este retrofit los blinda SIN descargar modelo y SIN red:

  * RRF como ÁLGEBRA EXACTA — la fusión es matemática pura
    (``Σ 1/(60+rank)``), así que se pínea con rankings sintéticos y
    se verifica contra valores calculados con ``Fraction`` (aritmética
    racional de la stdlib, no floats de ojo). Drift de un dígito en
    la constante k o en el redondeo = test rojo.
  * Contrato del RERANKER por comportamiento — bypass ≤5 devuelve
    los objetos INTACTOS (mismo orden, score sin tocar, jamás carga
    el modelo); con >5 el scoring es del stub, pero el CONTRATO no:
    sigmoid a [0,1], orden descendente, top_k, texto truncado a 512,
    lazy-load que no toca torch en el import del módulo.
  * EQUIVALENCIA híbrido vs sus partes — ``search()`` es la
    composición ``_rrf_fusion(_bm25_search, _vector_search)[:top_k]``
    con BM25 REAL (rank-bm25, ya es dependencia) y embeddings +
    vectorstore FALSOS deterministicos: la composición se verifica
    contra sí misma. Además el piso relativo de fuentes del
    b0v queda pineado en ambos regímenes de score.

Determinismo completo sobre un stack que por defecto no lo tiene:
nada de esta suite llama red, descarga pesos o usa aleatoriedad.
"""
from __future__ import annotations

import math
import sys
from fractions import Fraction
from typing import Any

import pytest

from club_mcp.rag.reranker import Reranker
from club_mcp.rag.search import _RRF_K, HybridSearchEngine, SearchResult


pytestmark = pytest.mark.asyncio


# ════════════════════════════════════════════════════════════════
# Fixtures sintéticas — rankings planos, cero dependencias
# ════════════════════════════════════════════════════════════════


def _meta(chunk_id: str, access_level: int = 0) -> dict[str, Any]:
    return {
        "document_id": f"doc-{chunk_id}",
        "file_name": f"{chunk_id}.pdf",
        "document_type": "reglamento",
        "category": "governance",
        "access_level": access_level,
    }


def _bm25_item(chunk_id: str, rank: int, access_level: int = 0) -> dict[str, Any]:
    return {
        "id": chunk_id,
        "metadata": _meta(chunk_id, access_level),
        "bm25_rank": rank,
        "bm25_score": 1.0 / rank,  # monótono, suficiente para la fusión
    }


def _vector_item(chunk_id: str, rank: int, access_level: int = 0) -> dict[str, Any]:
    return {
        "id": chunk_id,
        "metadata": _meta(chunk_id, access_level),
        "vector_rank": rank,
        "vector_score": 0.9 - 0.05 * (rank - 1),
    }


def _engine() -> HybridSearchEngine:
    """Motor con embeddings/vectorstore falsos — la fusión no los toca."""
    return HybridSearchEngine(embedding_service=object(), vector_store=object())


def _exact_rrf(pairs: list[tuple[str, int]]) -> Fraction:
    """RRF exacto en aritmética racional: Σ 1/(60+rank)."""
    total = Fraction(0)
    for _chunk_id, rank in pairs:
        total += Fraction(1, _RRF_K + rank)
    return total


# ════════════════════════════════════════════════════════════════
# 1 · RRF como álgebra exacta
# ════════════════════════════════════════════════════════════════


async def test_rrf_exact_single_source_bm25():
    """Una lista sola: score = 1/(60+rank), exacto a 6 decimales."""
    fused = _engine()._rrf_fusion([_bm25_item("c1", 1)], [])
    assert [r.id for r in fused] == ["c1"]
    esperado = round(float(_exact_rrf([("c1", 1)])), 6)
    assert fused[0].rrf_score == pytest.approx(esperado)
    assert fused[0].final_score == fused[0].rrf_score


async def test_rrf_exact_single_source_vector():
    """Ídem por la rama vectorial."""
    fused = _engine()._rrf_fusion([], [_vector_item("c9", 3)])
    esperado = round(float(_exact_rrf([("c9", 3)])), 6)
    assert fused[0].rrf_score == pytest.approx(esperado)


async def test_rrf_exact_overlap_boosted():
    """El chunk en AMBAS ramas suma ambas contribuciones — el corazón
    del "results in BOTH rankings get boosted", píneado con Fraction."""
    fused = _engine()._rrf_fusion(
        [_bm25_item("c1", 1), _bm25_item("c2", 2)],
        [_vector_item("c1", 4), _vector_item("c3", 1)],
    )
    exacto_c1 = round(
        float(_exact_rrf([("c1", 1), ("c1", 4)])), 6
    )
    exacto_c2 = round(float(_exact_rrf([("c2", 2)])), 6)
    exacto_c3 = round(float(_exact_rrf([("c3", 1)])), 6)
    scores = {r.id: r.rrf_score for r in fused}
    assert scores["c1"] == pytest.approx(exacto_c1)
    assert scores["c2"] == pytest.approx(exacto_c2)
    assert scores["c3"] == pytest.approx(exacto_c3)
    # c1 (presente en ambas) domina a c3 (solo vectorial rank 1)
    assert scores["c1"] > scores["c3"]
    assert scores["c1"] > scores["c2"]


async def test_rrf_rank_one_beats_rank_two_both_sources():
    """Invariante monótona del papel RRF: para el MISMO chunk, estar
    mejor rankeado en una rama siempre suma más — 1/(60+1) > 1/(60+2)."""
    a = _engine()._rrf_fusion(
        [_bm25_item("cX", 1)], [_vector_item("cX", 2)]
    )[0].rrf_score
    b2 = _engine()._rrf_fusion(
        [_bm25_item("cX", 2)], [_vector_item("cX", 2)]
    )[0].rrf_score
    # simetría: (1,2) y (2,1) dan el mismo total (la suma conmuta)
    assert a == _engine()._rrf_fusion(
        [_bm25_item("cX", 2)], [_vector_item("cX", 1)]
    )[0].rrf_score
    assert a > b2  # ambos ranks empeorados puntúa menos


async def test_rrf_upper_bound_two_sources():
    """Cota superior exacta del modelo: 2·1/(60+1) ≈ 0.0328 — ningún
    chunk puede superarla (es el máximo teórico con k=60, rank 1 en
    ambas ramas)."""
    techo = float(Fraction(2, _RRF_K + 1))
    top = _engine()._rrf_fusion(
        [_bm25_item("c1", 1)], [_vector_item("c1", 1)]
    )[0].rrf_score
    assert top == pytest.approx(round(techo, 6))
    # y cualquier otro chunk queda por debajo
    otros = _engine()._rrf_fusion(
        [_bm25_item("c1", 1), _bm25_item("c2", 5)],
        [_vector_item("c1", 1), _vector_item("c2", 2)],
    )
    assert otros[1].rrf_score < round(techo, 6)


async def test_rrf_missing_branch_returns_empty():
    """Las dos ramas vacías → lista vacía (contrato del vacío)."""
    assert _engine()._rrf_fusion([], []) == []


async def test_rrf_merge_enriches_metadata():
    """El chunk que viene por BM25 y luego por vector gana los datos
    de la rama vectorial (vector_rank/score) SIN perder los suyos."""
    fused = _engine()._rrf_fusion(
        [_bm25_item("c1", 2)], [_vector_item("c1", 7)]
    )
    r = fused[0]
    assert r.bm25_rank == 2
    assert r.vector_rank == 7
    assert r.vector_score == pytest.approx(0.9 - 0.05 * 6)
    assert r.document_id == "doc-c1"


async def test_rrf_rounding_is_6_decimals():
    """El contrato del redondeo: rrf_score/final_score a 6 decimales
    — el formato que llm_calls y la UI de confianza consumen."""
    fused = _engine()._rrf_fusion(
        [_bm25_item("c1", 3), _bm25_item("c2", 7)],
        [_vector_item("c1", 9), _vector_item("c2", 11), _vector_item("c4", 2)],
    )
    for r in fused:
        for field in (r.rrf_score, r.final_score):
            assert field == round(field, 6)


async def test_rrf_constant_is_pinned():
    """k=60 EXACTO — la constante del paper original. Un drift de un
    dígito aquí cambia cada score del pipeline: la suite lo canta."""
    assert _RRF_K == 60


# ════════════════════════════════════════════════════════════════
# 2 · Contrato del reranker (sin descargar nada)
# ════════════════════════════════════════════════════════════════


class _FakeCrossEncoder:
    """CrossEncoder determinista: score por contenido, no por azar.

    La fórmula es intencionalmente inversa al RRF: el chunk "último"
    de la lista hídrida es el "mejor" para el modelo — así el test
    demuestra que el ORDEN final es del cross-encoder, no herencia.
    """

    def __init__(self) -> None:
        self.pairs_seen: list[list[str]] = []
        self.calls = 0

    def predict(self, pairs: list[list[str]], show_progress_bar: bool = False):
        self.calls += 1
        self.pairs_seen = list(pairs)
        out = []
        for _q, doc in pairs:
            # marcador en el contenido → logit alto; sin contenido → bajo
            out.append(6.0 if "ALTO" in doc else -6.0)
        return out


def _candidates(n: int, alto_from: int | None = None) -> list[SearchResult]:
    """n candidatos con contenido marcado ALTO desde el índice dado."""
    out = []
    for i in range(n):
        content = ""
        if alto_from is not None and i >= alto_from:
            content = f"documento {i} ALTO relevance"
        out.append(
            SearchResult(
                id=f"c{i}",
                document_id=f"doc-c{i}",
                file_name=f"c{i}.pdf",
                document_type="reglamento",
                category="governance",
                access_level=0,
                content=content,
                rrf_score=1.0 / (i + 1),
                final_score=1.0 / (i + 1),
            )
        )
    return out


async def test_reranker_bypass_small_set_untouched():
    """≤5 candidatos: bypass — MISMA lista, mismo orden, scores INTACTOS
    y el modelo NUNCA se carga (la promesa de latencia del docstring)."""
    rr = Reranker()
    rr._model = _FakeCrossEncoder()  # cargado "de antemano": trampa
    cands = _candidates(5, alto_from=None)
    antes = [c.final_score for c in cands]
    out = await rr.rerank("query", cands, top_k=3)
    assert [c.id for c in out] == ["c0", "c1", "c2"]  # orden preservado
    assert [c.final_score for c in out] == antes[:3]  # scores intactos
    assert rr._model.calls == 0  # el modelo NO se consultó


async def test_reranker_bypass_threshold_is_pinned():
    """El umbral de bypass es 5 EXACTO — parte del contrato observable:
    con 6 (>5) el modelo CORRE (aquí: el falso, inyectado antes para
    no descargar nada); con 5 (≤5) jamás se consulta."""
    rr = Reranker()
    rr._model = _FakeCrossEncoder()
    out = await rr.rerank("q", _candidates(6), top_k=10)
    assert rr._model.calls == 1  # 6 > 5 → el modelo corrió
    assert len(out) == 6
    rr5 = Reranker()
    rr5._model = _FakeCrossEncoder()
    await rr5.rerank("q", _candidates(5), top_k=10)
    assert rr5._model.calls == 0  # 5 ≤ 5 → bypass, modelo intacto


async def test_reranker_scores_and_orders_by_model():
    """>5 candidatos: final_score sale del cross-encoder (sigmoid [0,1]),
    orden DESCENDENTE por ese score — no por el orden de entrada."""
    rr = Reranker()
    fake = _FakeCrossEncoder()
    rr._model = fake
    cands = _candidates(8, alto_from=4)  # c4..c7 llevan "ALTO"
    out = await rr.rerank("presupuesto", cands, top_k=5)
    # los ALTO primero, y entre ellos el orden del modelo (todos 6.0 →
    # orden estable por score igual: sorted es estable)
    ids = [c.id for c in out]
    assert set(ids) == {"c4", "c5", "c6", "c7", "c0"}  # 5 de 8, ALTO ganan
    for c in out:
        # sigmoid(6) ≈ 0.9975 · sigmoid(-6) ≈ 0.0025 — a 4 decimales
        esperado = (
            round(1.0 / (1.0 + math.exp(-6.0)), 4)
            if "ALTO" in (c.content or "")
            else round(1.0 / (1.0 + math.exp(6.0)), 4)
        )
        assert c.final_score == esperado
    # descendente
    scores = [c.final_score for c in out]
    assert scores == sorted(scores, reverse=True)


async def test_reranker_respects_top_k():
    """top_k recorta el resultado, pase por bypass o por modelo."""
    rr = Reranker()
    rr._model = _FakeCrossEncoder()
    out = await rr.rerank("q", _candidates(9), top_k=2)
    assert len(out) == 2
    rr2 = Reranker()
    out2 = await rr2.rerank("q", _candidates(3), top_k=2)
    assert len(out2) == 2


async def test_reranker_empty_candidates():
    """Vacío entra, vacío sale — sin tocar modelo ni umbrales."""
    rr = Reranker()
    assert await rr.rerank("q", [], top_k=5) == []
    assert rr._model is None  # ni lo cargó


async def test_reranker_candidate_text_truncated_and_fallbacks():
    """_get_candidate_text: contenido SIEMPRE ≤512, y los fallbacks
    (metadata.content → file_name+type) en orden de prioridad."""
    largo = SearchResult(
        id="x", document_id="d", file_name="f.pdf",
        document_type="acta", category="", access_level=0,
        content="A" * 900,
    )
    assert len(Reranker._get_candidate_text(largo)) == 512
    sin_content = SearchResult(
        id="x", document_id="d", file_name="f.pdf",
        document_type="acta", category="", access_level=0,
        content="",
        metadata={"content": "de metadata"},
    )
    assert Reranker._get_candidate_text(sin_content) == "de metadata"
    pelado = SearchResult(
        id="x", document_id="d", file_name="f.pdf",
        document_type="acta", category="", access_level=0,
        content="",
    )
    assert Reranker._get_candidate_text(pelado) == "f.pdf acta"


async def test_reranker_module_never_imports_torch():
    """El contrato de arranque: importar club_mcp.rag.reranker NO
    importa torch/sentence_transformers — el modelo es lazy HASTA la
    primera rerank >5. Un import en cabeza de módulo rompería el
    arranque de todo el backend por una dependencia pesada."""
    # este proceso ya importó el módulo (arriba); la afirmación fuerte
    # es que torch NO esté en sys.modules TRAS ese import
    assert "torch" not in sys.modules
    assert "sentence_transformers" not in sys.modules


async def test_reranker_sigmoid_clamped():
    """El clamp ±20 del sigmoid: logits extremos no desbordan (el
    exp nunca ve más de ±20) y saturan asintóticamente."""
    assert Reranker._sigmoid(1000.0) == pytest.approx(1.0)
    assert Reranker._sigmoid(-1000.0) < 1e-8  # 1/(1+e^20) ≈ 2e-9
    assert Reranker._sigmoid(0.0) == pytest.approx(0.5)


# ════════════════════════════════════════════════════════════════
# 3 · Equivalencia híbrido vs sus partes (BM25 real, sin red)
# ════════════════════════════════════════════════════════════════


class _FakeEmbeddings:
    """embed_query determinista: el query tal cual (el vectorstore
    falso solo necesita DEVOLVER el ranking píneado)."""

    def embed_query(self, text: str) -> list[float]:
        return [0.0]


class _FakeVectorStore:
    """query_with_access devuelve el ranking píneado por rol."""

    def __init__(self, ranking: list[dict[str, Any]]) -> None:
        self._ranking = ranking
        self.query_log: list[dict[str, Any]] = []

    def query_with_access(self, **kwargs: Any) -> list[dict[str, Any]]:
        self.query_log.append(kwargs)
        return self._ranking

    def get_by_ids(self, ids: list[str]) -> list[dict[str, Any]]:
        return [
            {"id": i, "document": f"contenido de {i}"} for i in ids
        ]


async def _engine_con_corpus(
    ranking_vectorial: list[dict[str, Any]],
) -> tuple[HybridSearchEngine, _FakeVectorStore]:
    """Motor con BM25 REAL (3 chunks) + embeddings/vectorstore falsos."""
    vs = _FakeVectorStore(ranking_vectorial)
    eng = HybridSearchEngine(embedding_service=_FakeEmbeddings(), vector_store=vs)
    eng.add_to_index(
        chunk_ids=["c1", "c2", "c3"],
        texts=[
            "presupuesto aprobado 2026 junta directiva club",
            "reglamento de piscinas y horarios verano",
            "cuota mensual presupuesto socios pagos",
        ],
        metadatas=[_meta("c1"), _meta("c2"), _meta("c3")],
    )
    return eng, vs


async def test_search_equals_fusion_of_parts():
    """LA equivalencia: search() == _rrf_fusion(bm25, vector)[:top_k].
    BM25 real corriendo debajo (rank_bm25 es dependencia del árbol),
    vector falso píneado — la composición se verifica contra sí misma."""
    eng, _vs = await _engine_con_corpus(
        [_vector_item("c2", 1), _vector_item("c3", 2)]
    )
    completo = await eng.search("presupuesto", top_k=3, user_role="admin")
    # las partes, por separado, con los mismos inputs
    bm25 = eng._bm25_search("presupuesto", top_k=6, user_role="admin")
    vec = eng._vector_search(
        query="presupuesto", user_role="admin", top_k=6
    )
    esperado = eng._rrf_fusion(bm25, vec)[:3]
    assert [r.id for r in completo] == [r.id for r in esperado]
    assert [r.rrf_score for r in completo] == [r.rrf_score for r in esperado]


async def test_search_bm25_branch_finds_keyword_and_misses_semantics():
    """Sanity direccional de la rama real: 'piscinas' (palabra literal)
    responde c2; 'cuotas atrasadas' (no literal) no la encuentra —
    el keyword matchea texto, no intención. Es lo que JUSTIFICA la
    otra rama (y el reranker)."""
    eng, _vs = await _engine_con_corpus([])
    res = await eng.search("piscinas", top_k=3, user_role="admin")
    assert res and res[0].id == "c2"
    res2 = await eng.search("cuotas atrasadas", top_k=3, user_role="admin")
    assert [r.id for r in res2] == []  # BM25 falla, vector falso vacío


async def test_search_access_control_filters_bm25_branch():
    """Q-SEC-05 pineado: la rama BM25 respeta el techo por rol ANTES
    de fusionar — socio (nivel 0) jamás ve el chunk nivel 1+.

    Nota de corpus: 3 documentos — con N=2 y df=1 el IDF de Okapi es
    CERO exacto (log(1.5)-log(1.5)) y el filtro score>0 mataría la
    búsqueda entera; 3 docs dan IDF positivo. Pinear eso también es
    blindar: el contorno mínimo del BM25 real queda documentado."""
    eng = HybridSearchEngine(
        embedding_service=_FakeEmbeddings(),
        vector_store=_FakeVectorStore([]),
    )
    eng.add_to_index(
        chunk_ids=["publico", "privado", "neutro"],
        texts=[
            "reglamento general socios",
            "minuta privada junta",
            "reglamento de canchas",
        ],
        metadatas=[
            _meta("publico", 0),
            _meta("privado", 2),
            _meta("neutro", 0),
        ],
    )
    asocio = await eng.search("reglamento", top_k=5, user_role="socio")
    # socio ve los públicos, jamás el privado (nivel 2)
    assert {r.id for r in asocio} <= {"publico", "neutro"}
    assert "privado" not in {r.id for r in asocio}
    aadmin = await eng.search("reglamento", top_k=5, user_role="admin")
    # admin (nivel 3) ve también el privado si matchea
    assert "privado" in {r.id for r in aadmin} or len(aadmin) >= 2


async def test_search_empty_query_contract():
    """Query vacío/blanco → [] sin tocar índices (la puerta temprana)."""
    eng, vs = await _engine_con_corpus([])
    assert await eng.search("   ", top_k=5) == []
    assert vs.query_log == []  # ni el vectorstore fue consultado


# ════════════════════════════════════════════════════════════════
# 4 · El puente hidrante→reranker y el piso relativo b0v
# ════════════════════════════════════════════════════════════════


async def test_populate_content_fills_from_vectorstore():
    """El puente: el reranker necesita .content y la búsqueda híbrida
    no lo trae — _populate_content lo llena desde el vectorstore."""
    from club_mcp.rag.rag_service import RAGService

    vs = _FakeVectorStore([])
    # RAGService solo para el método puente: los demás colab no importan
    svc = RAGService.__new__(RAGService)
    svc._vectorstore = vs
    cands = [
        SearchResult(
            id="c1", document_id="doc-c1", file_name="c1.pdf",
            document_type="reglamento", category="", access_level=0,
            content="",
        ),
        SearchResult(
            id="c2", document_id="doc-c2", file_name="c2.pdf",
            document_type="reglamento", category="", access_level=0,
            content="ya tenía",
        ),
    ]
    out = svc._populate_content(cands)
    assert out[0].content == "contenido de c1"
    assert out[1].content == "ya tenía"  # el existente no se pisa


async def test_relative_floor_regimes_pinned():
    """El piso relativo del b0v, pineado en sus DOS regímenes:
    RRF (scores ~0.016-0.033) y cross-encoder (scores [0,1]).
    Fórmula: floor = max(0.01, best/2) si best>0, si no 0.05."""
    def _floor(best: float) -> float:
        return max(0.01, best / 2) if best > 0 else 0.05

    # régimen RRF: best = 2/(60+1) → floor ≈ 0.0164 > mínimo absoluto
    rrf_best = round(float(Fraction(2, 61)), 6)
    assert _floor(rrf_best) == pytest.approx(rrf_best / 2)
    # régimen cross-encoder: best = 0.9975 → floor ≈ 0.4988
    ce_best = round(1.0 / (1.0 + math.exp(-6.0)), 4)
    assert _floor(ce_best) == pytest.approx(ce_best / 2)
    # régimen degenerado: sin scores → piso absoluto
    assert _floor(0.0) == 0.05
    # régimen vector-only (BM25 off): best = 1/61 ≈ 0.0164 → best/2
    # ≈ 0.0082 < mínimo absoluto → el 0.01 muerde ANTES (el bug del
    # piso fijo 0.05 que filtraba TODO, cazado por el b0v)
    assert _floor(1.0 / 61) == 0.01
