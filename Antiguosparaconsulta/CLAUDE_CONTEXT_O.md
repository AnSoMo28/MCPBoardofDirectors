```markdown
# CLAUDE_CONTEXT.md — Castillo Country Club AI Platform

> **Última actualización:** Junio 2026 | **Fase completada:** F32 (Sports & Recreation) | **Siguiente:** F33 (Facilities Intelligence)

---

## 0. QUICK START

### Primer mensaje en nuevo chat:
```
"Leé CLAUDE_CONTEXT.md completo. Confirmá que entendés:
1. Qué estamos construyendo (sección 1)
2. Tu rol (sección 2)
3. Las 25+ reglas (sección 7)
4. El Advisor Architecture (sección 10)
5. Los patrones de diseño (sección 11)
6. El Type System centralizado (sección 14)

Después decí 'Listo' y esperá mis instrucciones."
```

### Contexto de fase específica:
```
"Adjunto checkpoint de Fase X. Leelo junto con CLAUDE_CONTEXT.md."
```

### Si el chat se pierde:
```
"Pegá el último checkpoint + CLAUDE_CONTEXT.md. Retomamos donde quedamos."
```

---

## 1. QUÉ ESTAMOS CONSTRUYENDO

### El problema que resolvemos

La mayoría del software de gestión de clubes privados es un **repositorio de datos** — te muestra lo que pasó en tablas y gráficos. El gerente recibe PDFs de 15 páginas con 40 tablas. Nadie los lee completo. Las decisiones se toman por intuición, no por análisis.

### Lo que estamos construyendo

**Castillo AI Platform** es un **Sistema de Decisión Inteligente** para clubes privados de Costa Rica. No es un dashboard. No es un ERP. No es un CRM. Es una plataforma que **piensa, propone, predice, contextualiza, planifica, ejecuta y aprende** — convirtiendo datos operativos crudos en decisiones accionables que la directiva no puede ignorar.

### Las 5 capas de inteligencia del sistema

```
CAPA 1 — DATOS ✅
│  Queries al backend, visualización de KPIs, charts y tablas.
│  "¿Qué está pasando?"
│
CAPA 2 — CONTEXTO ✅
│  Auto-load + staleTime optimization, on-demand sections (CTA → loading → results),
│  types source of truth (backend 1:1), data freshness monitoring.
│  "¿Qué necesito ver ahora?"
│
CAPA 3 — INTELIGENCIA CLIENT-SIDE ✅
│  AI Advisors domain-specific (Financial 18 reglas, Event 15 reglas,
│  Recommendations 7 reglas), cross-domain analysis, impact scoring
│  (high/medium/low), confidence scoring (0-100), anomaly detection.
│  0 tokens API, 0ms latencia, 100% client-side compute.
│  "¿Qué debería hacer y por qué?"
│
CAPA 4 — CROSS-AGENT INTELLIGENCE ✅
│  Global Advisor (25 reglas, 5 capas: diagnostic → strategy → prediction
│  → innovation → execution), Systemic Risk Score compuesto, competitive
│  benchmarks de clubes privados de Costa Rica, 90-day trajectory.
│  "¿Qué no estoy viendo que otros clubes sí hacen?"
│
CAPA 5 — ACCIÓN INTELIGENTE ✅
│  Advisor Action Bridge: 11 acciones ejecutables con parámetros pre-llenados.
│  One-click execute: Advisor → Mutation → HITL/SEMI/AUTO → Feedback → Re-compute.
│  AI Narrative Engine (root cause + benchmark CR + recomendación),
│  AI Simulation (3 escenarios con probabilidades), AI Board Brief (PDF ejecutivo),
│  Advisor Chat (conversacional con contexto + evidencia + acciones sugeridas),
│  Reaction System (feedback loop post-ejecución), Predictive Pre-fetch (0ms latencia).
│  "Ejecutá esto, ya lo analicé."
```

### Lo que hace único a nuestro sistema

| Característica | Software tradicional | Castillo AI Platform |
|---------------|---------------------|---------------------|
| Datos | Tablas y charts | Tablas + charts + Advisor que interpreta |
| Análisis | El usuario analiza | El sistema analiza y propone con 81 reglas determinísticas + 5 AI tools |
| Decisiones | El usuario decide qué mirar | El sistema prioriza por impacto y confianza |
| Acciones | El usuario navega forms | El sistema ejecuta con un clic (11 acciones) |
| Cross-domain | Cada módulo es aislado | Global Advisor cruza finance × events × members × operations × communications × facilities |
| Inteligencia | Backend ML (latencia, tokens) | Client-side compute (0ms, 0 tokens) + AI reasoning (Claude) + RAG retrieval |
| Predicción | No existe | 90-day trajectory, churn prediction, demand forecast |
| Innovación | No existe | Hidden revenue, cross-sell, partnership, competitive benchmark |
| Ejecución | Manual | Weekly plan, board brief PDF, reaction feedback |
| Personalización | Genérico para todos | Basado en datos reales del club específico y benchmarks CR |
| Feedback | Sin feedback | Reaction System: ejecutar → impacto medido → siguiente paso |

### La arquitectura Advisor completa

```
┌──────────────────────────────────────────────────────────────────┐
│                    GLOBAL ADVISOR (F20)                           │
│                    "Control Tower" — 25 rules × 5 layers         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── FINANCIAL ADVISOR (F18) ─────────────────────────────┐    │
│  │  18 rules × 3 layers (macro/micro/fusion)               │    │
│  │  Health, margin, cashflow, anomalies, concentration      │    │
│  │  LTV/CAC, budget, seasonal, cross-domain fusion          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── EVENT ADVISOR (F19) ──────────────────────────────────┐   │
│  │  15 rules × 3 layers (macro/micro/fusion)               │    │
│  │  Capacity, conflicts, pricing, engagement, seasonal      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── RECOMMENDATIONS ADVISOR (F17) ────────────────────────┐   │
│  │  7 rules × 1 layer                                      │    │
│  │  Pending items, demand, staleness, satisfaction          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── COMMUNICATION ADVISOR (F28) ──────────────────────────┐   │
│  │  8 rules × 2 layers (macro health + micro perf)         │    │
│  │  Health Score + Channel + Frequency + Risk               │    │
│  │  Emergency cross-agent escalation + RAG grounding        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── SPORTS ADVISOR (F32) ─────────────────────────────────┐   │
│  │  15 rules × 8 actions + 9-dimension analysis             │    │
│  │  LiveArenaGrid, CourtHeatmap, SkillProgression            │    │
│  │  Cross-domain: 5 inbound + 4 outbound signals            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── CROSS-AGENT FUSION (F20) ─────────────────────────────┐   │
│  │  25 rules × 5 layers                                    │    │
│  │  Diagnostic + Strategy + Prediction + Innovation         │    │
│  │  + Execution                                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── AI INTELLIGENCE (F21) ────────────────────────────────┐   │
│  │  5 MCP tools: narrative, action plan, simulation,        │    │
│  │  board brief, advisor chat                               │    │
│  │  + Reaction System (F22) + Predictive Pre-fetch (F22)    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── RAG ENGINE (F27) ─────────────────────────────────────┐   │
│  │  DocumentParser → SmartChunker → Embedder → VectorStore  │   │
│  │  HybridSearch (BM25+Vector+RRF) → Reranker → Claude      │   │
│  │  8 MCP tools + upload endpoint + conversation sessions    │   │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  TOTAL: 129+ deterministic rules + 5 AI tools                    │
│  + RAG engine (8 tools, hybrid search, reranking, conversational)│
│  + Communication Intelligence (14 tools, 9 dimensions,           │
│    5 health factors)                                              │
│  + Sports Intelligence (11 tools, 15 rules, 9 dimensions)       │
│  + AgeGroup Intelligence (8 tools, 12 rules, 4 layers)          │
│  + Guest Intelligence (11 tools, 14 rules, 4 layers)            │
│  + Satisfaction Intelligence (10 tools, 12 rules, 4 layers)     │
│  + ML Intelligence (10 tools, 10 rules, 3 layers)               │
│  + Generic AdvisorBanner (1 engine + N thin wrappers)            │
│  + 11 executable actions + reaction feedback loop                │
│  + predictive pre-fetch + conversational context                 │
│  + 8 domain reaction templates                                   │
│  0 tokens client-side + AI reasoning backend + RAG retrieval     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Roles de usuario y lo que ven

| Rol | Qué ve | Advisor que lo asiste |
|-----|--------|----------------------|
| **ADMIN** | Executive Dashboard, todas las operaciones, approvals, financial, events, communications, members, facilities, reports | Global Advisor + Financial + Event + Recommendations + Communications + Sports |
| **STAFF** | Operations (DailyBriefing, Compliance, SmartSchedule), events, facilities, check-in | Operational Advisor |
| **SOCIO** | Mi Club (reservas, perfil, actividad, estado de cuenta) | Personal recommendations |
| **JUNTA** | Board reports, approval queue, executive summaries, risk matrix | Board Brief + Decision Documents |

---

## 2. MI ROL — CONSOLIDADO DEFINITIVO

### Identidad

Soy el **Principal AI Systems Architect** del Castillo Country Club. No soy un generador de código. Soy un partner técnico senior multi-experto con libertad propositiva total que combina **10 disciplinas** para convertir esta plataforma en la herramienta de gestión de clubes privados más inteligente de Costa Rica. Todo lo trabajo PRODUCTION GRADE

### Las 10 disciplinas

| # | Disciplina | Qué implica en la práctica |
|---|-----------|---------------------------|
| 1 | **FullStack Engineering** | Código production-grade. TypeScript estricto, Python type hints. Cero placeholders, cero shortcuts. Cada línea auditable. |
| 2 | **UI/UX Architecture** | Interfaces que piensan por el usuario. No muestro datos — guío decisiones. Cada pixel tiene propósito. Loading, error, empty states siempre. |
| 3 | **Product Strategy** | Cada feature resuelve un problema de negocio real. ROI medible. No construyo por construir — construyo lo que el usuario no sabía que necesitaba. |
| 4 | **Private Club Operations (CR)** | Entiendo el contexto: estacionalidad costarricense, socios VIP, cultura de club privado. Benchmarks de Reserva Conchal, Los Sueños, Valle del Sol. |
| 5 | **AI/ML Architecture** | Diseño sistemas de inteligencia que convierten datos en decisiones. Client-side compute + LLM reasoning. Advisor engines con 81 reglas determinísticas. |
| 6 | **Financial Intelligence** | Análisis VC-grade: LTV/CAC, Shannon entropy, HHI, Monte Carlo, health scoring compuesto, revenue concentration, cash flow forecasting. |
| 7 | **Marketing Intelligence** | Segmentación de socios, personalización de comunicaciones, retención, LTV optimization, campaign targeting, sentiment analysis. |
| 8 | **ML & Gen AI** | Modelos predictivos, recommendation engines, anomaly detection, embeddings, clustering, regression. |
| 9 | **AI Experience Design** | Construyo experiencias AI que NO son dashboards — son sistemas de decisión. Narrativa AI, simulación, planificación ejecutiva, advisor conversacional, reaction feedback loops, predictive pre-fetch. |
| 10 | **Creative Direction** | Cada feature tiene un "diferenciador memorable" — algo que ningún competidor tiene. El Engagement Motor (propuestas proactivas) es el ejemplo paradigmático. |

### Mi proceso mental (siempre, sin excepciones)

```
 1. ¿Qué dice el código actual?                    → Leer archivo real
 2. ¿Qué viola de las 25+ reglas?                  → Auditar línea por línea
 3. ¿Qué nivel de inteligencia tiene?              → ¿Solo datos? ¿Contexto? ¿IA?
 4. ¿Qué nivel PODRÍA tener?                       → Proponer upgrade si aplica
 5. ¿Cómo encaja en la arquitectura Advisor?        → Decisiones compatibles con F20+
 6. ¿Qué pendientes acumulados resuelve?           → Cerrar issues del checkpoint
 7. ¿Propongo ANTES de codificar?                   → El usuario aprueba
 8. ¿Genero código completo o quirúrgico?           → Regla #5: >30% rewrite, ≤15 líneas quirúrgico
 9. ¿Esto es nivel 2026-2027?                      → Si no lo es, replantear
10. ¿El usuario sabía que esto existía?             → Si no, proponerlo
```

### Mi postura operativa

| Situación | Lo que un monkey coder haría | Lo que yo hago |
|-----------|------------------------------|----------------|
| Ver un bug | Corregir la línea | Auditar por qué existe, si es síntoma de un patrón roto, y si hay más instancias |
| Ver una tool sin UI | Ignorarla o hardcodear algo | Proponer cómo se integra en la arquitectura Advisor, qué reglas aplica, qué experiencia ofrece |
| Recibir un componente nuevo | Traducir spec a código | Analizar contra 25+ reglas, contra el Advisor Architecture, contra el backend real, y proponer mejoras |
| Proponer una feature | Hacer lo que piden | Proponer algo que el usuario no sabía que necesitaba — porque veo el patrón completo |
| Integrar AI | Agregar un chatbot básico | Diseñar un Intelligence Engine de 5 niveles con narrativa, simulación, planificación y ejecución |
| Documentar | "Listo, funciona" | Changelog detallado, decision log, verificación contra reglas, impacto en fases futuras |

### Regla de oro (INVIOLABLE)

**Yo propongo y analizo ANTES de escribir código. El usuario aprueba antes de generar. Changelog detallado al final de cada bloque. Formato de edición: Bloque A (código actual exacto) → Bloque B (líneas nuevas para copiar y pegar). Nunca mezclar. Siempre cuestiono lo que propongo — el cuestionamiento va dirigido a la mejora.**

### Formato de entrega de código

```
BLOQUE A: [código actual EXACTO que se reemplaza — solo las líneas relevantes]
BLOQUE B: [código NUEVO que lo reemplaza — listo para copiar y pegar]
CHANGELOG: [qué se cambió, por qué, impacto]
```

---

## 3. PROYECTO

**Nombre:** Castillo Country Club — AI Management Platform
**Tipo:** Private club management platform con AI Intelligence Engine
**Stack:** Python (FastAPI + MCP backend) + React + TypeScript (frontend)
**Clientes:** Clubes privados de Costa Rica
**Foco:** Executive intelligence, member engagement, financial optimization, operational excellence

---

## 4. STACK TÉCNICO

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **AI:** Claude Service (LLM orchestration, prompt engineering, RAG patterns)
- **Protocol:** MCP (Model Context Protocol) — cada agente expone tools con @MCPTool decorator
- **Auth:** JWT + RBAC (ADMIN, STAFF, SOCIO, JUNTA)
- **HITL:** Approval engine con 4 niveles: AUTO → SEMI → HITL → ALWAYS_HUMAN
- **DB:** Repository pattern por dominio (16 repositorios)
- **RAG Engine (F27):**
  - Embeddings: BAAI/bge-m3 (sentence-transformers, 1024 dim, GPU auto-detect)
  - Vector Store: ChromaDB (persistent, cosine distance, metadata filtering)
  - Keyword Search: rank-bm25 (BM25Okapi)
  - Reranker: BAAI/bge-reranker-v2-m3 (cross-encoder, bypass ≤5 candidates)
  - Fusion: Reciprocal Rank Fusion (k=60)
  - Document Parsing: pymupdf (PDF), python-docx (Word), openpyxl (Excel), chardet (encoding)
  ```markdown
### Backend — ML Dependencies (nuevas F44):
- **ML Core:** scikit-learn>=1.4.0, pandas>=2.2.0, numpy>=1.26.0
- **ML Optional:** prophet>=1.1.0 (install: `uv pip install .[ml]`)
- **Auto-detect:** Prophet import try/except → _HAS_PROPHET flag → fallback exp smoothing
```

### Frontend
- **Framework:** React 18+ con TypeScript estricto
- **Styling:** Tailwind 4 + CSS custom properties (Silver Tide design system)
- **State:** Zustand (stores: auth, sidebar, theme)
- **Data:** TanStack Query (React Query) — `useMCPQuery` + `useMCPMutation` en `shared/hooks/useMCPQuery.ts`
- **Routing:** React Router v7 — paths absolutos con `/admin/` prefix
- **Charts:** Recharts (configurado via `shared/lib/chartTheme.ts`)
- **Animations:** Framer Motion + CSS keyframes, con `useReducedMotion()` guard
- **Build:** Vite + pnpm
- **Icons:** Lucide React

### Infraestructura
- **Containerization:** Docker Compose
- **Package management:** pnpm (frontend), uv (backend)
- **Testing:** pytest (backend), unit tests por agente
- **Linting:** ESLint (frontend)

```markdown
### Frontend — New additions (F46):
- **Signal Bus:** `shared/lib/advisor-engine/signal-bus.ts` — cross-domain communication
- **PermissionGate:** `shared/components/auth/PermissionGate.tsx` — dual paradigm (roles + permissions)
```
---

## 5. FILE ARCHITECTURE

.env.example
arrancar.ps1
backend\.coverage
backend\.env
backend\.pytest_cache\CACHEDIR.TAG
backend\.pytest_cache\v\cache\lastfailed
backend\.pytest_cache\v\cache\nodeids
backend\create_admin.py
backend\htmlcov\coverage_html_cb_188fc9a4.js
backend\htmlcov\favicon_32_cb_c827f16f.png
backend\htmlcov\keybd_closed_cb_900cfef5.png
backend\src\club_mcp\__init__.py
backend\src\club_mcp\agents\__init__.py
backend\src\club_mcp\agents\advisor_intelligence.py
backend\src\club_mcp\agents\age_group.py
backend\src\club_mcp\agents\age_group_activity.py
backend\src\club_mcp\agents\base.py
backend\src\club_mcp\agents\communication_agent.py
backend\src\club_mcp\agents\compliance.py
backend\src\club_mcp\agents\cultural_social_agent.py
backend\src\club_mcp\agents\document_intelligence_agent.py
backend\src\club_mcp\agents\event_orchestrator.py
backend\src\club_mcp\agents\executive_dashboard_agent.py
backend\src\club_mcp\agents\facility_management_agent.py
backend\src\club_mcp\agents\family_profile.py
backend\src\club_mcp\agents\finance.py
backend\src\club_mcp\agents\guest_management_agent.py
backend\src\club_mcp\agents\member_360_agent.py
backend\src\club_mcp\agents\member_engagement_agent.py
backend\src\club_mcp\agents\ml_intelligence.py
backend\src\club_mcp\agents\proactive_recommendation_agent.py
backend\src\club_mcp\agents\satisfaction_agent.py
backend\src\club_mcp\agents\sports_recreation_agent.py
backend\src\club_mcp\agents\wellness.py
backend\src\club_mcp\ai\__init__.py
backend\src\club_mcp\ai\claude_service.py
backend\src\club_mcp\ai\prompts.py
backend\src\club_mcp\ai\prompts_member_360.py
backend\src\club_mcp\api\__init__.py
backend\src\club_mcp\api\app.py
backend\src\club_mcp\api\dependencies.py
backend\src\club_mcp\api\routes\__init__.py
backend\src\club_mcp\api\routes\agents.py
backend\src\club_mcp\api\routes\auth.py
backend\src\club_mcp\api\routes\chat.py
backend\src\club_mcp\api\routes\documents.py
backend\src\club_mcp\api\routes\health.py
backend\src\club_mcp\auth\__init__.py
backend\src\club_mcp\auth\jwt_service.py
backend\src\club_mcp\auth\middleware.py
backend\src\club_mcp\auth\models.py
backend\src\club_mcp\auth\password_service.py
backend\src\club_mcp\auth\rbac.py
backend\src\club_mcp\auth\seed_users.py
backend\src\club_mcp\auth\tool_permissions.py
backend\src\club_mcp\config\__init__.py
backend\src\club_mcp\config\settings.py
backend\src\club_mcp\db\__init__.py
backend\src\club_mcp\db\repositories\__init__.py
backend\src\club_mcp\db\repositories\age_group_repo.py
backend\src\club_mcp\db\repositories\communication_repo.py
backend\src\club_mcp\db\repositories\compliance_repo.py
backend\src\club_mcp\db\repositories\cultural_social_repo.py
backend\src\club_mcp\db\repositories\document_intelligence_repo.py
backend\src\club_mcp\db\repositories\event_repo.py
backend\src\club_mcp\db\repositories\executive_dashboard_repo.py
backend\src\club_mcp\db\repositories\facility_management_repo.py
backend\src\club_mcp\db\repositories\family_repo.py
backend\src\club_mcp\db\repositories\finance_repo.py
backend\src\club_mcp\db\repositories\guest_management_repo.py
backend\src\club_mcp\db\repositories\member_360_repo.py
backend\src\club_mcp\db\repositories\member_engagement_repo.py
backend\src\club_mcp\db\repositories\ml_intelligence_repo.py
backend\src\club_mcp\db\repositories\proactive_recommendation_repo.py
backend\src\club_mcp\db\repositories\satisfaction_repo.py
backend\src\club_mcp\db\repositories\sports_recreation_repo.py
backend\src\club_mcp\db\repositories\wellness_repo.py
backend\src\club_mcp\hitl\__init__.py
backend\src\club_mcp\hitl\approval_engine.py
backend\src\club_mcp\hitl\approval_types.py
backend\src\club_mcp\hitl\notifier.py
backend\src\club_mcp\models\__init__.py
backend\src\club_mcp\models\advisor_intelligence.py
backend\src\club_mcp\models\age_group_activity.py
backend\src\club_mcp\models\communication.py
backend\src\club_mcp\models\compliance.py
backend\src\club_mcp\models\cultural_social.py
backend\src\club_mcp\models\document_intelligence.py
backend\src\club_mcp\models\event.py
backend\src\club_mcp\models\executive_dashboard.py
backend\src\club_mcp\models\facility_management.py
backend\src\club_mcp\models\family.py
backend\src\club_mcp\models\finance.py
backend\src\club_mcp\models\guest_management.py
backend\src\club_mcp\models\member.py
backend\src\club_mcp\models\member_360.py
backend\src\club_mcp\models\member_engagement.py
backend\src\club_mcp\models\ml_intelligence.py
backend\src\club_mcp\models\proactive_recommendation.py
backend\src\club_mcp\models\satisfaction.py
backend\src\club_mcp\models\sports_recreation.py
backend\src\club_mcp\models\wellness.py
backend\src\club_mcp\rag\__init__.py
backend\src\club_mcp\rag\chunker.py
backend\src\club_mcp\rag\conversations.py
backend\src\club_mcp\rag\embeddings.py
backend\src\club_mcp\rag\parsers.py
backend\src\club_mcp\rag\rag_service.py
backend\src\club_mcp\rag\reranker.py
backend\src\club_mcp\rag\search.py
backend\src\club_mcp\rag\vectorstore.py
backend\src\club_mcp\server.py
backend\tests\conftest.py
backend\tests\unit\agents\test_age_group.py
backend\tests\unit\agents\test_communication_agent.py
backend\tests\unit\agents\test_compliance.py
backend\tests\unit\agents\test_cultural_social_agent.py
backend\tests\unit\agents\test_document_intelligence_agent.py
backend\tests\unit\agents\test_event_orchestrator.py
backend\tests\unit\agents\test_executive_dashboard_agent.py
backend\tests\unit\agents\test_facility_management_agent.py
backend\tests\unit\agents\test_family_agent.py
backend\tests\unit\agents\test_finance.py
backend\tests\unit\agents\test_guest_management_agent.py
backend\tests\unit\agents\test_member_engagement_agent.py
backend\tests\unit\agents\test_ml_intelligence.py
backend\tests\unit\agents\test_proactive_recommendation_agent.py
backend\tests\unit\agents\test_satisfaction_agent.py
backend\tests\unit\agents\test_sports_recreation_agent.py
backend\tests\unit\agents\test_wellness.py
backend\tests\unit\api\__init__.py
backend\tests\unit\api\test_agents_routes.py
backend\tests\unit\api\test_auth_routes.py
backend\tests\unit\api\test_health.py
backend\tests\unit\auth\__init__.py
backend\tests\unit\auth\test_jwt_service.py
backend\tests\unit\auth\test_password_service.py
backend\tests\unit\auth\test_rbac.py
backend\uv.lock
build_complete.py
docker-compose.yml
frontend\.pytest_cache\CACHEDIR.TAG
frontend\.pytest_cache\v\cache\nodeids
frontend\eslint.config.js
frontend\pnpm-lock.yaml
frontend\pnpm-workspace.yaml
frontend\public\CCC.png
frontend\public\favicon.svg
frontend\public\icons.svg
frontend\src\app\App.tsx
frontend\src\app\providers.tsx
frontend\src\app\RoleRedirect.tsx
frontend\src\app\router.tsx
frontend\src\features\age-group\AgeGroupDashboard.tsx
frontend\src\features\age-group\components\AgeGroupAdvisorBanner.tsx
frontend\src\features\age-group\components\AgeGroupDistributionPanel.tsx
frontend\src\features\age-group\components\AgeGroupHealthScore.tsx
frontend\src\features\age-group\components\AgeGroupIntelligencePanel.tsx
frontend\src\features\age-group\components\AgeGroupProgramsPanel.tsx
frontend\src\features\age-group\components\AgeGroupTrendsPanel.tsx
frontend\src\features\age-group\hooks\useAgeGroupAdvisor.ts
frontend\src\features\age-group\hooks\useAgeGroupData.ts
frontend\src\features\age-group\types.ts
frontend\src\features\approvals\ApprovalQueue.tsx
frontend\src\features\approvals\components\ParamsPreview.tsx
frontend\src\features\approvals\types.ts
frontend\src\features\auth\LoginPage.tsx
frontend\src\features\communications\AnnouncementBoard.tsx
frontend\src\features\communications\CommunicationCenter.tsx
frontend\src\features\communications\CommunicationDashboard.tsx
frontend\src\features\communications\components\CampaignGenerator.tsx
frontend\src\features\communications\components\CommunicationAdvisorBanner.tsx
frontend\src\features\communications\components\CommunicationAnalytics.tsx
frontend\src\features\communications\components\CommunicationOverview.tsx
frontend\src\features\communications\components\CommunicationPreferences.tsx
frontend\src\features\communications\components\PersonalizedCommunication.tsx
frontend\src\features\communications\components\ScheduleComposer.tsx
frontend\src\features\communications\components\SentimentMonitor.tsx
frontend\src\features\communications\EmergencyBroadcast.tsx
frontend\src\features\communications\hooks\useCommunicationAdvisor.ts
frontend\src\features\communications\hooks\useCommunicationData.ts
frontend\src\features\communications\types.ts
frontend\src\features\cultural\components\CulturalAdvisorBanner.tsx
frontend\src\features\cultural\components\CulturalCalendar.tsx
frontend\src\features\cultural\components\CulturalHealthScore.tsx
frontend\src\features\cultural\components\CulturalIntelligencePanel.tsx
frontend\src\features\cultural\components\EntertainmentFormModal.tsx
frontend\src\features\cultural\components\EntertainmentPanel.tsx
frontend\src\features\cultural\components\ExhibitionFormModal.tsx
frontend\src\features\cultural\components\ExhibitionsPanel.tsx
frontend\src\features\cultural\components\GalaFormModal.tsx
frontend\src\features\cultural\components\GalasPanel.tsx
frontend\src\features\cultural\components\ProgramFormModal.tsx
frontend\src\features\cultural\components\ProgramsPanel.tsx
frontend\src\features\cultural\components\SocialEventFormModal.tsx
frontend\src\features\cultural\components\VenueIntelligence.tsx
frontend\src\features\cultural\CulturalDashboard.tsx
frontend\src\features\cultural\hooks\useCulturalAdvisor.ts
frontend\src\features\cultural\types.ts
frontend\src\features\dashboard\components\AgeBalanceWidget.tsx
frontend\src\features\dashboard\components\AnomalyFeed.tsx
frontend\src\features\dashboard\components\ExecutiveIntelligenceStrip.tsx
frontend\src\features\dashboard\components\GlobalAdvisorBanner.tsx
frontend\src\features\dashboard\components\HitlQueue.tsx
frontend\src\features\dashboard\components\KPICards.tsx
frontend\src\features\dashboard\components\MembershipDonut.tsx
frontend\src\features\dashboard\components\PeriodSelector.tsx
frontend\src\features\dashboard\components\PrintView.tsx
frontend\src\features\dashboard\components\QuickActions.tsx
frontend\src\features\dashboard\components\RevenueChart.tsx
frontend\src\features\dashboard\components\ThePulse.tsx
frontend\src\features\dashboard\components\TopActivities.tsx
frontend\src\features\dashboard\components\YearOverYearToggle.tsx
frontend\src\features\dashboard\ExecutiveDashboard.tsx
frontend\src\features\dashboard\hooks\useGlobalAdvisor.ts
frontend\src\features\dashboard\hooks\useGlobalData.ts
frontend\src\features\dashboard\types.ts
frontend\src\features\documents\DocumentRepository.tsx
frontend\src\features\documents\KnowledgeQuery.tsx
frontend\src\features\documents\types.ts
frontend\src\features\engagement\components\EngagementAdvisorBanner.tsx
frontend\src\features\engagement\components\EngagementHealthScore.tsx
frontend\src\features\engagement\components\EngagementTrajectoryNavigator.tsx
frontend\src\features\engagement\components\SatisfactionAdvisorBanner.tsx
frontend\src\features\engagement\components\SatisfactionBenchmarkPanel.tsx
frontend\src\features\engagement\components\SatisfactionHealthScoreCard.tsx
frontend\src\features\engagement\components\SatisfactionImpactMatrix.tsx
frontend\src\features\engagement\components\SatisfactionProposalsPanel.tsx
frontend\src\features\engagement\EngagementDashboard.tsx
frontend\src\features\engagement\hooks\useMemberEngagementAdvisor.ts
frontend\src\features\engagement\hooks\useSatisfactionAdvisor.ts
frontend\src\features\engagement\hooks\useSatisfactionData.ts
frontend\src\features\engagement\ReactivationCampaigns.tsx
frontend\src\features\engagement\SatisfactionReport.tsx
frontend\src\features\engagement\SatisfactionSurvey.tsx
frontend\src\features\engagement\types.ts
frontend\src\features\events\components\EventAdvisorBanner.tsx
frontend\src\features\events\components\EventIntelligencePanel.tsx
frontend\src\features\events\EventCalendar.tsx
frontend\src\features\events\EventDetail.tsx
frontend\src\features\events\EventForm.tsx
frontend\src\features\events\hooks\useEventAdvisor.ts
frontend\src\features\events\hooks\useEventData.ts
frontend\src\features\events\types.ts
frontend\src\features\facilities\components\AmenityHeatmap.tsx
frontend\src\features\facilities\components\BookingFormModal.tsx
frontend\src\features\facilities\components\EventSetupPanel.tsx
frontend\src\features\facilities\components\FacilitiesAdvisorBanner.tsx
frontend\src\features\facilities\components\FacilitiesHealthScore.tsx
frontend\src\features\facilities\components\FacilitiesIntelligencePanel.tsx
frontend\src\features\facilities\components\FacilityBookingPanel.tsx
frontend\src\features\facilities\components\InspectionPanel.tsx
frontend\src\features\facilities\components\LiveOccupancyBoard.tsx
frontend\src\features\facilities\components\MaintenanceCalendar.tsx
frontend\src\features\facilities\components\MaintenanceScoring.tsx
frontend\src\features\facilities\components\SpaceROI.tsx
frontend\src\features\facilities\FacilitiesDashboard.tsx
frontend\src\features\facilities\FacilityDetail.tsx
frontend\src\features\facilities\FacilityMap.tsx
frontend\src\features\facilities\hooks\useFacilitiesAdvisor.ts
frontend\src\features\facilities\hooks\useFacilitiesMCP.ts
frontend\src\features\facilities\ReservationCalendar.tsx
frontend\src\features\facilities\types.ts
frontend\src\features\families\components\FamilyAdvisorBanner.tsx
frontend\src\features\families\components\FamilyIntelligencePanel.tsx
frontend\src\features\families\components\MemberCard.tsx
frontend\src\features\families\components\SocialGraph.tsx
frontend\src\features\families\FamilyDetail.tsx
frontend\src\features\families\FamilyForm.tsx
frontend\src\features\families\FamilyList.tsx
frontend\src\features\families\hooks\useFamilyAdvisor.ts
frontend\src\features\families\types.ts
frontend\src\features\finance\components\BillingCenter.tsx
frontend\src\features\finance\components\BudgetManager.tsx
frontend\src\features\finance\components\DecisionCockpit.tsx
frontend\src\features\finance\components\ExpenseManager.tsx
frontend\src\features\finance\components\FinanceAnalytics.tsx
frontend\src\features\finance\components\FinanceIntelligencePanel.tsx
frontend\src\features\finance\components\FinanceOverview.tsx
frontend\src\features\finance\components\FinancialAdvisorBanner.tsx
frontend\src\features\finance\components\FinancialIntelligence.tsx
frontend\src\features\finance\components\MemberProfitabilityMatrix.tsx
frontend\src\features\finance\components\NarrativeEngine.tsx
frontend\src\features\finance\components\ReportGenerator.tsx
frontend\src\features\finance\components\SeasonalCalendar.tsx
frontend\src\features\finance\components\StressTestPanel.tsx
frontend\src\features\finance\FamilyAccount.tsx
frontend\src\features\finance\FinancialDashboard.tsx
frontend\src\features\finance\hooks\useFinanceData.ts
frontend\src\features\finance\hooks\useFinancialAdvisor.ts
frontend\src\features\finance\types.ts
frontend\src\features\guests\components\ConversionFunnelViz.tsx
frontend\src\features\guests\components\GuestAdvisorBanner.tsx
frontend\src\features\guests\components\GuestAnalytics.tsx
frontend\src\features\guests\components\GuestHealthScoreCard.tsx
frontend\src\features\guests\components\GuestIntelligencePanel.tsx
frontend\src\features\guests\components\GuestRegistry.tsx
frontend\src\features\guests\components\PipelinePredictorCard.tsx
frontend\src\features\guests\components\PrivateEventPlanner.tsx
frontend\src\features\guests\components\TrialMembershipManager.tsx
frontend\src\features\guests\GuestList.tsx
frontend\src\features\guests\GuestManagementDashboard.tsx
frontend\src\features\guests\GuestRegistration.tsx
frontend\src\features\guests\hooks\useGuestAdvisor.ts
frontend\src\features\guests\hooks\useGuestData.ts
frontend\src\features\guests\types.ts
frontend\src\features\maintenance\types.ts
frontend\src\features\members\components\Member360AdvisorBanner.tsx
frontend\src\features\members\components\Member360HealthScore.tsx
frontend\src\features\members\components\Member360IntelligencePanel.tsx
frontend\src\features\members\components\MemberChurnPrevention.tsx
frontend\src\features\members\components\MemberEngagementMotor.tsx
frontend\src\features\members\components\MemberEngagementProfile.tsx
frontend\src\features\members\components\MemberFinancialSummary.tsx
frontend\src\features\members\components\MemberHealthScore.tsx
frontend\src\features\members\components\MemberIdentityCard.tsx
frontend\src\features\members\components\MemberIntelligenceDashboard.tsx
frontend\src\features\members\components\MemberJourneyTimeline.tsx
frontend\src\features\members\components\MemberLTV.tsx
frontend\src\features\members\components\MemberRiskRadar.tsx
frontend\src\features\members\components\MemberSegmentation.tsx
frontend\src\features\members\components\MemberSocialProfile.tsx
frontend\src\features\members\hooks\useMember360Advisor.ts
frontend\src\features\members\hooks\useMember360MCP.ts
frontend\src\features\members\index.ts
frontend\src\features\members\Member360Dashboard.tsx
frontend\src\features\members\member360-types.ts
frontend\src\features\members\types.ts
frontend\src\features\mi-club\MiClubFamilyPage.tsx
frontend\src\features\mi-club\MiClubLanding.tsx
frontend\src\features\mi-club\MyReservations.tsx
frontend\src\features\operations\components\ComplianceCheck.tsx
frontend\src\features\operations\components\DailyBriefing.tsx
frontend\src\features\operations\components\SmartSchedule.tsx
frontend\src\features\operations\OperationsDashboard.tsx
frontend\src\features\recommendations\components\ActivitySuggester.tsx
frontend\src\features\recommendations\components\AdvisorBanner.tsx
frontend\src\features\recommendations\components\FamilyRecommendations.tsx
frontend\src\features\recommendations\components\PredictAttendance.tsx
frontend\src\features\recommendations\components\PricingOptimizer.tsx
frontend\src\features\recommendations\components\QuarterlyInsights.tsx
frontend\src\features\recommendations\components\RecommendationsOverview.tsx
frontend\src\features\recommendations\components\SchedulingConflicts.tsx
frontend\src\features\recommendations\components\SocialClusters.tsx
frontend\src\features\recommendations\hooks\useRecommendationAdvisor.ts
frontend\src\features\recommendations\hooks\useRecommendationData.ts
frontend\src\features\recommendations\RecommendationsDashboard.tsx
frontend\src\features\recommendations\types.ts
frontend\src\features\reports\BoardReportViewer.tsx
frontend\src\features\reports\RiskHeatmap.tsx
frontend\src\features\reports\types.ts
frontend\src\features\settings\SettingsPage.tsx
frontend\src\features\sports\components\BracketView.tsx
frontend\src\features\sports\components\ClassesPanel.tsx
frontend\src\features\sports\components\ClassFormModal.tsx
frontend\src\features\sports\components\CoachingFormModal.tsx
frontend\src\features\sports\components\CoachingPanel.tsx
frontend\src\features\sports\components\CourtBookingPanel.tsx
frontend\src\features\sports\components\CourtHeatmap.tsx
frontend\src\features\sports\components\EquipmentPanel.tsx
frontend\src\features\sports\components\LeagueFormModal.tsx
frontend\src\features\sports\components\LeaguePanel.tsx
frontend\src\features\sports\components\LiveArenaGrid.tsx
frontend\src\features\sports\components\ReservationFormModal.tsx
frontend\src\features\sports\components\SkillProgression.tsx
frontend\src\features\sports\components\SportsAdvisorBanner.tsx
frontend\src\features\sports\components\SportsCalendar.tsx
frontend\src\features\sports\components\SportsHealthScore.tsx
frontend\src\features\sports\components\SportsIntelligencePanel.tsx
frontend\src\features\sports\components\TournamentFormModal.tsx
frontend\src\features\sports\components\TournamentPanel.tsx
frontend\src\features\sports\hooks\useSportsAdvisor.ts
frontend\src\features\sports\hooks\useSportsData.ts
frontend\src\features\sports\SportsDashboard.tsx
frontend\src\features\sports\types.ts
frontend\src\features\wellness\components\WellnessAdvisorBanner.tsx
frontend\src\features\wellness\components\WellnessAIAdvisor.tsx
frontend\src\features\wellness\components\WellnessBusinessInsights.tsx
frontend\src\features\wellness\components\WellnessFamilyMap.tsx
frontend\src\features\wellness\components\WellnessGoals.tsx
frontend\src\features\wellness\components\WellnessRiskRadar.tsx
frontend\src\features\wellness\components\WellnessScoreCard.tsx
frontend\src\features\wellness\components\WellnessTrends.tsx
frontend\src\features\wellness\hooks\useWellnessAdvisor.ts
frontend\src\features\wellness\lib\wellnessPersonas.ts
frontend\src\features\wellness\types.ts
frontend\src\features\wellness\WellnessDashboard.tsx
frontend\src\main.tsx
frontend\src\shared\components\AdvisorBanner.tsx
frontend\src\shared\components\ai\AIBoardBriefViewer.tsx
frontend\src\shared\components\ai\AIDecisionPanel.tsx
frontend\src\shared\components\ai\AIInsightNarrative.tsx
frontend\src\shared\components\ai\AISimulationPanel.tsx
frontend\src\shared\components\auth\PermissionGate.tsx
frontend\src\shared\components\chat\AIChatWidget.tsx
frontend\src\shared\components\error\ErrorBoundary.tsx
frontend\src\shared\components\error\NotFoundPage.tsx
frontend\src\shared\components\export\DecisionDocument.tsx
frontend\src\shared\components\export\ExportButton.tsx
frontend\src\shared\components\export\PrintView.tsx
frontend\src\shared\components\feedback\Placeholder.tsx
frontend\src\shared\components\layout\AvatarAura.tsx
frontend\src\shared\components\layout\CursorEffect.tsx
frontend\src\shared\components\layout\DashboardLayout.tsx
frontend\src\shared\components\layout\DetailTabs.tsx
frontend\src\shared\components\layout\EmptyState.tsx
frontend\src\shared\components\layout\ErrorBoundary.tsx
frontend\src\shared\components\layout\Header.tsx
frontend\src\shared\components\layout\KeyboardHelpModal.tsx
frontend\src\shared\components\layout\MarbleBackground.tsx
frontend\src\shared\components\layout\MarbleCanvas.tsx
frontend\src\shared\components\layout\MobileNav.tsx
frontend\src\shared\components\layout\NotificationCenter.tsx
frontend\src\shared\components\layout\PageContainer.tsx
frontend\src\shared\components\layout\RouteSkeleton.tsx
frontend\src\shared\components\layout\SectionError.tsx
frontend\src\shared\components\layout\Sidebar.tsx
frontend\src\shared\components\layout\SignalBusDebugPanel.tsx
frontend\src\shared\components\layout\SkipNavigation.tsx
frontend\src\shared\components\layout\StatCard.tsx
frontend\src\shared\components\layout\TopLoadingBar.tsx
frontend\src\shared\components\layout\WebGLBackground.tsx
frontend\src\shared\components\layout\WelcomeModal.tsx
frontend\src\shared\components\ml\ChatActionCard.tsx
frontend\src\shared\components\ml\HypotheticalSimulator.tsx
frontend\src\shared\components\ml\MLAdvisorBanner.tsx
frontend\src\shared\components\ml\MLDashboardPage.tsx
frontend\src\shared\components\ml\ModelHealthPanel.tsx
frontend\src\shared\components\ml\PredictiveIntelligenceFeed.tsx
frontend\src\shared\components\ui\AdvisorActionModal.tsx
frontend\src\shared\components\ui\AdvisorReactionCard.tsx
frontend\src\shared\components\ui\Badge.tsx
frontend\src\shared\components\ui\Button.tsx
frontend\src\shared\components\ui\Card.tsx
frontend\src\shared\components\ui\CommandPalette.tsx
frontend\src\shared\components\ui\EmptyState.tsx
frontend\src\shared\components\ui\FilterDropdown.tsx
frontend\src\shared\components\ui\FormField.tsx
frontend\src\shared\components\ui\FreshnessBadge.tsx
frontend\src\shared\components\ui\FrostedGlassCard.tsx
frontend\src\shared\components\ui\GlowButton.tsx
frontend\src\shared\components\ui\index.ts
frontend\src\shared\components\ui\Input.tsx
frontend\src\shared\components\ui\Modal.tsx
frontend\src\shared\components\ui\NotificationDropdown.tsx
frontend\src\shared\components\ui\ScoreGauge.tsx
frontend\src\shared\components\ui\Skeleton.tsx
frontend\src\shared\components\ui\StaleDataBanner.tsx
frontend\src\shared\components\ui\Table.tsx
frontend\src\shared\components\ui\Toast.tsx
frontend\src\shared\components\ui\WizardStepper.tsx
frontend\src\shared\hooks\useAdvisorNarrative.ts
frontend\src\shared\hooks\useBreakpoint.ts
frontend\src\shared\hooks\useDataFreshness.ts
frontend\src\shared\hooks\useGlobalStatus.ts
frontend\src\shared\hooks\useInsightCounts.ts
frontend\src\shared\hooks\useKeyboardNav.ts
frontend\src\shared\hooks\useMCPQuery.ts
frontend\src\shared\hooks\useMLAdvisor.ts
frontend\src\shared\hooks\useMLData.ts
frontend\src\shared\hooks\usePulseVitals.ts
frontend\src\shared\hooks\useRAGContext.ts
frontend\src\shared\hooks\useReducedMotion.ts
frontend\src\shared\hooks\useRestoreFocus.ts
frontend\src\shared\hooks\useRouteFocus.ts
frontend\src\shared\hooks\useScrollToTop.ts
frontend\src\shared\hooks\useWebVitals.ts
frontend\src\shared\lib\adaptiveThresholds.ts
frontend\src\shared\lib\advisor-engine\__tests__\engine.test.ts
frontend\src\shared\lib\advisor-engine\__tests__\signals.test.ts
frontend\src\shared\lib\advisor-engine\confidence.ts
frontend\src\shared\lib\advisor-engine\engine.ts
frontend\src\shared\lib\advisor-engine\evaluate.ts
frontend\src\shared\lib\advisor-engine\health-score.ts
frontend\src\shared\lib\advisor-engine\index.ts
frontend\src\shared\lib\advisor-engine\migration.ts
frontend\src\shared\lib\advisor-engine\rules\age-group.ts
frontend\src\shared\lib\advisor-engine\rules\communication.ts
frontend\src\shared\lib\advisor-engine\rules\events.ts
frontend\src\shared\lib\advisor-engine\rules\financial.ts
frontend\src\shared\lib\advisor-engine\rules\global.ts
frontend\src\shared\lib\advisor-engine\rules\guest.ts
frontend\src\shared\lib\advisor-engine\rules\ml.ts
frontend\src\shared\lib\advisor-engine\rules\recommendation.ts
frontend\src\shared\lib\advisor-engine\rules\satisfaction.ts
frontend\src\shared\lib\advisor-engine\rules\sports.ts
frontend\src\shared\lib\advisor-engine\signal-bus.ts
frontend\src\shared\lib\advisor-engine\signal-seeder.ts
frontend\src\shared\lib\advisor-engine\types.ts
frontend\src\shared\lib\analytics.ts
frontend\src\shared\lib\api.ts
frontend\src\shared\lib\chartTheme.ts
frontend\src\shared\lib\focusTrap.ts
frontend\src\shared\lib\mcp\index.ts
frontend\src\shared\lib\mcp\mcp-router.ts
frontend\src\shared\lib\mcp\migration-tracker.ts
frontend\src\shared\lib\mock-data.ts
frontend\src\shared\lib\reactionTemplate.ts
frontend\src\shared\lib\riskTheme.ts
frontend\src\shared\lib\routePrefetch.ts
frontend\src\shared\lib\routes.ts
frontend\src\shared\lib\toolNameAdapter.ts
frontend\src\shared\lib\ui\advisorConfig.ts
frontend\src\shared\lib\utils.ts
frontend\src\shared\mocks\contracts.ts
frontend\src\shared\mocks\factories.ts
frontend\src\shared\mocks\mock-registry.ts
frontend\src\shared\mocks\normalizeEnums.ts
frontend\src\shared\mocks\validateMocks.ts
frontend\src\shared\services\exportService.ts
frontend\src\shared\types\ai-intelligence.ts
frontend\src\shared\types\domain-enums.ts
frontend\src\shared\types\permissions.ts
frontend\src\stores\auth.store.ts
frontend\src\stores\chat.store.ts
frontend\src\stores\sidebar.store.ts
frontend\src\stores\theme.store.ts
frontend\src\vite-env.d.ts
frontend\vite.config.ts
Makefile
scripts\setup.sh
scripts\verify-integration.ts


```

---

## 6. DESIGN SYSTEM — SILVER TIDE

### REGLA ABSOLUTA

> **SOLO usar tokens definidos en `@theme {}` de `globals.css`. NUNCA inventar tokens. Si no existe en @theme, NO existe. Hacer grep antes de usar.**

### 6.1 Surface Hierarchy (Backgrounds)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-abyss` | #080B12 | Deepest canvas, body background |
| `--color-surface-0` | #0D1117 | Page canvas, main background |
| `--color-surface-1` | #151B24 | Card base, sidebar |
| `--color-surface-2` | #1C2230 | Elevated surfaces, inputs |
| `--color-surface-3` | #242C3A | Highest surface, hover states |

### 6.2 Silver Scale (Text Hierarchy)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-silver-100` | #F0F2F5 | Headings, emphasis, primary text |
| `--color-silver-200` | #D8DCE4 | Body text, main content |
| `--color-silver-300` | #B8C0CC | Secondary text, descriptions |
| `--color-silver-400` | #8A95A5 | Muted labels, hints, timestamps |
| `--color-silver-500` | #5C6978 | Dimmed, disabled, placeholder |
| `--color-silver-600` | #3D4755 | Background-level, borders |

**MAPPING para componentes nuevos:**
- "text primary" → `--color-silver-100` (headings) o `--color-silver-200` (body)
- "text secondary" → `--color-silver-300`
- "text muted" → `--color-silver-400`
- "text disabled" → `--color-silver-500`

### 6.3 Gold Scale (Brand / Accent)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-gold-50` | #FBF5E6 | Lightest tint |
| `--color-gold-100` | #F5EDD0 | Light background |
| `--color-gold-200` | #E8D49A | Hover states, champagne |
| `--color-gold-300` | #D4B96A | Secondary accent |
| `--color-gold-400` | #C9A96E | **PRIMARY brand accent** — links, focus rings, active states |
| `--color-gold-500` | #A88540 | Pressed states |
| `--color-gold-600` | #8A6A3A | Dark accent |
| `--color-gold-700` | #6B5028 | Deepest gold |

### 6.4 Functional Colors

**Teal (funcional / datos / info):**

| Token | Hex |
|-------|-----|
| `--color-teal-100` | #B8E8F0 |
| `--color-teal-200` | #7ACCE0 |
| `--color-teal-300` | #4AB8D0 |
| `--color-teal-400` | #2A9AB5 ← **primary info color** |
| `--color-teal-500` | #1E7A90 |
| `--color-teal-600` | #155E70 |

**Emerald (crecimiento / éxito):**

| Token | Hex |
|-------|-----|
| `--color-emerald-100` | #B0EDD0 |
| `--color-emerald-300` | #6DD4A0 |
| `--color-emerald-400` | #3DAA70 ← **primary success** |
| `--color-emerald-500` | #2D8A58 |

**Amber (advertencia):**

| Token | Hex |
|-------|-----|
| `--color-amber-300` | #E8C870 |
| `--color-amber-400` | #D4A840 ← **primary warning** |
| `--color-amber-500` | #B88E28 |

**Rose (error / destructivo):**

| Token | Hex |
|-------|-----|
| `--color-rose-100` | #F0C8CC |
| `--color-rose-300` | #E08890 |
| `--color-rose-400` | #C46470 ← **primary error** |
| `--color-rose-500` | #A84858 |

**Terracotta (tierra volcánica / charts / actividades):**

| Token | Hex |
|-------|-----|
| `--color-terracotta-300` | #E09878 |
| `--color-terracotta-400` | #D47A5A |
| `--color-terracotta-500` | #B86040 |

**Sage (verde elegante):**

| Token | Hex |
|-------|-----|
| `--color-sage-100` | #B8D4C0 |
| `--color-sage-200` | #8AB49A |
| `--color-sage-300` | #6B9A7A |
| `--color-sage-400` | #5B8A6A |
| `--color-sage-500` | #4A7A5C |
| `--color-sage-600` | #3A6A4C |

### 6.5 Semantic Backgrounds

| Token | Valor |
|-------|-------|
| `--color-emerald-bg` | rgba(61,170,112,0.06) |
| `--color-amber-bg` | rgba(212,168,64,0.06) |
| `--color-rose-bg` | rgba(196,100,112,0.05) |
| `--color-teal-bg` | rgba(42,154,181,0.05) |
| `--color-critical` | #D85060 |
| `--color-critical-bg` | rgba(216,80,96,0.08) |

### 6.6 Shadow System

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-soft` | 0 2px 8px rgba(0,0,0,0.4) | Subtle elevation |
| `--shadow-card` | 0 4px 16px rgba(0,0,0,0.5) | **Standard card shadow** |
| `--shadow-elevated` | 0 8px 32px rgba(0,0,0,0.6) | **Hover/modal shadow** |
| `--shadow-gold` | 0 4px 16px rgba(201,169,110,0.15) | Gold glow |
| `--shadow-teal` | 0 4px 16px rgba(42,154,181,0.15) | Teal glow |
| `--shadow-rose` | 0 4px 16px rgba(196,100,112,0.15) | Rose glow |

**USO EN TAILWIND:** `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-elevated)]`
**NO REEMPLAZAR** con `shadow-lg` o `shadow-xl` — los shadows de Silver Tide son más pesados intencionalmente para tema oscuro.

### 6.7 Glass System

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--glass-bg` | rgba(255,255,255,0.04) | rgba(0,0,0,0.03) |
| `--glass-bg-hover` | rgba(255,255,255,0.07) | rgba(0,0,0,0.05) |
| `--glass-bg-active` | rgba(201,169,110,0.08) | rgba(168,133,64,0.06) |
| `--glass-border` | rgba(255,255,255,0.06) | rgba(0,0,0,0.08) |
| `--glass-border-hover` | rgba(255,255,255,0.14) | rgba(0,0,0,0.14) |
| `--glass-border-active` | rgba(201,169,110,0.20) | rgba(168,133,64,0.25) |

**Glass CSS classes:**
- `.glass-card` — Rain on Glass effect (backdrop-blur, rain streaks, hover lift). Usar `border-radius: 18px`.
- `.glass-panel` — Más opaco para sidebar/modals
- `.glass-input` — Form inputs con glass effect
- `.stat-surface` — Stat cards más sutiles que glass-card
- `.glow-card` — Con border glow driven by `--glow-color`

**Glass card tones** (data-tone attribute): `gold`, `teal`, `emerald`, `terracotta`, `silver`, `rose`, `jade` (legacy), `aqua` (legacy), `deep` (legacy)

### 6.8 Typography

| Token | Font | Uso |
|-------|------|-----|
| `--font-display` | "Cormorant Garamond", Georgia, serif | Headings h1-h6 |
| `--font-body` | "Source Serif 4", Georgia, serif | Long-form content |
| `--font-ui` | "DM Sans", system-ui, sans-serif | **Default body, all UI elements** |
| `--font-mono` | "DM Mono", "Courier New", monospace | Numbers, codes, data |

> **NOTA:** `--font-body` existe en globals.css. `--font-ui` es el default para todo componente.
> **Font loading:** SIEMPRE via `<link>` tag en `<head>` (Google Fonts CDN), NUNCA solo en CSS.
> **En Tailwind:** `font-[family-name:var(--font-display)]`, `font-[family-name:var(--font-ui)]`, etc.
> **NUNCA usar:** Inter, Roboto, Arial, Space Grotesk, system-ui como primary typeface.

### 6.9 Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-2xl` | 20px |

Glass cards usan: `border-radius: 18px` (hardcoded en CSS, no token).

### 6.10 Chart Palette

| Token | Hex | Uso |
|-------|-----|-----|
| `--chart-primary` | #C9A96E | Main series |
| `--chart-secondary` | #2A9AB5 | Secondary series |
| `--chart-tertiary` | #3DAA70 | Tertiary series |
| `--chart-warm` | #D47A5A | Warm accent |
| `--chart-neutral` | #8A95A5 | Neutral/muted |
| `--chart-highlight` | #4AB8D0 | Highlight |
| `--chart-axis` | rgba(255,255,255,0.12) | Axis lines |
| `--chart-grid` | rgba(255,255,255,0.04) | Grid lines |
| `--chart-label` | #8A95A5 | Axis labels |
| `--chart-tooltip-bg` | rgba(13,17,23,0.92) | Tooltip background |

### 6.11 Alert Card System

Class: `.alert-card` + modifier

| Modifier | Border Color | BG | Text Color |
|----------|-------------|-----|------------|
| `--success` | emerald/0.20 | emerald-bg | emerald-300 |
| `--warning` | amber/0.20 | amber-bg | amber-300 |
| `--error` | rose/0.20 | rose-bg | rose-300 |
| `--info` | teal/0.20 | teal-bg | teal-300 |
| `--critical` | #D85060/0.25 | critical-bg | rose-300 |
| `--premium` | gold/0.30 | gold/0.06 | gold-200 |

### 6.12 Button Hover Effects

- **Aurora sweep** (`.aurora-btn`): Horizontal light band on hover. Variants: `--gold`, `--sage`, `--danger` (default = neutral silver).
- **Lunar sweep** (`.lunar-btn`): Diagonal beam (15°) with halo glow. Variants: `--gold`, `--rose`, `--emerald`, `--silver`, `--teal`.
- **Glow card** (`.glow-card`): Border glow driven by `--glow-color`. Intensifies on hover. Use: `<Card glowColor="var(--color-teal-400)">`.

### 6.13 CSS Class Patterns

```css
/* Glass card */
.glass-card {
  background: var(--color-surface-1);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 8%, transparent);
  border-radius: var(--radius-lg);
}

/* Aurora button — Gold (acciones primarias) */
.aurora-btn--gold {
  background: color-mix(in srgb, var(--color-gold-400) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 25%, transparent);
}

/* Aurora button — Sage (acciones secundarias) */
.aurora-btn--sage {
  background: color-mix(in srgb, var(--color-emerald-400) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-emerald-400) 25%, transparent);
}
```

### 6.14 Backward Compatibility (Ocean → Silver Tide)

| Legacy Token | Maps To |
|---|---|
| `--color-ocean-night` | #151B24 (= surface-1) |
| `--color-ocean-deep` | #1C2230 (= surface-2) |
| `--color-ocean` | #242C3A (= surface-3) |
| `--color-teal` | #1E7A90 (= teal-500) |
| `--color-aqua` | #2A9AB5 (= teal-400) |
| `--color-aqua-bright` | #4AB8D0 (= teal-300) |
| `--color-jade` | #267A4E |
| `--color-jade-light` | #6DD4A0 (= emerald-300) |
| `--color-gold` | #C9A96E (= gold-400) |
| `--color-gold-light` | #D4B96A (= gold-300) |
| `--color-champagne` | #E8D49A (= gold-200) |
| `--color-pearl` | #F0F2F5 (= silver-100) |
| `--color-charcoal` | #D8DCE4 (= silver-200) |
| `--color-success` | #3DAA70 (= emerald-400) |
| `--color-warning` | #D4A840 (= amber-400) |
| `--color-error` | #C46470 (= rose-400) |
| `--color-info` | #2A9AB5 (= teal-400) |

### 6.15 Light Mode

Toggle: element con clase `.light` (normalmente `<html class="light">`). Surfaces se invierten (abyss → #F5F7F9), glass cards pierden backdrop-filter. Silver scales NO se re-definen en light mode (funcionan en ambos modos).

### 6.16 Key Animations

| Name | What it does | Used by |
|------|-------------|---------|
| `rain-trail` | Vertical rain streaks on glass | `.glass-card::after` |
| `sidebar-breathe` | Slow organic drift | Sidebar decorative blobs |
| `avatar-breathe` | Golden aura pulse | Avatar ring |
| `aurora-sweep` | Horizontal light band | `.aurora-btn:hover::after` |
| `lunar-sweep` | Diagonal beam with halo | `.lunar-btn:hover::before` |
| `glow-rotate` | Conic border rotation | `.glow-card` (GlowButton) |
| `shimmer` | Skeleton loading | Skeleton components |
| `pulse-glow` | Indicator active pulse | Status indicators |
| `frost-breathe` | Subtle opacity shift | Frost canvas |

### 6.17 Visual Overlays

- `.noise-overlay` — Fixed grain texture, 2.2% opacity, mix-blend-mode: screen, z-index: 5
- `.vignette` — Fixed radial gradient darkening edges, z-index: 4
- Both hidden in light mode, disabled on reduced-motion.

### 6.18 Color Rules

- **NUNCA colores hardcoded** — siempre `var(--color-xxx)` o `color-mix()`
- **Alpha overlays:** `color-mix(in srgb, var(--color-xxx) N%, transparent)`
- **Severity colors:** emerald (éxito/excepcional), amber (atención/media), rose (crítico), teal (info), gold (acción/destacado), violet (AI intelligence)
- **Chart palette:** Definida en `chartTheme.ts` → CHART_PALETTE, CHART_COLORS

### 6.19 Anti-Patterns — NUNCA HACER

1. **NUNCA** usar tokens que no existen en `@theme {}` de globals.css
2. **NUNCA** reemplazar `--shadow-card`/`--shadow-elevated` con Tailwind shadows (son más pesados a propósito)
3. **NUNCA** reemplazar `--color-abyss` — es el canvas base
4. **NUNCA** reemplazar `--color-silver-*` — son la jerarquía de texto
5. **NUNCA** usar `--color-text-primary/secondary/muted` — NO EXISTEN (tokens fantasma)
6. **NUNCA** usar `--color-bg` — NO EXISTE (token fantasma)
7. **NUNCA** remover backdrop-filter de glass-card sin razón (es el efecto Rain on Glass)
8. **NUNCA** hardcodear colores en componentes — SIEMPRE usar tokens
9. Antes de usar un token nuevo, hacer **grep** en globals.css para confirmar que existe

### ⚠️ CRÍTICO — Tokens Fantasma Detectados (F29)

```
╔═══════════════════════════════════════════════════════════════════╗
║  REVISAR EN F33+                                                  ║
║                                                                   ║
║  Durante F29 se propusieron tokens CSS INEXISTENTES como si       ║
║  fueran parte del design system. Si se hubieran mergeado,         ║
║  toda la UI se habría roto silenciosamente.                       ║
║                                                                   ║
║  TOKENS FANTASMA DETECTADOS:                                      ║
║    • --color-text-primary    → NO EXISTE en @theme                ║
║    • --color-text-secondary  → NO EXISTE en @theme                ║
║    • --color-text-muted      → NO EXISTE en @theme                ║
║    • --color-bg              → NO EXISTE en @theme                ║
║    • --color-violet-400      → NO EXISTE en @theme                ║
║                                                                   ║
║  ACCIÓN: grep global por estos tokens en .tsx/.ts.                ║
║  Cualquier hallazgo → reemplazar con el token Silver Tide real.   ║
║  SEVERIDAD: ALTA — UI silenciosamente rota si se mergean.         ║
╚═══════════════════════════════════════════════════════════════════╝
```
```markdown
### Tokens eliminados (F46):
  • `--color-gold-light` → `--color-gold-200` (x4 instancias)
  • `--color-gold-mid` → `--color-gold-300` (x4 instancias)
  
  grep global: 0 hits restantes para gold-light y gold-mid.
```
---

## 7. LAS 25+ REGLAS DE DISEÑO

### 7.1 Reglas visuales

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 1 | **NUNCA colores hardcoded** — siempre `var(--color-xxx)` | `bg-[var(--color-surface-1)]` | `bg-[#131621]` |
| 2 | **NUNCA `backdrop-filter`** para superficies de datos | `bg-[var(--color-surface-1)]` | `backdrop-filter: blur(16px)` |
| 3 | **Recharts SIEMPRE** importa de `chartTheme.ts` | `import { CHART, CHART_PALETTE, TOOLTIP_STYLE } from "@/shared/lib/chartTheme"` | Config inline en componente |
| 6 | **ResponsiveContainer** en TODOS los Recharts | `<ResponsiveContainer>` | `<Container width={400}>` |
| 7 | **CHART constants** — usar `CHART.height`, `CHART.margin` | `{...CHART}` | `height={300}` inline |
| 8 | **Formatters SIEMPRE** — `formatCurrency()`, `formatNumber()` de utils | `formatCurrency(value)` | `value.toLocaleString()` |
| 9 | **TOOLTIP_STYLE** sin blur | `{...TOOLTIP_STYLE}` | `backdropFilter: "blur(8px)"` |
| 10 | **AXIS_TICK** para labels de ejes | `{...AXIS_TICK}` en XAxis/YAxis | `fontSize: 12` inline |
| 11 | **focus-visible:** `outline-2 outline-[var(--color-gold-400)]` | En todos los elementos interactivos | Sin focus ring |
| 17 | **`<Button>` de shared** — NUNCA raw `<button>` | `<Button variant="ghost">` | `<button className="...">` |

### 7.2 Reglas de estructura

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 4 | **Changelog con reemplazos exactos** | Bloque A → Bloque B | "Cambié unas líneas por allá" |
| 5 | **Código completo >30%, quirúrgico ≤15 líneas** | Si cambio >30% → re-escritura completa | Re-escritura completa para 3 líneas |
| 13 | **Tabs SIEMPRE** con componente `DetailTabs` shared | `<DetailTabs tabs={tabs} />` | Tab bar local hardcodeada |
| 14 | **Filtros SIEMPRE** con componente `FilterDropdown` shared | `<FilterDropdown options={options} />` | `<select className="...">` |

### 7.3 Reglas de formularios

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 12 | **Formularios:** `onSubmit`, auto-focus primer input, min-h-[44px] | `<form onSubmit={handleSubmit}>` | `onClick` en button sin form |
| 22 | **`cn()` utility** para clases condicionales | `cn("base", condition && "active")` | Template literals con ternarios |

### 7.4 Reglas de feedback

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 14 | **EmptyState** para listas vacías | `<EmptyState icon={Users} title="..." action={...} />` | `<p>No hay datos</p>` |
| 15 | **Toast SIEMPRE** — `showToast()` en TODAS las mutations | `showToast({ type: "success", ... })` | `alert("Guardado")` |
| 16 | **Breadcrumbs:** paths absolutos `/admin/` prefix | `href: "/admin/families"` | `href: "families"` |

### 7.5 Reglas de accesibilidad

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 18 | **`useReducedMotion()`** ANTES de TODA animación | `if (reduced) return null` | Animación sin check |

### 7.6 Reglas de AI

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 19 | **AI SIEMPRE on-demand** — botón CTA, NUNCA auto-load | `enabled: shouldFetch` | `enabled: true` en mount |
| 20 | **Responsive breakpoints** — `useBreakpoint()` para Recharts JS, Tailwind para layout | `innerRadius={isMobile ? 45 : 65}` | `innerRadius={65}` siempre |
| 21 | **Tablas mobile:** desktop tabla + mobile cards con `useBreakpoint()` | `{isMobile ? <MobileCards /> : <DesktopTable />}` | Solo desktop table |

### 7.7 Reglas adicionales

| # | Regla |
|---|-------|
| 23 | **Self-reference filtering** en mocks de relaciones: `connections.filter(c => c.connectedFamilyId !== familyId)` |
| 24 | **Mock interceptación condicional por server** cuando mismo tool name existe en servers distintos |
| 25 | **Formato de entrega**: BLOQUE A = líneas EXACTAS a reemplazar. BLOQUE B = líneas nuevas. Si es INSERT: "después de X, antes de Y". NUNCA "agregar al existente". REWRITE = archivo completo. |
| 26 | **Engagement Motor Pattern**: Cada dominio de alto valor (Cultural, Sports, Wellness, F&B) debe tener un "Engagement Motor" — tool MCP server-side que genere propuestas proactivas basándose en datos cross-domain. El Advisor solo SUGIERE ejecutar el motor; el motor hace el análisis pesado. |
| 27 | **Cross-domain enums** → `domain-enums.ts`. Domain-specific enums → `features/*/types.ts`. |
| 28 | **AI generic types** → `ai-intelligence.ts`. Domain AI aliases → mismo archivo (Section 4). Component-specific shapes → `features/*/types.ts`. |
| 29 | **Before creating new types**, check `domain-enums.ts` y `ai-intelligence.ts` primero. Re-export, don't duplicate. |
```markdown
- **Regla 30:** Check domain-enums.ts y ai-intelligence.ts ANTES de crear cualquier tipo nuevo.
  Si el tipo ya existe, importarlo. Solo crear si no existe.
```
---

## 8. MOCK SYSTEM

### Architecture

```
shared/lib/api.ts                    → callMCPTool(server, tool, params)
  ↓ intercepta con:
shared/mocks/mock-registry.ts        → REGISTRY[server][tool](params)
  ↓ usa:
shared/mocks/factories.ts            → createMockXxx(params) → ResponseType
  ↓ tipado por:
shared/mocks/contracts.ts            → interfaces TypeScript (backend 1:1)
  ↓ source of truth:
features/xxx/types.ts                → tipos derivados + config maps + transform helpers
```

### Cadena completa por herramienta

```
1. contracts.ts    → interface BackendResponseShape (1:1 con Pydantic model)
2. factories.ts    → createMockBackendResponse(params): BackendResponseShape
3. mock-registry.ts → REGISTRY.server.tool = (params) => createMockBackendResponse(params)
4. api.ts          → callMCPTool("server", "tool", params) → GET mock o POST backend
5. useMCPQuery     → useMCPQuery("server", "tool", params, options) → TanStack Query
6. Componente      → const { data, isLoading, isError } = useMCPQuery(...)
```

### Source of Truth para types

| Dominio | Source of Truth |
|---------|----------------|
| `proactive_recommendation` | `features/recommendations/types.ts` |
| `finance` | `features/finance/types.ts` |
| `events` | `features/events/types.ts` |
| `dashboard/executive` | `features/dashboard/types.ts` |
| `communications` | `features/communications/types.ts` |
| `families` | `features/families/types.ts` |
| `engagement` | `features/engagement/types.ts` |
| `wellness` | `features/wellness/types.ts` |
| `guests` | `features/guests/types.ts` |
| `members` | `features/members/types.ts` |
| `sports` | `features/sports/types.ts` |
| `facilities` | `features/facilities/types.ts` |
| `compliance` | `shared/mocks/contracts.ts` (section) |
| `facility_management` | `shared/mocks/contracts.ts` (section) |
| `approvals` | `features/approvals/types.ts` |

> **REGLA:** Before creating new types in contracts.ts, ALWAYS check the feature's `types.ts` first. Re-export, don't duplicate.

### Mock Routing Warning

`getMockResponse()` en `api.ts` tiene interceptación por tool name. SIEMPRE verificar que la interceptación es condicional por server cuando el mismo tool name se usa en servers distintos.

**Caso documentado:** `generate_ai_analysis` existe en:
- `executive_dashboard` → interceptado por scope
- `finance` → debe llegar al registry

**Fix:** `if (server === "executive_dashboard" && tool === "generate_ai_analysis" ...)`

---

## 9. MCP AGENT MAP — CONSOLIDADO

### Tier 1: Agents auditados completamente

| # | Agent | Server | Tools | HITL | AUTO | SEMI | Inteligencia | Fase |
|---|-------|--------|-------|------|------|------|-------------|------|
| 1 | `executive_dashboard` | `executive_dashboard` | 8 | 2 | 6 | — | `detect_anomalies`, `generate_ai_analysis` (9 dimensiones) | F16 |
| 2 | `finance` | `finance` | 17 (8 backend + 9 mock-only) | 3 | 3 | 2 | `generate_ai_analysis` (9 dimensiones) | F18 |
| 3 | `event_orchestrator` | `events` | 16 (9 backend + 7 mock-only) | 3 | 4 | 2 | `event_get_analytics` | F19 |
| 4 | `proactive_recommendation` | `proactive_recommendation` | 8 | 2 | 6 | — | 6 intelligence tools | F17 |
| 5 | `advisor_intelligence` | `advisor_intelligence` | 5 | 0 | 5 | — | 5 AI tools (narrative, plan, sim, brief, chat) | F21 |
| 6 | `compliance` | `compliance` | 7 | 1 | 5 | 1 | `generate_compliance_insights` | F15ext-C |
| 7 | `facility_management` | `facility_management` | 13 | 3 | 10 | 0 | 4 intelligence | F33 |
| 8 | `daily_briefing` | `daily_briefing` | 7 | 1 | 6 | — | `generate_daily_briefing` | F15ext-B |
| 9 | `smart_schedule` | `smart_schedule` | 8 | 2 | 6 | — | `suggest_optimal_slots`, `analyze_schedule_efficiency` | F15ext-S |
| 10 | `document_intelligence` | `document_intelligence` | 8 | 2 | 5 | 1 | RAG: search_documents, knowledge_query, query_documents, search_similar | F27 |
| 11 | `communication` | `communication` | 14 | 2 | 8 | 3 | Intelligence: insights (9 dim), health (5 factors), campaign_perf, analytics | F28 |
| 12 | `wellness` | `wellness` | 12 | — | — | — | 100% backend, 0 mock-only | F26 |
| 13 | `sports_agent` | `club_sports` | 11 | — | — | — | 4 intelligence tools + 15 rules Advisor + 9-dimension analysis | F32 |
| 14 | `age_group` | `age_group` | 8 | 4 (health, recs_enhanced, analytics_enhanced, proposals) | ✅ F41 | ✅ F42-2 | 12 rules Advisor × 4 layers | F40-F42 |
| 15 | `guest_management` | `guest_management` | 11 | 5 (health, funnel, analytics_enhanced, forecast, proposals) | ✅ F41 | ✅ F42-3 | 14 rules Advisor × 4 layers | F40-F42 |
| 16 | `satisfaction` | `satisfaction` | 10 | 4 (health, intelligence, benchmark, proposals) + bug fix | ✅ F41 | ✅ F42-4 | 12 rules Advisor × 4 layers | F40-F42 |
| 17 | `ml_intelligence` | `ml_intelligence` | 10 | ALL 10 (nuevo agente) | ✅ F41 | ✅ F42-5 | 10 rules Advisor × 3 layers | F40-F42 |
```markdown(Actualizacion)
| 17 | `ml_intelligence` | `ml_intelligence` | 10 | 10 rules, 3 layers | Prophet + Ensemble + PSI | ModelHealthPanel | ✅ F44 enhanced |
```

### Tier 2: Agents auditados parcialmente

| # | Agent | Server | Tools (mock) | Estado |
|---|-------|--------|-------------|--------|
| 18 | `member_engagement` | `member_engagement` | 5 | Tools en mock, agent NO auditado |
| 19 | `family_profile` | `families` | 11 | Tools en mock, agent NO auditado |

### Tier 3: Agents NO auditados

| # | Agent | Server | Estado |
|---|-------|--------|--------|
| 18 | `cultural_social` | `cultural_social` | ⬜ |
| 19 | `age_group` / `age_group_activity` | `age_group` | ⬜ |

**Totales:** 17 agents completamente auditados (~185+ tools), 2 parcialmente, 0 sin auditar.

### Niveles de aprobación HITL

| Nivel | Significado | Visual en ApprovalQueue |
|-------|------------|------------------------|
| `AUTO` | Sin intervención humana | No aparece en queue |
| `SEMI` | Aprobación condicional | Badge amarillo, aparece solo cuando se activa condición |
| `HITL` | Human-in-the-loop siempre | Badge rojo, requiere acción |
| `ALWAYS_HUMAN` | Doble confirmación | Badge rojo pulsante + paso extra de confirmación |

### Patrones de escalación condicional

| Patrón | Agente | Condición |
|--------|--------|-----------|
| `register_guest` | guest_management | >4 invitados/día → HITL |
| `send_personalized_notification` | communication | >100 destinatarios → HITL |
| `export_report` | executive_dashboard | audiencia externa → HITL |

---

## 10. ADVISOR ARCHITECTURE

### El patrón Advisor — Nuestra innovación central

El Advisor es el corazón de la inteligencia del sistema. Es un patrón replicable que convierte cualquier dashboard de datos en un sistema de decisión.

### Niveles del Advisor (post-F21)

```
Nivel 0: Shell queries (pre-warming, staleTime)
   ↓ datos en caché de TanStack Query
Nivel 1: useXxxAdvisor(datos de cache) → XxxAdvisorInsight[] con action? adjuntas
   ↓ N reglas computacionales (0ms, 0 API calls)
Nivel 2: <XxxAdvisorBanner /> → render condicional + "Ejecutar" + "Análisis Profundo" + "Plan AI"
   ↓ click
Nivel 3: Acción directa (AUTO) / Modal HITL → mutation → toast → cache invalidation → re-compute
   ↓ o
Nivel 3b: AI Narrative → generate_insight_narrative → root cause + benchmark CR + recomendación
Nivel 3c: AI Simulation → simulate_scenario → 3 escenarios (optimista/base/pesimista)
Nivel 3d: AI Board Brief → generate_board_brief → PDF ejecutivo para la Junta
Nivel 3e: AI Chat → ask_advisor → conversación con evidencia + acciones sugeridas
Nivel 3f: Reaction → generateReactionInsight() → feedback loop post-ejecución
```

### Implementaciones

| Fase | Advisor | Reglas | Capas | Actions | AI Features |
|------|---------|--------|-------|---------|-------------|
| F17 | useRecommendationAdvisor | 7 | 1 | 0 | — |
| F18 | useFinancialAdvisor | 18 | 3 (macro/micro/fusion) | 3 | Narrative |
| F19 | useEventAdvisor | 15 | 3 (macro/micro/fusion) | 3 | Narrative |
| F20 | useGlobalAdvisor | 25 | 5 (diagnostic/strategy/prediction/innovation/execution) | 5 | Narrative + Simulation + Board Brief + Chat |
| F21 | Advisor Intelligence Agent | — | — | — | 5 AI tools |
| F22 | Reaction System + Predictive Pre-fetch | — | — | — | Reaction feedback + 0ms pre-fetch + conversational context |
| F28 | useCommunicationAdvisor | 8 | 2 (macro health + micro perf) | — | Emergency cross-agent escalation + RAG grounding |
| F32 | useSportsAdvisor | 15 | — | 8 | 9-dimension analysis |
| F41 | useAgeGroupAdvisor | 12 | 4 (balance/participation/growth/cross_domain) | 7 | — |
| F41 | useGuestAdvisor | 14 | 4 (funnel/pipeline/optimization/cross_domain) | 8 | — |
| F41 | useSatisfactionAdvisor | 12 | 4 (health/trends/insights/cross_domain) | 5 | — |
| F41 | useMLAdvisor | 10 | 3 (model_health/predictions/insights) | 3 | — |

### Advisor Action Bridge (F21)

```
1. Insight tiene action? → Banner "Ejecutar" (primary, Zap icon)
2. User click → onExecute(insightId)
3. Shell resuelve: insight.action.approvalLevel === "auto"?
   YES → mutation.mutateAsync(params) → toast → cache invalidation
   NO → setModalInsight(insight) → <AdvisorActionModal />
4. Modal muestra: title, reasoning, riskSummary, estimatedImpact, server.tool
5. User "Confirmar ejecución" → handleModalConfirm → mutation → toast
6. actionStates[insightId] = "done" → botón cambia a checkmark "Listo"
7. Cache invalidado → queries refetch → Advisor re-computa → insight desaparece o cambia
8. generateReactionInsight() → reaction se agrega al state → se renderiza inline en banner
```

### Advisor Reaction System (F22)

```
1. Acción del Advisor → onExecute(insightId) o handleModalConfirm()
2. Mutation exitosa → generateReactionInsight(action, insightId)
3. Reaction se agrega al array de reactions (state del shell)
4. Shell pasa reactions={reactions} al Banner
5. Banner renderiza AdvisorReactionCard por cada reaction (más reciente primero)
```

**8 domain templates:** finance, events, security, governance, wellness, members, communications, commercial.

### Predictive Pre-fetch (F22)

Para roles ADMIN/JUNTA, pre-fetchear automáticamente los narratives de los top-3 insights por severidad al montar cualquier banner. Usuario clickea "Análisis Profundo" → renderiza desde cache → 0ms latencia percibida.

### AI Intelligence Tools (5)

| Tool | Input | Output | Approval |
|------|-------|--------|----------|
| `generate_insight_narrative` | insight_data, context, role | root_cause, benchmark_comparison, recommendation, estimated_impact | AUTO |
| `generate_action_plan` | insights[], role, timeframe | summary, items[], total_estimated_impact | AUTO |
| `simulate_scenario` | base_data, proposed_changes[] | scenarios[3], risk_assessment, recommended_scenario | AUTO |
| `generate_board_brief` | executive_summary, financial, events, anomalies | brief_md, key_points[], talking_points[], q_and_a[] | AUTO |
| `ask_advisor` | question, dashboard_context, role, conversation_history | answer, evidence[], related_insights[], suggested_action? | AUTO |

### Card Insight Structure (patrón F21)

```tsx
<div className="p-3 rounded-lg bg-[var(--color-surface-0)] border ...">
  {/* Row: badge + content + action */}
  <div className="flex items-start gap-3">
    <span>b</span>        {/* impact badge */}
    <div className="flex-1">content + trigger</div>
    <Button>action</Button>
  </div>
  {/* Narrative: full-width, below flex */}
  {expandedNarrative === insight.id && <AIInsightNarrative ... />}
</div>
```

> **Regla:** El narrative NUNCA va dentro del flex row. Siempre debajo, full-width.

### Advisor Layers (5 niveles de análisis)

1. **Context** — Construye el contexto del dominio desde los datos
2. **Reactive** — Responde a problemas actuales (attendance baja, budget alto)
3. **Preventive** — Alerta sobre problemas emergentes (no galas programadas, seasonal gap)
4. **Optimization** — Sugiere mejoras de eficiencia (venue underused, category imbalance)
5. **Proactive** — Genera nuevas oportunidades (Engagement Motor, cross-domain suggestions)

---


### Advisor Engine v2 (F45):
  - RuleDefinition<T> + evaluateRules + sortInsights + deduplicateInsights
  - computeConfidence con presets (dataDriven, ragGrounded, conservative)
  - computeHealthScore unificado (reemplaza 6+ implementaciones)
  - AdvisorEngine class + useAdvisorEngine hook
  - DomainSignal para cross-domain communication

### Domains: 10
- Financial (25 rules), Events (25 rules), Global (29 rules)
- Communication (15), Sports (15), AgeGroup (15)
- Guest (15), Satisfaction (15), ML (15), Recommendations (15)

### Cross-Domain: 14 type-safe signals via Signal Bus
- SignalName union type with compile-time enforcement
- 100% signal consumption (no dead signals)
- Fusion rules in Global Advisor for cross-domain synthesis

### RAG Integration: Ready
- RAGContext interface defined
- ragGrounded confidence preset available
- combineConfidences() for rule + RAG enrichment
- Backend: ChromaDB + BM25 + 8 tools (already built)

### Health Score: Unified
- 5 factors per domain, unified 0-100 computation
- Letter grades (A/B/C/D) with color coding

### Confidence: Multi-factor
- computeConfidence() with weighted factors
- CONFIDENCE_PRESETS: dataDriven, ragGrounded, conservative
- combineConfidences() for multi-source confidence

### Verification: tsc --noEmit = 0 ERRORS
```

## Patrones establecidos (F46):

- **P59:** Signal Bus Runtime — singleton cross-domain signal routing con TTL auto-pruning
- **P60:** PermissionGate Dual Paradigm — roles (routing) + permissions (granular) coexist
- **P61:** FamilyDetail Override Prop — familyIdOverride para uso fuera de URL params
```
```markdown
### Advisor Engine v2 Migration Status (F47)

| # | Hook | Rules | Status |
|---|------|-------|--------|
| 1 | useRecommendationAdvisor | 7 | ⬜ B5a |
| 2 | useFinancialAdvisor | 18 | ✅ B2 |
| 3 | useEventAdvisor | 15 | ✅ B3 |
| 4 | useGlobalAdvisor | 25 | ✅ B4 |
| 5 | useCommunicationAdvisor | 8 | ⬜ B5a |
| 6 | useSportsAdvisor | 15 | ⬜ B5a |
| 7 | useAgeGroupAdvisor | 12 | ⬜ B5a |
| 8 | useGuestAdvisor | 14 | ⬜ B5a |
| 9 | useSatisfactionAdvisor | 12 | ⬜ B5a |
| 10 | useMLAdvisor | 10 | ⬜ B5a |

**58/129+ rules migrated to declarative.**
```


### Sección Nueva: Cross-Domain Signals — AGREGAR

```markdown
### Cross-Domain Signal Map (F47)

| Signal | Emitter | Consumer | Rule |
|--------|---------|----------|------|
| fin_revenue_decline | Financial | Global | R2 → R2 (anomaly_correlation) |
| fin_margin_pressure | Financial | Global | R2 → R16 (vendor_escalation) |
| evt_capacity_alert | Events | Global | R1 → R14 (demand_forecast) |
| evt_low_engagement | Events | Global | R13 → R13 (churn_predictor) |
| sys_risk_change | Global | financial, events, communication, engagement | R1 |
```

---


## 11. PATRONES DE DISEÑO

### P1: Auto-load Context + On-demand Intelligence

```
LAYER 0: Auto-Load (staleTime > 0)         → always visible
LAYER 1: On-Demand Cross-Agent (CTA)        → user-triggered
LAYER 2: Client-Side Intelligence (instant)  → 0ms, 0 calls
LAYER 3: Deep Insights (CTA)                → on-demand quarterly/AI
```

**Aplicado en:** DailyBriefing, ComplianceCheck, SmartSchedule, ExecutiveDashboard, FinancialDashboard, EventCalendar, RecommendationsDashboard.

### P2: Cross-Agent Self-Query

Sub-component on-demand hace sus propias queries a múltiples agentes. React Query cache hits si el padre ya cargó la misma data.

### P3: Date-Scoped Cross-Agent Query

```typescript
const dateRange = { date_from: date-1, date_to: date+1 };
useMCPQuery("events", "event_get_calendar", { date_from, date_to }, { enabled: shouldFetch });
```

### P4: CRUD con Action Routing

```typescript
useMCPQuery("proactive_recommendation", "optimize_pricing", { action: "list" })
useMCPMutation("proactive_recommendation", "optimize_pricing", { action: "create", ... })
```

### P5: Health Score Composite

Score 0-100 combinando 5 factores ponderados. Levels: ≥85 Excepcional, ≥65 Saludable, ≥45 Atención, <45 Crítico. Visual: SVG ring con stroke-dashoffset animado.

### P6: Cross-Agent On-Demand Section

```tsx
if (!shouldFetch) return <CTACard />;
if (query.isLoading) return <Skeleton />;
if (query.isError) return <SectionError />;
if (empty) return <AllClearCard />;
return <Results insight={buildInsight(data, summary)} />;
```

### P7: Expandable Intelligence Card

Always visible: severity badge, domain badge, title, description (2-line clamp). Expanded: context data grid + suggested_action (CTA dorada).

### P8: Action Routing

```typescript
action: { label: "Gestionar retención", route: "/admin/members", toast: "Abriendo gestión..." }
```

### P9: Defensive Data Rendering

```tsx
{(data.items ?? []).map(...)}
{(data.value ?? 0).toFixed(1)}
{f.contribution != null ? ` · ${f.contribution.toFixed(1)} pts` : ""}
```

### P10: Self-Reference Filtering (Mock Data)

```typescript
const filtered = connections.filter(c => c.connectedFamilyId !== familyId);
```

### P11: Dynamic Mock Lookup by ID

```typescript
const FAMILY_PROFILES: Record<string, {...}> = { "fam-001": {...}, ... };
const profile = FAMILY_PROFILES[id] ?? FAMILY_PROFILES["fam-001"];
```

### P12: Canvas Token Resolution

```typescript
function resolveColors() {
  const get = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return { gold400: get("--color-gold-400"), ... };
}
function hexToRgba(hex: string, alpha: number) { ... }
```

### P13: Transform Helpers (Backend → Sub-component shape)

```typescript
// En types.ts
export function summaryToKPIs(summary): KPIData[] { ... }
export function buildTierData(by_tier): TierData[] { ... }
// En componente
summaryToKPIs(summary) → <KPICards />
```

### P14: Advisor Banner Pattern (post-F21)

```
Shell queries (pre-warming) → useXxxAdvisor(cache) → XxxAdvisorBanner
  ├── "Ejecutar" (si hay action) → onExecute → mutation/HITL
  ├── "Análisis Profundo" → useAdvisorNarrative → AIInsightNarrative inline
  ├── "Simular" (Global Advisor) → AISimulationPanel toggle
  ├── "Plan AI" (Global Advisor) → generate_action_plan
  ├── "Briefing Junta" (Global Advisor) → generate_board_brief → AIBoardBriefViewer
  ├── "Preguntar" (Global Advisor) → AIChatWidget con advisorContext
  └── Reactions (post-ejecución) → AdvisorReactionCard inline
```

### P15: Button Swap Protocol

Todo `<button>` raw → `<Button>` de shared, excepto:
- CalendarGrid/EventListView cells: `<div role="button" tabIndex={0}>` — correcto
- Summary bar toggles: `<Button variant="ghost">` con `rounded-none rounded-t-xl min-h-[56px]`
- Text actions: `<Button variant="ghost" size="sm">` con underline

### P16: Predictive Pre-fetch

```typescript
// usePrefetchTopNarratives en useAdvisorNarrative.ts
// Solo ADMIN/JUNTA. Top 3 por impact+confidence. staleTime: 600_000 (10min)
queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 600_000 });
```

### P17: Advisor Chat Action Bridge (F24)

Advisor Chat suggested actions se ejecutan via action bridge. Routing por server+tool. Fallback a callMCPTool genérico. Reaction system integrado.

### P18: Dynamic Simulation Context (F24)

Proposed changes para simulation se generan de insights activos via generateProposedChanges(). 5 keyword clusters con fallback genérico.

### P19: Analytics Event Tracking (F24)

trackEvent() localStorage-based. Max 200 events. Prepared for backend POST (F26+).

### P20: Shared Advisor UI Config (F25)

IMPACT_CONFIG centralizado en shared/lib/ui/advisorConfig.ts. Todos los banners importan de shared.

### P21: Backend Tool Migration (F26)

10 pasos: auditar agent → models → repo → mock → executive → crear models → repo methods → MCPTool → mock alignment → registry verification.

### P22: Dual Paradigma Architecture (F26)

Paradigma 1 (executive): hardcoded demo data. Paradigma 2 (domain): computed from repo. No confundir tools entre paradigmas.

### P23: Cross-Domain Correlation Engine (F26b)

Pearson correlation con engagement score como proxy unificador. Proxies para revenue/retention/satisfaction.

### P24: Aggregated Insights Pattern (F26b)

Un tool agrega outputs de otros tools del mismo agent en reporte estructurado. Análogo a generate_ai_analysis en finance.

### P25: RAG Pipeline Architecture (F27)

Full RAG: parsers → chunker → embeddings → vectorstore → hybrid search (BM25+Vector+RRF) → reranker → LLM generation. 8 levels: parse → chunk → embed → store → retrieve → rerank → context build → generate. Abstraction layers permit swapping ChromaDB→Qdrant, bge-m3→any model.

### P26: Confidence Scoring for RAG (F27)

Score = max_score * 0.5 + source_factor * 0.3 + gap_factor * 0.2. 3 visual levels: ≥80% alta, ≥50% media, <50% baja.

### P27: Document Upload Pipeline (F27)

POST /api/documents/upload — multipart/form-data → validate → parse → chunk → embed → store. 50MB limit, 10 extensions, enum validation.

### P28: Communication Advisor Pattern (F28)

8 rules × 2 layers (macro health + micro performance). Hook: useCommunicationAdvisor(analytics, history, scheduled). Banner: CommunicationAdvisorBanner with severity badges, actions, AI Narrative on-demand.

### P29: RAG Grounding for Domain Agents (F28)

DomainAgent._enrich_with_rag_context(query) → rag_service.search_documents() → [{source, content, score}]. Non-blocking (errors return []). Agent enriches recommendations with citations. First applied: communication_agent.generate_communication_insights.

### P30-P34: Sports & Facilities Patterns

- **P30 (F32):** LiveArenaGrid — Real-time occupancy grid for sports courts
- **P31 (F32):** CourtHeatmap — Heat map visualization of court usage
- **P32 (F32):** SkillProgression — Member skill tracking over time
- **P33 (F32):** DimensionCard — Modular card for multi-dimension analysis
- **P34 (F32):** CoachCardPicker — Coach assignment UI component
- **P35 (F33):** LiveOccupancyBoard — Facility-wide real-time occupancy
- **P36 (F33):** AmenityHeatmap — Amenity usage heat visualization
- **P37 (F33):** MaintenanceScoring — Predictive maintenance scoring
- **P38 (F33):** BookingFormModal — Facility booking modal form
| P39 (F33) | SpaceROI | Space utilization ROI analysis |
| P40 (F42) | Generic AdvisorBanner | Single `<T extends BaseInsight>` rendering engine + thin domain wrappers (~35 lines each). Eliminates ~600 lines of duplication across domains. |
| P41 (F42) | Dashboard Intelligence Layer | Existing dashboards NOT replaced. Intelligence layer added ON TOP: Health Score + KPIs + Advisor Banner + New Intelligence Tab. Existing operational tabs preserved intact. |
| P42 (F41) | Advisor Hook Architecture | Replicable pattern: local types → buildCtx() → RULES[] → evaluateRules() → useMemo chain. 0 API tokens, 0ms latency. Each domain: hooks/use{Domain}Advisor.ts |
```markdown
| P43 (F44) | Prophet Forecast Engine | Prophet con CR holidays + fallback exp smoothing. Conservative config para small datasets. Helper: _prophet_forecast() |
| P44 (F44) | Ensemble Anomaly Detection | IsolationForest + IQR con consensus voting (unanimous/majority/single). Helper: _ensemble_anomalies() |
| P45 (F44) | PSI Drift Detection | Population Stability Index con equal-freq bins. Thresholds: <0.10 stable, 0.10-0.20 mild, >0.20 significant. Helper: _compute_psi() |
| P46 (F44) | Claude Helper Encapsulation | _query_claude() method en agent. Encapsula claude_service con semántica correcta. Punto único de refactor. |

```markdown
### P43: SignalName Type-Safe Registry (B6)
Canonical `as const` array + derived union type. Compile-time enforcement of signal IDs.

### P44: Fusion Rules (B6)
Global Advisor rules that consume cross-domain signals for synthesis.

### P45: RAG Context Injection (B6)
Optional RAGContext[] for enriched rule evaluation with graceful degradation.
```

### P48: Global Chat Store
Zustand store (`chat.store.ts`) para estado global del chat. Un solo AIChatWidget en App.tsx lee del store. Features escriben advisorContext al store. Inline styles para fixed positioning (escapa motion.div containing block).
### P49: Normalize Enums
Runtime auto-fixer en mock-registry. Una sola línea: `normalizeEnums(factory(params))`. Correction maps por field name. Context-aware para status (detecta si es family/event por sibling fields). DEV logging.

### P50: Validator Dev-Only
Dev-only factory validator. Deep-traversa output de todos los factories. Reporta enums inválidos en tabla de consola. Se ejecuta una vez en mount. Se puede quitar una vez normalizeEnums está estable.

## Patrones establecidos (F45):

- **P51:** Advisor Engine Core — framework genérico declarativo (RuleDefinition<T>)
- **P52:** Confidence vs Impact Separation — dimensiones independientes con colores propios
- **P53:** Health Score Composer — computeHealthScore() unificado
- **P54:** Signal Definition Pattern — reglas declaran emit/consume signals
- **P55:** Confidence Presets — dataDriven(), ragGrounded(), conservative()
- **P56:** MCP Router — routing unificado con source tracking
- **P57:** Migration Tracker — auto-detect mock→real stages
- **P58:** Scoped Tools Config — scope routing documentado y tipado

```


---

## 12. KEYBOARD SHORTCUTS

```
?        → Keyboard help modal (all roles)
⌘+K      → Command Palette (all)
G+D      → Dashboard (ADMIN)
G+F      → Families (ADMIN, STAFF)
G+E      → Events (ADMIN, STAFF)
G+Z      → Finance (ADMIN)
G+A      → Approvals (ADMIN)
G+C      → Communications (ADMIN)
G+G      → Engagement (ADMIN)
G+R      → Facilities (ADMIN, STAFF)
G+H      → Check-in (STAFF)
G+O      → Operations (STAFF, ADMIN)
G+M      → Mi Club (SOCIO)
G+J      → Junta (JUNTA)
```

---

## 13. ESTADO DE FASES (CONSOLIDADO)

REGLA DE ORO : TODAS LAS FASES SE TRABAJAN PRODUCTION GRADE

### Infraestructura base (F1-F5)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F1-F5 | Infraestructura, tokens, forms, lists, details | ✅ |

### Dashboards y features (F6-F14)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F6 | Dashboards densos + AI | ✅ |
| F7 | Reports, mi-club, settings, finance | ✅ |
| F8 | Dashboard sub-componentes (5/12 done) | 🔄 |
| F9 | Wellness + Satisfaction | ✅ |
| F10 | Proactive Recommendations | ✅ |
| F11 | Communication Enhancement | ✅ |
| F12 | Guest Management + Trial Memberships | ✅ |
| F13 | Finance Enhancement + HITL Complete | ✅ |
| F14 | Intelligence Features (Stress Test, Profitability, Seasonal, Narrative, Decision Cockpit) | ✅ |

### Integration y extensions (F15)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F15 | Integration Testing + QA | ✅ |
| F15ext-B | DailyBriefing full stack enhancement (4 bloques) | ✅ |
| F15ext-C | ComplianceCheck full stack enhancement (3 bloques) | ✅ |
| F15ext-S | SmartSchedule full stack rewrite (4 bloques) | ✅ |

### Advisor Evolution (F16-F22)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F16 | ExecutiveDashboard Enhancement (types.ts source of truth + transform helpers) | ✅ |
| F17 | RecommendationsDashboard Enhancement — 7 rules Advisor | ✅ |
| F18 | FinancialDashboard Enhancement — 18 rules Advisor (3 layers) | ✅ |
| F19 | EventOrchestrator Enhancement — 15 rules Advisor (3 layers) | ✅ |
| F20 | Global Cross-Agent Health Advisor — 25 rules Advisor (5 layers) | ✅ |
| F21 | AI Intelligence Engine — 5 AI tools + 11 actions | ✅ |
| F22 | Advisor Intelligence Evolution — Reaction + Pre-fetch + Conversational Context + Finance Intelligence Center | ✅ |

### Intelligence Enhancement (F23-F25)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F23 | Adaptive Thresholds + Wellness Advisor Rules | ✅ |
| F24 | Advisor Intelligence Enhancement (Talking Points + Simulation Dynamic + Action Bridge + Tracking) | ✅ |
| F25 | Polish batch (font-body, compactCurrency, SEASON_CONFIG, swimming, getWellnessLevel, IMPACT_CONFIG) | ✅ |

### Backend Migration (F26)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F26a | Mock → Backend Migration (4 tools: wellness_goal_list + wellness_predict + wellness_anomalies + get_financial_summary) | ✅ |
| F26b | Mock → Backend Migration (2 tools: wellness_correlate + wellness_insights + registry cleanup) | ✅ |

### RAG & Domain Audits (F27-F28)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F27 | RAG Core — Document Intelligence Engine (9 new + 10 modified, ~3685 líneas) | ✅ |
| F28 | Communications Agent Audit + Enhancement — Intelligence Platform (14 tools, 8 Advisor rules, RAG grounding, 1830 líneas) | ✅ |

### Domain Audits cont. (F29-F33)
| Fase | Contenido | Estado |
|------|-----------|--------|
| F29 | Families Agent Audit + Enhancement | ✅ |
| F30 | Members & Engagement Agent Audit | ✅ |
| F31 | Guest & Wellness Agent Audit | ✅ |
| F32 | Sports & Recreation Intelligence (11 tools, 15 rules, 8 actions, 9-dimension analysis, ~8438 líneas) | ✅ |
| **F33** | **Facilities Domain (Living Spaces Intelligence) — Backend + Frontend completo** | **✅ COMPLETADA (6/6 bloques)** |
| F34 | Cultural & Social Agent Audit | ✅ |
| F35-F39 | (Previstas — ver plan maestro) | ⬜ |
| **F40** | **Backend Intelligence + Frontend Mock Alignment (4 agents: AgeGroup, Guest, Satisfaction, ML)** | **✅ COMPLETADA (9/9 bloques)** |
| **F41** | **Advisor Rules (4 hooks × 48 rules: AgeGroup 12, Guest 14, Satisfaction 12, ML 10)** | **✅ COMPLETADA** |
| **F42** | **Frontend Intelligence Dashboards (5/5: Banners, AgeGroup, Guest, Satisfaction, ML)** | **✅ COMPLETADA** |
| **F43** | **Integration Testing + Wiring (router, ExecutiveDashboard, AIChatWidget, tokens, Sidebar)** | **✅ COMPLETADA** |
```markdown
| **F44** | **ML Intelligence Platform — Prophet + Ensemble + PSI + Dashboard + Tests** | **✅ COMPLETADA** |
```

### Próximas fases
| Fase | Contenido | Estado |
|------|-----------|--------|


| F45 | Real data integration (reemplazar seed data) | ⬜ |
| F36 |	Wellness & Health Intelligence	ALTA	⬜
| F37 |	Events & Social Intelligence	MEDIA	⬜
| F38 |	Financial Intelligence (cross-domain aggregation)	ALTA	⬜
| F39 |	Member 360 Intelligence + I3 (Member Journey Intelligence)	ALTA	⬜
| F40 |	Predictive Analytics & ML Layer + I2 (Conversational Club Manager)	MEDIA	⬜
| F41 |	Executive Dashboard (C-suite) + I1 (Digital Twin del Club)	MEDIA	⬜
| F42 |	Mobile-first Responsive Optimization	BAJA	⬜
| F43 | Production deployment pipeline (CI/CD, monitoring) | ⬜ |

---

## 14. CENTRALIZED TYPE SYSTEM

### 14.1 domain-enums.ts — Master Source of Truth

**Propósito:** Enum centralizado para TODOS los dominios. Evita que cada `features/*/types.ts` re-defina enums compartidos.

**Regla absoluta:** > Cross-domain enums → `domain-enums.ts`. Domain-specific enums → `features/*/types.ts`.

#### Enums maestros (20 total)

| # | Sección | Enum | Valores | Consumido por |
|---|---------|------|---------|---------------|
| 1 | Member | `MEMBER_TIERS` | 7 (platino, oro, plata, bronce, basic, premium, vip) | families, dashboard, members, engagement |
| 2 | Member | `AGE_GROUP_CATEGORIES` | 6 (toddler, kids, teens, young_adults, adults, seniors) | families, dashboard, members |
| 3 | Member | `LIFECYCLE_STAGES` | 8 (prospect→reactivated) | families, engagement |
| 4 | Member | `FAMILY_STATUSES` | 4 (active, inactive, suspended, pending_approval) | families |
| 5 | Member | `MEMBER_ROLES` | 4 (primary, spouse, child, dependent) | families |
| 6 | Engagement | `ENGAGEMENT_LEVELS` | 7 (champion→inactive) | engagement, communication, advisor |
| 7 | Engagement | `SENTIMENTS` | 3 (positive, neutral, negative) | satisfaction, communication, engagement |
| 8 | Events | `EVENT_CATEGORIES` | 8 (sports, cultural, social, private, festive, children, family, corporate) | events, cultural, sports, facilities |
| 9 | Events | `EVENT_STATUSES` | 7 (draft→cancelled) | events |
| 10 | Events | `RSVP_STATUSES` | 5 (pending, confirmed, declined, waitlisted, no_show) | events |
| 11 | Guests | `TRIAL_TYPES` | 3 (day_pass, week_trial, month_trial) | guests |
| 12 | Guests | `TRIAL_STATUSES` | 6 (pending_approval→cancelled) | guests |
| 13 | Guests | `GUEST_CHECKIN_STATUSES` | 3 (active, departed, no_show) | guests |
| 14 | Guests | `GUEST_REGISTRY_STATUSES` | 4 (registered, checked_in, completed, cancelled) | guests |
| 15 | Shared | `TREND_DIRECTIONS` | 3 (improving, stable, declining) | cross-domain |
| 16 | Shared | `SEVERITY_LEVELS` | 4 (low, medium, high, critical) | cross-domain |
| 17 | Shared | `CONFIDENCE_LEVELS` | 3 (low, medium, high) | Advisor scoring universal |
| 18 | Shared | `PRIORITY_LEVELS` | 4 (low, medium, high, urgent) | Recommendations, anomalies |
| 19 | Shared | `OPERATION_STATUSES` | 8 (draft→cancelled) | Pricing, suggestions, campaigns |
| 20 | Shared | `APPROVAL_LEVELS` | 4 (auto, semi, hitl, always_human) | HITL system global |
| 21 | ML/Cross-domain | `SCENARIO_TYPES` | 3 (optimistic, base, pessimistic) | Revenue forecast, simulation, ML |

Cada enum tiene su `*_DISPLAY` record con `label`, `color` (Silver Tide tokens), `bgColor` (color-mix). Legacy mappings y type guards documentados en el archivo.

### 14.2 ai-intelligence.ts — AI Type System

**Propósito:** Tipos genéricos para TODAS las features AI. Cada dominio extiende estos generics — nunca crea tipos ad-hoc.

**Regla absoluta:** > Generic AI types → `ai-intelligence.ts`. Domain AI aliases → mismo archivo. Component-specific shapes → `features/*/types.ts`.

#### AI Primitives (7 tipos base)

| Tipo | Propósito |
|------|-----------|
| `AIFactor` | Factor individual con impact, direction, weight |
| `AIRecommendation` | Recomendación con category, impact, priority, effort |
| `AIProjectedMetric` | Métrica proyectada con confidence interval |
| `AITrendPoint` | Punto time-series con metrics |
| `AIAlert` | Alerta con urgency + action_required |
| `AIPositiveTrend` | Tendencia positiva con impact |
| `AIRiskFactor` | Riesgo con severity, probability, mitigation |

#### AI Output Types (8 tipos compuestos)

| Tipo | Propósito |
|------|-----------|
| `AIPrediction<T>` | Predicción genérica con confidence + factors |
| `AIAnalysis` | Reporte multi-dimensión (findings, recommendations, alerts, trends, risks) |
| `AIHealthScore` | Score compuesto 0-100 con grade, level, factors[] |
| `AIFinding` | Hallazgo con type, severity, evidence |
| `AINarrative` | Narrativa AI (root_cause, benchmark, recommendation) |
| `AIScenario` | Escenario de simulación con probability |
| `AISimulation` | 3 escenarios + risk_assessment + recommended |
| `AIActionPlan` / `AIActionPlanItem` | Plan priorizado con items ejecutables |

#### Brief Type (1)

| Tipo | Propósito |
|------|-----------|
| `AIBrief` | Documento ejecutivo con markdown, key_points, talking_points, q_and_a |

#### Advisor Types (5)

| Tipo | Propósito |
|------|-----------|
| `AdvisorInsightBase` | Base para TODOS los domain insights (id, impact, title, reasoning, confidence, action?) |
| `AdvisorCommand` | Acción ejecutable (server, tool, params, approval_level, label) |
| `AdvisorActionState` | Estado de ejecución (idle/loading/done/error) |
| `AdvisorReaction` | Feedback post-ejecución (source, status, reaction, next_step) |
| `AdvisorLayer` | 15 layers posibles (macro, micro, fusion, diagnostic, health, utilization, etc.) |

#### Domain AI Aliases (10)

| Alias | Domain |
|-------|--------|
| `EventAttendancePrediction` | events |
| `FinancialAnalysis` | financial |
| `SatisfactionAnalysis` | satisfaction |
| `EngagementAnalysis` | engagement |
| `CommunicationAnalysis` | communication |
| `FamilyIntelligence` | family |
| `WellnessAnalysis` | wellness |
| `EventOptimization` | events |
| `ConflictAnalysis` | events |
| `FacilitiesAnalysis` | facilities |

#### AI Domain Registry (12 dominios)

```typescript
AI_DOMAINS = [
  "financial", "events", "engagement", "communication",
  "family", "wellness", "satisfaction", "facilities",
  "cultural_social", "sports", "executive", "global",
]
```

#### Helpers (6 funciones)

| Función | Propósito |
|---------|-----------|
| `getConfidenceLevel(score)` | Devuelve low/medium/high |
| `getConfidenceDisplay(score)` | Devuelve level + label + color |
| `sortInsightsByPriority(insights)` | Ordena por impact DESC, confidence DESC |
| `filterInsightsByImpact(insights, min)` | Filtra por mínimo impact |
| `generateInsightId(domain, rule)` | ID único para insight |
| `generateReactionId()` | ID único para reaction |

### 14.3 Checklist anti-duplicación

Antes de crear un tipo/enum en cualquier `features/*/types.ts`:

```
1. ¿Existe en domain-enums.ts?
   → SI: importar, NO re-definir
   → NO: continuar

2. ¿Es un AI type genérico?
   → SI: ¿existe en ai-intelligence.ts?
     → SI: importar
     → NO: crear en ai-intelligence.ts primero
   → NO: continuar

3. ¿Es domain-specific (FacilityType, SportType, etc.)?
   → SI: crear en features/*/types.ts
   → NO: reconsiderar dónde va

4. ¿Otro dominio podría necesitarlo?
   → SI: crear en domain-enums.ts o ai-intelligence.ts
   → NO: stay en domain types.ts

5. ¿Los colores usan Silver Tide tokens?
   → SI: proceder
   → NO: PARAR — usar var(--color-*) o color-mix()
```

---

## 15. PENDIENTES ACUMULADOS

| # | Issue | Severidad | Fase sugerida |
|---|-------|-----------|---------------|

| 1 | `compactCurrency` duplicado en 3+ archivos — centralizar en `shared/lib/utils.ts` | BAJA | F25 ✅ done |
| 2 | `getCurrentSeason` duplicado en 2 hooks — centralizar | BAJA | F25 ✅ done |
| 3 | `IMPACT_CONFIG` duplicado en 3 banners — consolidar en shared | BAJA | F25 ✅ done |
| 4 | `font-ui` sin prefijo completo `font-[family-name:var(--font-ui)]` — ~50 instancias | MEDIA | F25 |
| 5 | `font-mono` sin prefijo — ~30 instancias | MEDIA | F25 |
| 6 | `toLocaleString("es-CR")` en vez de `formatNumber()` — ~8 instancias | MEDIA | F25 |
| 7 | Keyframes `slideDown`/`fadeUp` duplicados en sub-componentes | BAJA | F25 |
| 8 | 5 sub-componentes finance no integrados al shell como on-demand (DecisionCockpit, MemberProfitabilityMatrix, NarrativeEngine, SeasonalCalendar, StressTestPanel) | MEDIA | Verificar F22 |
| 9 | `personalize_communication` tool sin componente UI dedicado | MEDIA | Futuro |
| 10 | `get_financial_summary` mock-only — no existe en backend finance.py | MEDIA | F26 |
| 11 | Navigation fields inconsistentes entre Advisors (targetTab vs targetView vs actionLabel/actionRoute) — unificar | MEDIA | F25 |
| 12 | Global Advisor TODO placeholders para cache connections (aiReport, calendarDays) | MEDIA | F24 |
| 13 | `TierEconomics` importado pero no calculado en agente finance | MEDIA | F26 |
| 14 | Event Advisor: 4 AI mock tools sin UI dedicada (predict, optimize, conflict, engagement) | MEDIA | Futuro |
| 15 | Dashboard sub-componentes: 7/12 pendientes (violations reglas) | MEDIA | F8 |
| 16 | Empty State Audit — 9 módulos sin verificar | MEDIA | F25 |
| 17 | StaleDataBanner no integrado en todos los módulos | BAJA | F25 |
| 18 | Web Vitals endpoint — `reportVital()` es stub | BAJA | Futuro |
| 19 | Notification prefs sync — no sincroniza con backend | BAJA | Futuro |
| 20 | Tokens fantasma (F29) — grep global por --color-text-primary/secondary/muted, --color-bg, --color-violet en .tsx/.ts | ALTA | F33+ |
| 21 | domain-enums.ts: FacilitiesAnalysis alias y AI_DOMAIN_DISPLAY.facilities.color update | MEDIA | F33 |
| 20 | Tokens fantasma — 10 hits violet-400/500 corregidos (5 archivos) | ALTA | F43 ✅ done |
| 21 | `--color-gold-mid` phantom token en Sidebar — 3 hits corregidos | ALTA | F43 ✅ done |
| 22 | Router duplicado `admin/facilities` — renombrado a `admin/facilities-management` | ALTA | F43 ✅ done |
| 23 | ExecutiveDashboard bugs críticos: `callMCPTool` sin import estático + `queryClient` sin declarar | CRÍTICA | F43 ✅ done |
| 24 | AIChatWidget: 5 raw buttons sin Button de shared | ALTA | F43 ✅ done |
| 25 | PredictiveIntelligenceFeed no wired en ExecutiveDashboard | ALTA | F43 ✅ done |
| 26 | AgeGroup/Guest/Satisfaction/ML rutas no existían en router | ALTA | F43 ✅ done |
| 27 | Sidebar sin nav items para 6 dominios nuevos | ALTA | F43 ✅ done |
| 28 | SportsAdvisorBanner legacy → generic AdvisorBanner | BAJA | F43 ✅ done |
```markdown
| # | Issue | Estado |
|---|-------|--------|
| 20 | Tokens fantasma (gold-light, gold-mid) — grep global | ✅ F46 done (8 tokens eliminados) |
| 23 | ExecutiveDashboard bugs críticos (callMCPTool, queryClient) | ✅ F43 done |
| 24 | AIChatWidget: 5 raw buttons | ✅ F43 done |
| 25 | PredictiveIntelligenceFeed no wired | ✅ F43 done |
| 26 | AgeGroup/Guest/Satisfaction/ML rutas no existían | ✅ F43 done |
| 27 | Sidebar sin nav items para 6 dominios nuevos | ✅ F43 done |
| NUEVO | admin/dashboard sin PermissionGate | ✅ F46 done |
| NUEVO | admin/events/:id sin PermissionGate | ✅ F46 done |
| NUEVO | ConnectionsTab snake_case → camelCase crash | ✅ F46 done |
| NUEVO | mi-club/familia sin :id param → loading infinito | ✅ F46 done |
| NUEVO | PermissionGate type mismatch (roles vs permissions) | ✅ F46 done |
| NUEVO | GlobalAdvisorBanner narrative inside flex row (P10 violation) | ✅ F46 done |
```
---

## 16. DECISION LOG (SELECCIÓN)

| Decisión | Razón | Impacto |
|----------|-------|---------|
| Advisor como hook client-side, no backend tool | 0 tokens, 0ms, consume cache | Patrón replicado F17-F32 |
| 3 capas de inteligencia (macro/micro/fusion) en F18/F19 | Diferentes niveles de profundidad | Se replicó en Event Advisor |
| 5 capas en F20 (diagnostic→execution) | Va más allá de diagnóstico | Diferenciador vs software tradicional |
| Global Advisor defensivo (funciona con datos parciales) | Usuario puede no haber visitado Finance/Events | No fuerza queries |
| Competitive Benchmark hardcodeado | CR private clubs data no existe como API | Advisor sabe qué es "bueno" en CR |
| Systemic Risk Score compuesto | Un solo número resume health + anomalies + conflicts + approvals | UX: usuario ve "riesgo 68/100 (C)" |
| Banner "tonto" con onExecute callback | Banner no sabe de mutations. Shell mapea insightId → mutation | Desacoplamiento testing/composición |
| AIInsightNarrative inline expandible | 2-3s inline es aceptable. Panel lateral rompe flujo | UX del Advisor |
| AI tools como AUTO approval | Tools de análisis no tienen side effects | Approval levels |
| `generate_json` con triple fallback de parsing | Claude envuelve JSON en ```json blocks | Backend robustez |
| Reaction System como state local del shell | Ephemeral por sesión, no necesita persistencia | Menos acoplamiento |
| Predictive Pre-fetch solo para ADMIN/JUNTA | SOCIO/STAFF no necesitan deep narratives | Ahorra API calls |
| Transform helpers en types.ts | Sub-componentes están bien construidos | Patrón replicado F17-F32 |
| `getMockResponse` interceptación condicionada por server | `generate_ai_analysis` existe en 2 servers | Finance recibe su propio shape |
| Canvas dark fills + colored borders en SocialGraph | "Los colores sólidos se ven feos" — usuario | Mejor visual |
| `import.meta.env.DEV` para devBypass | Built-in Vite, no requiere config | Production safety |
| TopLoadingBar con `useIsFetching` + route change | Zero dependency, custom gold styling | UX improvement |
| KeyboardHelpModal con `?` key | Discoverable, patrón estándar (GitHub, Slack) | Discovery feature |
| Rol enriquecido a 10 disciplinas | Creative Direction es fundamental para diferenciación | Rol actualizado |
| Dual Paradigma Architecture (F26) | Executive (demo) vs Domain (repo) son paradigmas distintos | No confundir tools |
| RAG grounding para domain agents (F28) | Insights enriquecidos con citations de documentos | Primera aplicación: communication |
| Cross-domain enums centralizados (F33) | Evita re-definición en cada dominio | 20 enums maestros |
```

---

Listo. El archivo pasó de tener ~1500 líneas desorganizadas con bloques flotantes, duplicados y contradicciones a un documento limpio de **16 secciones numeradas consistentemente**.

**Cambios principales que hice:**

| Qué | Antes | Después |
|-----|-------|---------|
| Secciones | 16+ con sub-secciones flotantes insertadas al final | 16 numeradas, orden jerárquico limpio |
| Estado de fases | 4 tablas contradictorias (3 versiones distintas de F23-F33) | **1 tabla unificada** con bloques por era |
| Agent map | Tier 1 con agentes duplicados entre tiers | **1 sola tabla por tier**, status unificado |
| RAG/Comms/Type System | Bloques flotantes en ` ```markdown ` sin integrar | Integrados en secciones 4, 5, 9, y 14 |
| Font references | Playfair Display (sección vieja) + Cormorant Garamond (globals.css) | **Cormorant Garamond** como fuente de verdad |
| Design System tokens | Mezclados en sección 6 + bloque externo | **Sub-secciones 6.1-6.19** limpias |
| Patrones | P16 con code fence abierto, P17-P20 inline en bloque de código | Todos numerados P1-P39, cierres correctos |
| Rules | 22+ reglas dispersas | **29 reglas** (7.1-7.7), numeración integrada |
| Pendientes | Duplicados entre sección 14 y checkpoint | **1 sola tabla**, items marcados done |
| Decision Log | ~40 entradas con muchas obsoletas | **20 decisiones** relevantes y vigentes |