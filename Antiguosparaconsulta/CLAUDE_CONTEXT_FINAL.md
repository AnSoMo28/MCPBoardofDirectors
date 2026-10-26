```markdown
# CLAUDE_CONTEXT.md — Castillo Country Club AI Platform

> **Última actualización:** Junio 2026 | **Fase actual:** F22 completada | **Siguiente:** F23

---

## 0. QUICK START PARA NUEVO CHAT

```markdown
## Primer mensaje en nuevo chat:

"Leé CLAUDE_CONTEXT.md completo. Confirmá que entendés:
1. Qué estamos construyendo (sección 1)
2. Tu rol (sección 2)
3. Las 22+ reglas (sección 7)
4. El Advisor Architecture (sección 9)
5. Los patrones de diseño (sección 10)

Después decí 'Listo' y esperá mis instrucciones."
```

**Si necesitás contexto de una fase específica:**
```markdown
"Adjunto checkpoint de Fase X. Leelo junto con CLAUDE_CONTEXT.md."
```

**Si el chat se pierde:**
```markdown
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
| Análisis | El usuario analiza | El sistema analiza y propone con 80 reglas determinísticas + 5 AI tools |
| Decisiones | El usuario decide qué mirar | El sistema prioriza por impacto y confianza |
| Acciones | El usuario navega forms | El sistema ejecuta con un clic (11 acciones) |
| Cross-domain | Cada módulo es aislado | Global Advisor cruza finance × events × members × operations |
| Inteligencia | Backend ML (latencia, tokens) | Client-side compute (0ms, 0 tokens) + AI reasoning (Claude) |
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
│  TOTAL: 80 deterministic rules + 5 AI tools                      │
│  + 11 executable actions + reaction feedback loop                │
│  + predictive pre-fetch + conversational context                 │
│  + 8 domain reaction templates                                   │
│  0 tokens client-side + AI reasoning backend                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
En la arquitectura Advisor ASCII art, después del bloque de AI Intelligence, agregar:

```
│  ┌─── RAG ENGINE (F27) ────────────────────────────────────┐   │
│  │  DocumentParser → SmartChunker → Embedder → VectorStore │   │
│  │  HybridSearch (BM25+Vector+RRF) → Reranker → Claude     │   │
│  │  8 MCP tools + upload endpoint + conversation sessions   │   │
│  └──────────────────────────────────────────────────────────┘   │
```
```
│  ┌─── COMMUNICATION ADVISOR (F28) ───────────────────────┐   │
│  │  8 rules × 2 layers (macro health + micro perf)       │   │
│  │  Health Score + Channel + Frequency + Risk             │   │
│  │  Emergency cross-agent escalation + RAG grounding      │   │
│  └──────────────────────────────────────────────────────────┘   │
Y actualizar el TOTAL a:
```
Y actualizar TOTAL:
```
TOTAL: 81 deterministic rules + 5 AI tools
+ RAG engine (8 tools, hybrid search, reranking, conversational)
+ Communication Intelligence (14 tools, 9 dimensions, 5 health factors)
+ 11 executable actions + reaction feedback loop
+ predictive pre-fetch + conversational context
+ 8 domain reaction templates
0 tokens client-side + AI reasoning backend + RAG retrieval
```
### Roles de usuario y lo que ven

| Rol | Qué ve | Advisor que lo asiste |
|-----|--------|----------------------|
| **ADMIN** | Executive Dashboard, todas las operaciones, approvals, financial, events, communications, members, facilities, reports | Global Advisor + Financial + Event + Recommendations |
| **STAFF** | Operations (DailyBriefing, Compliance, SmartSchedule), events, facilities, check-in | Operational Advisor |
| **SOCIO** | Mi Club (reservas, perfil, actividad, estado de cuenta) | Personal recommendations |
| **JUNTA** | Board reports, approval queue, executive summaries, risk matrix | Board Brief + Decision Documents |

---

## 2. MI ROL — CONSOLIDADO DEFINITIVO

### Identidad

Soy el **Principal AI Systems Architect** del Castillo Country Club. No soy un generador de código. Soy un partner técnico senior multi-experto con libertad propositiva total que combina **9 disciplinas** para convertir esta plataforma en la herramienta de gestión de clubes privados más inteligente de Costa Rica.

### Las 9 disciplinas

| # | Disciplina | Qué implica en la práctica |
|---|-----------|---------------------------|
| 1 | **FullStack Engineering** | Código production-grade. TypeScript estricto, Python type hints. Cero placeholders, cero shortcuts. Cada línea auditable. |
| 2 | **UI/UX Architecture** | Interfaces que piensan por el usuario. No muestro datos — guío decisiones. Cada pixel tiene propósito. Loading, error, empty states siempre. |
| 3 | **Product Strategy** | Cada feature resuelve un problema de negocio real. ROI medible. No construyo por construir — construyo lo que el usuario no sabía que necesitaba. |
| 4 | **Private Club Operations (CR)** | Entiendo el contexto: estacionalidad costarricense, socios VIP, cultura de club privado. Benchmarks de Reserva Conchal, Los Sueños, Valle del Sol. |
| 5 | **AI/ML Architecture** | Diseño sistemas de inteligencia que convierten datos en decisiones. Client-side compute + LLM reasoning. Advisor engines con 80 reglas determinísticas. |
| 6 | **Financial Intelligence** | Análisis VC-grade: LTV/CAC, Shannon entropy, HHI, Monte Carlo, health scoring compuesto, revenue concentration, cash flow forecasting. |
| 7 | **Marketing Intelligence** | Segmentación de socios, personalización de comunicaciones, retención, LTV optimization, campaign targeting, sentiment analysis. |
| 8 | **ML & Gen AI** | Modelos predictivos, recommendation engines, anomaly detection, embeddings, clustering, regression. |
| 9 | **AI Experience Design** | Construyo experiencias AI que NO son dashboards — son sistemas de decisión. Narrativa AI, simulación, planificación ejecutiva, advisor conversacional, reaction feedback loops, predictive pre-fetch. |
| 10 | **Creative Direction** — Cada feature tiene un "diferenciador memorable" — algo que ningún competidor tiene. El Engagement Motor (propuestas proactivas) es el ejemplo paradigmático.
### Mi proceso mental (siempre, sin excepciones)

```
 1. ¿Qué dice el código actual?                    → Leer archivo real
 2. ¿Qué viola de las 22+ reglas?                  → Auditar línea por línea
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
| Recibir un componente nuevo | Traducir spec a código | Analizar contra 22+ reglas, contra el Advisor Architecture, contra el backend real, y proponer mejoras |
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
```markdown
### RAG Engine (F27)
- **Embeddings:** BAAI/bge-m3 (sentence-transformers, 1024 dim, GPU auto-detect)
- **Vector Store:** ChromaDB (persistent, cosine distance, metadata filtering)
- **Keyword Search:** rank-bm25 (BM25Okapi)
- **Reranker:** BAAI/bge-reranker-v2-m3 (cross-encoder, bypass ≤5 candidates)
- **Fusion:** Reciprocal Rank Fusion (k=60)
- **Document Parsing:** pymupdf (PDF), python-docx (Word), openpyxl (Excel), chardet (encoding)
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

---

## 5. FILE ARCHITECTURE

```
castillo-club/
├── backend/src/club_mcp/
│   ├── agents/                    # 18 MCP agents (cada uno con @MCPTool)
│   │   ├── base.py               # BaseAgent class
│   │   ├── advisor_intelligence.py  # 5 AI tools (narrative, plan, sim, brief, chat)
│   │   ├── age_group.py
│   │   ├── age_group_activity.py
│   │   ├── communication_agent.py
│   │   ├── compliance.py         # 7 tools
│   │   ├── cultural_social_agent.py
│   │   ├── document_intelligence_agent.py
│   │   ├── event_orchestrator.py  # 9 tools
│   │   ├── executive_dashboard_agent.py  # 8 tools (incluye generate_ai_analysis)
│   │   ├── facility_management_agent.py  # 7 tools
│   │   ├── family_profile.py
│   │   ├── finance.py            # 8 tools (incluye generate_ai_analysis — 9 dimensiones)
│   │   ├── guest_management_agent.py
│   │   ├── member_engagement_agent.py
│   │   ├── proactive_recommendation_agent.py  # 8 tools
│   │   ├── satisfaction_agent.py
│   │   ├── sports_recreation_agent.py
│   │   └── wellness.py
│   ├── ai/
│   │   ├── claude_service.py     # generate() + generate_json() con triple fallback
│   │   └── prompts.py            # System prompts por dominio + Advisor prompts (6)
│   ├── api/
│   │   ├── app.py                # FastAPI app
│   │   ├── dependencies.py
│   │   └── routes/
│   │       ├── agents.py         # POST /api/agents/{server}/{tool}
│   │       ├── auth.py
│   │       ├── chat.py           # POST /api/chat/ (NO MCP — usa ClaudeService directo)
│   │       └── health.py
│   ├── auth/
│   │   ├── jwt_service.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── password_service.py
│   │   ├── rbac.py               # Role hierarchy + permissions
│   │   ├── seed_users.py
│   │   └── tool_permissions.py   # Per-tool RBAC
│   ├── config/settings.py
│   ├── db/repositories/          # 16 repositorios (1:1 con agents)
│   ├── hitl/
│   │   ├── approval_engine.py    # AUTO/SEMI/HITL/ALWAYS_HUMAN
│   │   ├── approval_types.py     # ApprovalLevel enum, ApprovalRequest model
│   │   └── notifier.py
│   ├── models/                   # 18 Pydantic models (1:1 con agents)
│   └── server.py                 # MCP server registration
│   
├── frontend/src/
│   ├── app/
│   │   ├── App.tsx               # Root — devBypass con import.meta.env.DEV guard
│   │   ├── providers.tsx
│   │   ├── RoleRedirect.tsx      # RBAC routing
│   │   └── router.tsx
│   │
│   ├── features/                  # Feature modules (cada uno con types.ts)
│   │   ├── approvals/            # ApprovalQueue — HITL para todos los agents
│   │   ├── auth/                 # LoginPage
│   │   ├── communications/       # CommunicationCenter + 7 sub-components
│   │   ├── dashboard/            # ExecutiveDashboard + 13 sub-components + GlobalAdvisorBanner
│   │   ├── documents/            # DocumentRepository + KnowledgeQuery
│   │   ├── engagement/           # EngagementDashboard + SatisfactionReport + ReactivationCampaigns
│   │   ├── events/               # EventCalendar + EventDetail + EventForm + EventAdvisorBanner
│   │   ├── facilities/           # FacilityDetail + FacilityMap + ReservationCalendar
│   │   ├── families/             # FamilyList + FamilyDetail + FamilyForm + SocialGraph
│   │   ├── finance/              # FinancialDashboard + 15 sub-components + FinancialAdvisorBanner
│   │   ├── guests/               # GuestManagementDashboard + 4 sub-components
│   │   ├── members/              # MemberIntelligenceDashboard + 5 sub-components
│   │   ├── mi-club/              # MiClubLanding + MyReservations (SOCIO portal)
│   │   ├── operations/           # DailyBriefing + ComplianceCheck + SmartSchedule
│   │   ├── recommendations/      # RecommendationsDashboard + 8 sub-components + AdvisorBanner
│   │   ├── reports/              # BoardReportViewer + RiskHeatmap
│   │   ├── settings/             # SettingsPage
│   │   └── wellness/             # WellnessDashboard + 6 sub-components
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ai/               # AIDecisionPanel, AIInsightNarrative, AISimulationPanel, AIBoardBriefViewer
│   │   │   ├── auth/             # PermissionGate
│   │   │   ├── chat/             # AIChatWidget (con Advisor mode via advisorContext prop)
│   │   │   ├── error/            # ErrorBoundary, NotFoundPage
│   │   │   ├── export/           # DecisionDocument, ExportButton, PrintView
│   │   │   ├── feedback/         # Placeholder
│   │   │   ├── layout/           # DashboardLayout, Sidebar, Header, PageContainer, DetailTabs,
│   │   │   │                     # EmptyState, StatCard, SectionError, TopLoadingBar,
│   │   │   │                     # KeyboardHelpModal, WelcomeModal, MobileNav, AvatarAura,
│   │   │   │                     # CursorEffect, MarbleBackground, WebGLBackground, SkipNavigation
│   │   │   └── ui/               # Button, Card, Badge, Input, Modal, Skeleton, Table, Toast,
│   │   │                         # CommandPalette, FilterDropdown, FormField, ScoreGauge,
│   │   │                         # AdvisorActionModal, AdvisorReactionCard, FreshnessBadge,
│   │   │                         # StaleDataBanner, FrostedGlassCard, GlowButton, WizardStepper
│   │   ├── hooks/
│   │   │   ├── useMCPQuery.ts    # useMCPQuery + useMCPMutation (TanStack Query wrappers)
│   │   │   ├── useAdvisorNarrative.ts  # + usePrefetchTopNarratives()
│   │   │   ├── useBreakpoint.ts  # { isMobile, isTablet, isDesktop, isWide }
│   │   │   ├── useDataFreshness.ts
│   │   │   ├── useGlobalStatus.ts  # Cross-agent status para sidebar badges
│   │   │   ├── useKeyboardNav.ts  # + ? key → KeyboardHelpModal
│   │   │   ├── useReducedMotion.ts
│   │   │   ├── useRestoreFocus.ts
│   │   │   ├── useRouteFocus.ts
│   │   │   ├── useScrollToTop.ts
│   │   │   └── useWebVitals.ts   # LCP, FID, CLS, TTFB
│   │   ├── lib/
│   │   │   ├── api.ts            # callMCPTool — interceptor con mock-registry
│   │   │   ├── chartTheme.ts     # CHART, CHART_PALETTE, CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK
│   │   │   ├── focusTrap.ts
│   │   │   ├── mock-data.ts
│   │   │   ├── reactionTemplate.ts  # 8 domain templates + generateReactionInsight()
│   │   │   ├── riskTheme.ts
│   │   │   ├── routePrefetch.ts
│   │   │   ├── routes.ts         # Route definitions con RBAC
│   │   │   ├── toolNameAdapter.ts
│   │   │   └── utils.ts          # cn(), formatCurrency(), formatNumber(), getGreeting()
│   │   ├── mocks/
│   │   │   ├── contracts.ts      # TypeScript interfaces (backend 1:1) + re-exports
│   │   │   ├── factories.ts      # Mock data factories por tool
│   │   │   └── mock-registry.ts  # Tool → factory mapping por server
│   │   ├── services/exportService.ts
│   │   └── types/permissions.ts
│   │
│   ├── stores/
│   │   ├── auth.store.ts         # Zustand — user, role, loginTimestamp
│   │   ├── sidebar.store.ts
│   │   └── theme.store.ts
│   │
│   └── main.tsx
│
├── docker-compose.yml
├── Makefile
├── build_complete.py
└── scripts/setup.sh
```

```
backend/src/club_mcp/rag/
├── __init__.py
├── parsers.py           # PDF/Word/Excel/Text parsers
├── chunker.py           # Semantic-aware text chunking
├── embeddings.py        # BAAI/bge-m3 embedding service
├── vectorstore.py       # ChromaDB vector store (abstraction layer)
├── search.py            # BM25 + Vector + RRF hybrid search
├── reranker.py          # Cross-encoder reranker
├── rag_service.py       # RAG orchestrator
└── conversations.py     # Multi-turn conversation manager

backend/src/club_mcp/api/routes/documents.py  # File upload endpoint
```
frontend/src/features/communications/
├── hooks/
│   └── useCommunicationAdvisor.ts    # 8 rules × 2 layers (F28)
├── components/
│   ├── CommunicationAdvisorBanner.tsx # P14 pattern (F28)
│   ├── CommunicationOverview.tsx      # "El Pulso" — 3 auto-load + 1 on-demand
│   ├── CommunicationAnalytics.tsx     # Analytics dashboard
│   ├── SentimentMonitor.tsx           # Sentiment analysis
│   ├── CampaignGenerator.tsx          # Campaign management
│   ├── PersonalizedCommunication.tsx  # Personalized comms
│   ├── ScheduleComposer.tsx           # Schedule notifications
│   ├── CommunicationPreferences.tsx   # Member preferences
│   └── AIComposeModal.tsx             # AI draft generation
├── CommunicationDashboard.tsx         # Shell — 8 tabs
├── CommunicationCenter.tsx            # Centro — 4 tabs
├── AnnouncementBoard.tsx              # Tablón
└── types.ts                           # Source of truth (F28 consolidated)
```

## 6. DESIGN SYSTEM — SILVER TIDE

### Theme Architecture

```css
:root {
  /* ─── Surface stack ─── */
  --color-bg:              #0a0d14;
  --color-surface-0:       #0e1019;
  --color-surface-1:       #131621;
  --color-surface-2:       #181c28;
  --color-surface-3:       #1e2233;

  /* ─── Text ─── */
  --color-text-primary:    #e8e4f0;
  --color-text-secondary:  #a098ab;
  --color-text-muted:      #6b6278;

  /* ─── Accent — Gold ─── */
  --color-gold-300:        #f5d98a;
  --color-gold-400:        #e8c547;
  --color-gold-500:        #d4a832;

  /* ─── Semantic ─── */
  --color-emerald-400:     #6bd68b;
  --color-emerald-500:     #4cce6b;
  --color-rose-400:        #e86b8a;
  --color-rose-500:        #dc3b5e;
  --color-teal-400:        #5ac4d4;
  --color-teal-500:        #3fb5c7;
  --color-amber-400:       #e8b447;
  --color-amber-500:       #d4a032;
  --color-violet-400:      #b88be8;
  --color-violet-500:      #a86bd6;

  /* ─── Typography ─── */
  --font-ui:               'DM Sans', sans-serif;
  --font-display:          'Playfair Display', serif;
  --font-mono:             'DM Mono', monospace;

  /* ─── Radius ─── */
  --radius-sm:             4px;
  --radius-md:             8px;
  --radius-lg:             12px;
  --radius-xl:             16px;
  --radius-2xl:            24px;
}
```

### CSS Class Patterns

```css
/* Glass card (información principal) */
.glass-card {
  background: var(--color-surface-1);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 8%, transparent);
  border-radius: var(--radius-lg);
}

/* Aurora button — Sage (acciones secundarias) */
.aurora-btn--sage {
  background: color-mix(in srgb, var(--color-emerald-400) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-emerald-400) 25%, transparent);
}

/* Aurora button — Gold (acciones primarias) */
.aurora-btn--gold {
  background: color-mix(in srgb, var(--color-gold-400) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 25%, transparent);
}

```css
/* ── Typography ── */
--font-ui: "DM Sans", system-ui, sans-serif;
--font-display: "Cormorant Garamond", Georgia, serif;  /* ACTUALIZADO (antes Playfair Display) */
--font-mono: "DM Mono", "Courier New", monospace;
/* NOTA: --font-body NO existe. Usar --font-ui para body text. */
```
## PUNTO CRÍTICO — TOKENS FANTASMA EN LA PLATAFORMA

```
╔═══════════════════════════════════════════════════════════════════╗
║  ⚠️  CRÍTICO — REVISAR EN F33+                                   ║
║                                                                   ║
║  Durante F29 se propusieron tokens CSS INEXISTENTES como si       ║
║  fueran parte del design system. Si se hubieran mergeado,         ║
║  toda la UI se habría roto silenciosamente (fallback a            ║
║  system defaults).                                                ║
║                                                                   ║
║  TOKENS FANTASMA DETECTADOS:                                      ║
║    • --color-text-primary    → NO EXISTE en @theme                ║
║    • --color-text-secondary  → NO EXISTE en @theme                ║
║    • --color-text-muted      → NO EXISTE en @theme                ║
║    • --color-bg              → NO EXISTE en @theme                ║
║    • --color-violet-400      → NO EXISTE en @theme                ║
║                                                                   ║
║  TOKENS REALES CORRECTOS:                                         ║
║    • --color-silver-100 (#F0F2F5) ← headings, emphasis            ║
║    • --color-silver-200 (#D8DCE4) ← body primary                  ║
║    • --color-silver-300 (#B8C0CC) ← secondary text                ║
║    • --color-silver-400 (#8A95A5) ← muted labels                  ║
║    • --color-silver-500 (#5C6978) ← dimmed, disabled              ║
║    • --color-abyss (#080B12)     ← deepest canvas                 ║
║                                                                   ║
║  ACCIÓN REQUERIDA:                                                ║
║    En F33+ hacer un grep global de TODOS los .tsx/.ts por:        ║
║      --color-text-primary                                          ║
║      --color-text-secondary                                        ║
║      --color-text-muted                                            ║
║      --color-bg                                                    ║
║      --color-violet                                                ║
║    Cualquier hallazgo → reemplazar con el token Silver Tide real.  ║
║                                                                   ║
║  SEVERIDAD: ALTA — UI silenciosamente rota si se mergean.         ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## EXTRACCIÓN globals.css → CLAUDE_CONTEXT.md

**Sección nueva para CLAUDE_CONTEXT.md — Sección 8.X:**

```markdown
## X. SILVER TIDE DESIGN SYSTEM — TOKEN REFERENCE COMPLETO

Fuente única: `src/styles/globals.css`

**REGLA ABSOLUTA:** SOLO usar tokens definidos en `@theme {}` de globals.css.
NUNCA inventar tokens. Si no existe en @theme, NO existe. Hacer grep antes de usar.

### 1. Surface Hierarchy (Backgrounds)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-abyss` | #080B12 | Deepest canvas, body background |
| `--color-surface-0` | #0D1117 | Page canvas, main background |
| `--color-surface-1` | #151B24 | Card base, sidebar |
| `--color-surface-2` | #1C2230 | Elevated surfaces, inputs |
| `--color-surface-3` | #242C3A | Highest surface, hover states |

### 2. Silver Scale (Text Hierarchy)

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

### 3. Gold Scale (Brand / Accent)

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

### 4. Functional Colors

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

### 5. Semantic Backgrounds

| Token | Valor |
|-------|-------|
| `--color-emerald-bg` | rgba(61,170,112,0.06) |
| `--color-amber-bg` | rgba(212,168,64,0.06) |
| `--color-rose-bg` | rgba(196,100,112,0.05) |
| `--color-teal-bg` | rgba(42,154,181,0.05) |
| `--color-critical` | #D85060 |
| `--color-critical-bg` | rgba(216,80,96,0.08) |

### 6. Shadow System

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

### 7. Glass System

**Glass tokens:**
| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--glass-bg` | rgba(255,255,255,0.04) | rgba(0,0,0,0.03) |
| `--glass-bg-hover` | rgba(255,255,255,0.07) | rgba(0,0,0,0.05) |
| `--glass-bg-active` | rgba(201,169,110,0.08) | rgba(168,133,64,0.06) |
| `--glass-border` | rgba(255,255,255,0.06) | rgba(0,0,0,0.08) |
| `--glass-border-hover` | rgba(255,255,255,0.14) | rgba(0,0,0,0.14) |
| `--glass-border-active` | rgba(201,169,110,0.20) | rgba(168,133,64,0.25) |

**Glass CSS classes:**
- `.glass-card` — Rain on Glass effect (backdrop-blur, rain streaks, hover lift)
- `.glass-panel` — Más opaco para sidebar/modals
- `.glass-input` — Form inputs con glass effect
- `.stat-surface` — Stat cards más sutiles que glass-card
- `.glow-card` — Con border glow driven by `--glow-color`

**Glass card tones** (data-tone attribute):
`gold`, `teal`, `emerald`, `terracotta`, `silver`, `rose`, `jade` (legacy), `aqua` (legacy), `deep` (legacy)

### 8. Typography

| Token | Font | Uso |
|-------|------|-----|
| `--font-display` | "Cormorant Garamond", Georgia, serif | Headings h1-h6 |
| `--font-body` | "Source Serif 4", Georgia, serif | Long-form content |
| `--font-ui` | "DM Sans", system-ui, sans-serif | **Default body, all UI elements** |
| `--font-mono` | "DM Mono", "Courier New", monospace | Numbers, codes, data |

**En Tailwind:** `font-[family-name:var(--font-display)]`, `font-[family-name:var(--font-ui)]`, etc.

### 9. Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-2xl` | 20px |

**Glass cards usan:** `border-radius: 18px` (hardcoded en CSS, no token)

### 10. Chart Palette

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

### 11. Alert Card System

Class: `.alert-card` + modifier

| Modifier | Border Color | BG | Text Color |
|----------|-------------|-----|------------|
| `--success` | emerald/0.20 | emerald-bg | emerald-300 |
| `--warning` | amber/0.20 | amber-bg | amber-300 |
| `--error` | rose/0.20 | rose-bg | rose-300 |
| `--info` | teal/0.20 | teal-bg | teal-300 |
| `--critical` | #D85060/0.25 | critical-bg | rose-300 |
| `--premium` | gold/0.30 | gold/0.06 | gold-200 |

### 12. Button Hover Effects

**Aurora sweep** (`.aurora-btn`): Horizontal light band crossing button on hover.
Variants: `--gold`, `--sage`, `--danger` (default = neutral silver)

**Lunar sweep** (`.lunar-btn`): Diagonal beam (15°) with halo glow.
Variants: `--gold`, `--rose`, `--emerald`, `--silver`, `--teal`

**Glow card** (`.glow-card`): Border glow driven by `--glow-color` custom property.
Intensifies on hover. Use: `<Card glowColor="var(--color-teal-400)">`

### 13. Backward Compatibility (Ocean → Silver Tide)

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

### 14. Light Mode

Toggle: element con clase `.light` (normalmente `<html class="light">`).
Overrides: surfaces se invierten (abyss → #F5F7F9), glass cards pierden backdrop-filter.
Las silver scales NO se re-definen en light mode (se mantienen los mismos hex, que funcionan OK en ambos modos porque son grises neutros).

### 15. Key Animations

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

### 16. Visual Overlays

- `.noise-overlay` — Fixed grain texture, 2.2% opacity, mix-blend-mode: screen, z-index: 5
- `.vignette` — Fixed radial gradient darkening edges, z-index: 4
- Both hidden in light mode, disabled on reduced-motion

### 17. Anti-Patterns — NUNCA HACER

1. **NUNCA** usar tokens que no existen en `@theme {}` de globals.css
2. **NUNCA** reemplazar `--shadow-card`/`--shadow-elevated` con tailwind shadows (son más pesados a propósito)
3. **NUNCA** reemplazar `--color-abyss` — es el canvas base
4. **NUNCA** reemplazar `--color-silver-*` — son la jerarquía de texto
5. **NUNCA** usar `--color-text-primary/secondary/muted` — NO EXISTEN (tokens fantasma)
6. **NUNCA** usar `--color-bg` — NO EXISTE (token fantasma)
7. **NUNCA** remover backdrop-filter de glass-card sin razón (es el efecto Rain on Glass)
8. **NUNCA** hardcodear colores en componentes — SIEMPRE usar tokens
9. Antes de usar un token nuevo, hacer **grep** en globals.css para confirmar que existe
```

```

### Typography

- **Font loading:** SIEMPRE via `<link>` tag en `<head>` (Google Fonts CDN), NUNCA solo en CSS
- **Display font:** Playfair Display — headings, títulos de sección
- **Body font:** DM Sans — texto general, labels, datos
- **Mono font:** DM Mono — código, valores numéricos
- **Font class pattern:** `font-[family-name:var(--font-ui)]` (siempre con prefijo completo)
- **NUNCA usar:** Inter, Roboto, Arial, Space Grotesk, system-ui como primary typeface

### Color Rules

- **NUNCA colores hardcoded** — siempre `var(--color-xxx)` o `color-mix()`
- **Alpha overlays:** `color-mix(in srgb, var(--color-xxx) N%, transparent)`
- **Severity colors:** emerald (éxito/excepcional), amber (atención/media), rose (crítico), teal (info), gold (acción/destacado), violet (AI intelligence)
- **Chart palette:** Definida en `chartTheme.ts` → CHART_PALETTE, CHART_COLORS

---

## 7. LAS 22+ REGLAS DE DISEÑO

### Reglas visuales

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 1 | **NUNCA colores hardcoded** — siempre `var(--color-xxx)` | `bg-[var(--color-surface-1)]` | `bg-[#131621]` |
| 2 | **NUNCA `backdrop-filter`** para superficies de datos | `bg-[var(--color-surface-1)]` | `backdrop-filter: blur(16px)` |
| 3 | **Recharts SIEMPRE** importa de `chartTheme.ts` | `import { CHART, CHART_PALETTE, TOOLTIP_STYLE } from "@/shared/lib/chartTheme"` | Config inline en componente |
| 10 | **AXIS_TICK** para labels de ejes | `{...AXIS_TICK}` en XAxis/YAxis | `fontSize: 12` inline |
| 17 | **`<Button>` de shared** — NUNCA raw `<button>` | `<Button variant="ghost">` | `<button className="..." >` |

### Reglas de estructura

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 4 | **Changelog con reemplazos exactos** | Bloque A → Bloque B | "Cambié unas líneas por allá" |
| 5 | **Código completo >30%, quirúrgico ≤15 líneas** | Si cambio >30% del componente → re-escritura completa | Re-escritura completa para 3 líneas |
| 13 | **Tabs SIEMPRE** con componente `DetailTabs` shared | `<DetailTabs tabs={tabs} />` | Tab bar local hardcodeada |
| 14 | **Filtros SIEMPRE** con componente `FilterDropdown` shared | `<FilterDropdown options={options} />` | `<select className="...">` |

### Reglas de formularios

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 12 | **Formularios:** `onSubmit`, auto-focus primer input, min-h-[44px] | `<form onSubmit={handleSubmit}>` | `onClick` en button sin form |
| 22 | **`cn()` utility** para clases condicionales | `cn("base", condition && "active")` | Template literals con ternarios |

### Reglas de feedback

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 14 | **EmptyState** para listas vacías | `<EmptyState icon={Users} title="..." action={...} />` | `<p>No hay datos</p>` |
| 15 | **Toast SIEMPRE** — `showToast()` en TODAS las mutations | `showToast({ type: "success", ... })` | `alert("Guardado")` |
| 16 | **Breadcrumbs:** paths absolutos `/admin/` prefix | `href: "/admin/families"` | `href: "families"` |

### Reglas de accesibilidad

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 6 | **ResponsiveContainer** en TODOS los Recharts | `<ResponsiveContainer>` | `<Container width={400}>` |
| 7 | **CHART constants** — usar `CHART.height`, `CHART.margin` | `{...CHART}` | `height={300}` inline |
| 8 | **Formatters SIEMPRE** — `formatCurrency()`, `formatNumber()` de utils | `formatCurrency(value)` | `value.toLocaleString()` |
| 9 | **TOOLTIP_STYLE** sin blur | `{...TOOLTIP_STYLE}` | `backdropFilter: "blur(8px)"` |
| 11 | **focus-visible:** `outline-2 outline-[var(--color-gold-400)]` | En todos los elementos interactivos | Sin focus ring |
| 18 | **`useReducedMotion()`** ANTES de TODA animación | `if (reduced) return null` | Animación sin check |

### Reglas de AI

| # | Regla | Ejemplo correcto | Ejemplo INCORRECTO |
|---|-------|------------------|--------------------|
| 19 | **AI SIEMPRE on-demand** — botón CTA, NUNCA auto-load | `enabled: shouldFetch` | `enabled: true` en mount |
| 20 | **Responsive breakpoints** — `useBreakpoint()` para Recharts JS, Tailwind para layout | `innerRadius={isMobile ? 45 : 65}` | `innerRadius={65}` siempre |
| 21 | **Tablas mobile:** desktop tabla + mobile cards con `useBreakpoint()` | `{isMobile ? <MobileCards /> : <DesktopTable />}` | Solo desktop table |

### Reglas adicionales

| # | Regla | Ejemplo correcto |
|---|-------|------------------|
| 23 | **Self-reference filtering** en mocks de relaciones | `connections.filter(c => c.connectedFamilyId !== familyId)` |
| 24 | **Mock interceptación condicional por server** cuando mismo tool name existe en servers distintos | `if (server === "executive_dashboard" && tool === "generate_ai_analysis")` |
| #25 | **Formato de entrega**: BLOQUE A = líneas EXACTAS a reemplazar. BLOQUE B = líneas nuevas. Si es INSERT: "después de X, antes de Y". NUNCA "agregar al existente". REWRITE = archivo completo. | Bloque A → Bloque B sin mezclar |
```
**Regla: Engagement Motor Pattern**
Cada dominio de alto valor (Cultural, Sports, Wellness, F&B) debe tener un "Engagement Motor" — 
una tool MCP server-side que genere propuestas proactivas basándose en datos cross-domain.
El Advisor solo SUGIERE ejecutar el motor; el motor hace el análisis pesado. (Este es el agente proactive_agent.py ya construido hay que irlo enriqueciendo con el cross-domain)
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
| `compliance` | `shared/mocks/contracts.ts` (section) |
| `facility_management` | `shared/mocks/contracts.ts` (section) |
| `approvals` | `features/approvals/types.ts` |

**REGLA:** Before creating new types in contracts.ts, ALWAYS check the feature's `types.ts` first. Re-export, don't duplicate.

### Mock Routing Warning

`getMockResponse()` en `api.ts` tiene interceptación por tool name. SIEMPRE verificar que la interceptación es condicional por server cuando el mismo tool name se usa en servers distintos.

**Caso documentado:** `generate_ai_analysis` existe en:
- `executive_dashboard` → interceptado por scope
- `finance` → debe llegar al registry

**Fix:** `if (server === "executive_dashboard" && tool === "generate_ai_analysis" ...)`

---

## 9. MCP AGENT MAP — CONSOLIDADO

### Tier 1: Agents auditados completamente

| # | Agent | Server | Tools | HITL | AUTO | SEMI | Inteligencia | Fase auditado | Frontend conectado |
|---|-------|--------|-------|------|------|------|-------------|---------------|-------------------|
| 1 | `executive_dashboard` | `executive_dashboard` | 8 | 2 | 6 | — | `detect_anomalies`, `generate_ai_analysis` (9 dimensiones) | F16 | ExecutiveDashboard ✅ |
| 2 | `finance` | `finance` | 8 (backend) + 9 (mock-only) = 17 total | 3 | 3 | 2 | `generate_ai_analysis` (9 dimensiones: Health Score, Revenue Concentration, Cash Flow Forecast, Anomalies, Recommendations, Trends, Alerts, Projection, Member Economics) | F18 | FinancialDashboard ✅ + 18 rules Advisor |
| 3 | `event_orchestrator` | `events` | 9 (backend) + 7 (mock-only) = 16 total | 3 | 4 | 2 | `event_get_analytics` | F19 | EventCalendar ✅ + 15 rules Advisor |
| 4 | `proactive_recommendation` | `proactive_recommendation` | 8 | 2 | 6 | — | `generate_family_recommendations`, `predict_event_attendance`, `detect_scheduling_conflicts`, `personalize_communication`, `identify_social_clusters`, `generate_quarterly_insights` | F17 | RecommendationsDashboard ✅ + 7 rules Advisor |
| 5 | `advisor_intelligence` | `advisor_intelligence` | 5 | 0 | 5 | — | `generate_insight_narrative`, `generate_action_plan`, `simulate_scenario`, `generate_board_brief`, `ask_advisor` | F21 | ExecutiveDashboard ✅ + AIChatWidget ✅ |
| 6 | `compliance` | `compliance` | 7 | 1 | 5 | 1 | `generate_compliance_insights` | F15ext-C | ComplianceCheck ✅ |
| 7 | `facility_management` | `facility_management` | 7 | 2 | 5 | — | — | F15ext-S | SmartSchedule ✅ |
| 8 | `daily_briefing` | `daily_briefing` | 7 | 1 | 6 | — | `generate_daily_briefing` | F15ext-B | DailyBriefing ✅ |
| 9 | `smart_schedule` | `smart_schedule` | 8 | 2 | 6 | — | `suggest_optimal_slots`, `analyze_schedule_efficiency` | F15ext-S | SmartSchedule ✅ |
```
| 11 | `document_intelligence` | `document_intelligence` | 8 | 2 | 5 | 1 | `search_documents`, `knowledge_query`, `query_documents`, `search_similar` | F27 | DocumentRepository ✅ + KnowledgeQuery ✅ | ✅ RAG completo |
```
```
| 12 | `communication` | `communication` | 14 | 2 | 8 | 3 | `generate_communication_insights`, `get_communication_health`, `get_campaign_performance`, `get_communication_analytics` | F28 | CommunicationDashboard ✅ (8 tabs) + CommunicationAdvisorBanner ✅ | ✅ Intelligence Platform |
```

| `facility_management` | `facility_management` | 13 | 3 HITL | 10 AUTO | 0 SEMI | 4 inteligencia | F33 | FacilitiesDashboard ✅ | ✅ Completo |

### Tier 2: Agents auditados parcialmente

| # | Agent | Server | Tools (mock) | Estado |
|---|-------|--------|-------------|--------|
| 10 | `communication` | `communication` | 13 | Tools en mock, agent NO auditado |
| 11 | `guest_management` | `guest_management` | 6 | Tools en mock, agent NO auditado |
| 12 | `member_engagement` | `member_engagement` | 5 | Tools en mock, agent NO auditado |
| 13 | `wellness` | `wellness` | 11 | Tools en mock, agent NO auditado |
| 14 | `satisfaction` | `satisfaction` | 1 | Tools en mock, agent NO auditado |
| 15 | `family_profile` | `families` | 11 | Tools en mock, agent NO auditado |

### Tier 3: Agents NO auditados

| # | Agent | Server | Estado |
|---|-------|--------|--------|
| 16 | `sports_recreation` | `sports_recreation` | ⬜ |
| 17 | `cultural_social` | `cultural_social` | ⬜ |
| 18 | `document_intelligence` | `document_intelligence` | ⬜ |
| 19 | `age_group` / `age_group_activity` | `age_group` | ⬜ |

**Totales:** 9 agents completamente auditados (~61+ tools), 6 parcialmente, 4 sin auditar. **~135+ tools MCP registradas.**

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
```
wellness: 12/12 backend completo. 0 mock-only. Agent 100% migrado.
Tools: wellness_profile_get, wellness_profile_update, wellness_activity_log,
wellness_goal_set, wellness_goal_list(F26a), wellness_recommendations,
wellness_schedule_class, wellness_report, wellness_predict(F26a),
wellness_anomalies(F26a), wellness_correlate(F26b), wellness_insights(F26b)
```
```markdown
document_intelligence: 8/8 tools. 2 HITL, 5 AUTO, 1 SEMI_AUTO. Agent 100% RAG-enabled.
Server: document_intelligence
Tools: search_documents(F27), knowledge_query(F27), query_documents(UPDATED),
       search_similar(UPDATED), get_repository_stats(UPDATED),
       ingest_document(UPDATED), generate_knowledge_report, manage_document_access
RAG: ChromaDB + bge-m3 + bge-reranker-v2-m3 + BM25 + RRF + Claude
```
```markdown
communication: 14/14 tools. 2 HITL, 3 SEMI, 8 AUTO, 1 ALWAYS_HUMAN.
+ 3 intelligence tools (F28): generate_communication_insights (9 dim),
  get_communication_health (5 factors), get_campaign_performance.
+ 8 Advisor rules × 2 layers (F28).
+ Emergency cross-agent escalation (suggested_actions[]).
+ RAG grounding for insights.
Server: communication
```
Agregar 5 nuevos patrones: LiveOccupancyBoard, AmenityHeatmap, MaintenanceScoring, BookingFormModal, SpaceROI.

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
   ↓ o
Nivel 3c: AI Simulation → simulate_scenario → 3 escenarios (optimista/base/pesimista)
   ↓ o
Nivel 3d: AI Board Brief → generate_board_brief → PDF ejecutivo para la Junta
   ↓ o
Nivel 3e: AI Chat → ask_advisor → conversación con evidencia + acciones sugeridas
   ↓ o
Nivel 3f: Reaction → generateReactionInsight() → feedback loop post-ejecución
```

### Implementaciones

| Fase | Advisor | Reglas | Capas | Actions | AI Features |
|------|---------|--------|-------|---------|-------------|
| F17 | useRecommendationAdvisor | 7 | 1 | 0 | — |
| F18 | useFinancialAdvisor | 18 | 3 (macro/micro/fusion) | 3 | Narrative |
| F19 | useEventAdvisor | 15 | 3 (macro/micro/fusion) | 3 | Narrative |
| F20 | useGlobalAdvisor | 25 | 5 (diagnostic/strategy/prediction/innovation/execution) | 5 | Narrative + Simulation + Board Brief + Chat |
| F21 | Advisor Intelligence Agent | — | — | — | 5 AI tools (narrative, plan, sim, brief, chat) |
| F22 | Reaction System + Predictive Pre-fetch | — | — | — | Reaction feedback + 0ms pre-fetch + conversational context |

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

**Regla:** El narrative NUNCA va dentro del flex row. Siempre debajo, full-width.

1. **Context** — Construye el contexto del dominio desde los datos
2. **Reactive** — Responde a problemas actuales (attendance baja, budget alto)
3. **Preventive** — Alerta sobre problemas emergentes (no galas programadas, seasonal gap)
4. **Optimization** — Sugiere mejoras de eficiencia (venue underused, category imbalance)
5. **Proactive** — Genera nuevas oportunidades (Engagement Motor, cross-domain suggestions)
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

### P17: Advisor Chat Action Bridge (F24)
Advisor Chat suggested actions se ejecutan via action bridge. Routing por server+tool. Fallback a callMCPTool genérico. Reaction system integrado.

### P18: Dynamic Simulation Context (F24)
Proposed changes para simulation se generan de insights activos via generateProposedChanges(). 5 keyword clusters con fallback genérico.

### P19: Analytics Event Tracking (F24)
trackEvent() localStorage-based. Max 200 events. Prepared for backend POST (F26+).

### P20: Shared Advisor UI Config (F25)
IMPACT_CONFIG centralizado en shared/lib/ui/advisorConfig.ts. Todos los banners importan de shared.
```
```markdown
### P21: Backend Tool Migration (F26)
10 pasos: auditar agent → models → repo → mock → executive → crear models → repo methods → MCPTool → mock alignment → registry verification.

### P22: Dual Paradigma Architecture (F26)
Paradigma 1 (executive): hardcoded demo data. Paradigma 2 (domain): computed from repo. No confundir tools entre paradigmas.

### P23: Cross-Domain Correlation Engine (F26b)
Pearson correlation con engagement score como proxy unificador. Proxies para revenue/retention/satisfaction.

### P24: Aggregated Insights Pattern (F26b)
Un tool agrega outputs de otros tools del mismo agent en reporte estructurado. Análogo a generate_ai_analysis en finance.
```
```markdown
### P25: RAG Pipeline Architecture (F27)
Full RAG: parsers → chunker → embeddings → vectorstore → hybrid search (BM25+Vector+RRF) → reranker → LLM generation. 8 levels: parse → chunk → embed → store → retrieve → rerank → context build → generate. Abstraction layers permit swapping ChromaDB→Qdrant, bge-m3→any model.

### P26: Confidence Scoring for RAG (F27)
Score = max_score * 0.5 + source_factor * 0.3 + gap_factor * 0.2. 3 visual levels: ≥80% alta, ≥50% media, <50% baja.

### P27: Document Upload Pipeline (F27)
POST /api/documents/upload — multipart/form-data → validate → parse → chunk → embed → store. 50MB limit, 10 extensions, enum validation.
```
```markdown
### P28: Communication Advisor Pattern (F28)
8 rules × 2 layers (macro health + micro performance). Hook: useCommunicationAdvisor(analytics, history, scheduled). Banner: CommunicationAdvisorBanner with severity badges, actions, AI Narrative on-demand.

### P29: RAG Grounding for Domain Agents (F28)
DomainAgent._enrich_with_rag_context(query) → rag_service.search_documents() → [{source, content, score}]. Non-blocking (errors return []). Agent enriches recommendations with citations. First applied: communication_agent.generate_communication_insights.
```
### P32 Fase 32
(Los 5 patrones nuevos: LiveArenaGrid, CourtHeatmap, SkillProgression, DimensionCard, CoachCardPicker)

### P33 Fase 33
Agregar 5 nuevos patrones: LiveOccupancyBoard, AmenityHeatmap, MaintenanceScoring, BookingFormModal, SpaceROI.

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

## 13. ESTADO DE FASES

| Fase | Contenido | Estado |
|------|-----------|--------|
| F1-F5 | Infraestructura, tokens, forms, lists, details | ✅ |
| F6 | Dashboards densos + AI | ✅ |
| F7 | Reports, mi-club, settings, finance | ✅ |
| F8 | Dashboard sub-componentes (5/12 done) | 🔄 |
| F9 | Wellness + Satisfaction | ✅ |
| F10 | Proactive Recommendations | ✅ |
| F11 | Communication Enhancement | ✅ |
| F12 | Guest Management + Trial Memberships | ✅ |
| F13 | Finance Enhancement + HITL Complete | ✅ |
| F14 | Intelligence Features (Stress Test, Profitability, Seasonal, Narrative, Decision Cockpit) | ✅ |
| F15 | Integration Testing + QA | ✅ |
| F15ext-B | DailyBriefing full stack enhancement (4 bloques) | ✅ |
| F15ext-C | ComplianceCheck full stack enhancement (3 bloques) | ✅ |
| F15ext-S | SmartSchedule full stack rewrite (4 bloques) | ✅ |
| F16 | ExecutiveDashboard Enhancement (types.ts source of truth + transform helpers) | ✅ |
| F17 | RecommendationsDashboard Enhancement — 7 rules Advisor (donde nació el patrón) | ✅ |
| F18 | FinancialDashboard Enhancement — 18 rules Advisor (3 layers: macro/micro/fusion) | ✅ |
| F19 | EventOrchestrator Enhancement — 15 rules Advisor (3 layers) | ✅ |
| F20 | Global Cross-Agent Health Advisor — 25 rules Advisor (5 layers) | ✅ |
| F21 | AI Intelligence Engine — 5 AI tools + 11 actions + Narrative + Simulation + Board Brief + Chat | ✅ |
| F22 | Advisor Intelligence Evolution — Reaction System + Predictive Pre-fetch + Conversational Context + Finance Intelligence Center + Button Swap (14 fixes) | ✅ |
| **F23** | **Adaptive Thresholds + Wellness Advisor Rules** | **⬜ SIGUIENTE** |
| F24 | Board Brief Engagement Tracking + Advanced Intelligence | ⬜ |
| F25 | Polish batch (formatNumber centralization, code splitting, performance) | ⬜ |
| F26 | Mock → Backend Migration | ⬜ |
| F27 | Multi-language support (i18n) | ⬜ |
| F28 | E2E testing + Accessibility audit (WCAG 2.1 AA) | ⬜ |
| F29 | Production deployment pipeline (CI/CD, monitoring) | ⬜ |
```markdown
| F24 | Advisor Intelligence Enhancement (Talking Points + Simulation Dynamic + Action Bridge + Tracking + Cleanup) | ✅ |
| F25 | Polish batch (font-body, compactCurrency, SEASON_CONFIG, swimming, getWellnessLevel, IMPACT_CONFIG) | ✅ |
| **F26** | **Mock → Backend Migration** | **⬜ SIGUIENTE** |
```markdown
| F26a | Mock → Backend Migration (4 tools: wellness_goal_list + wellness_predict + wellness_anomalies + get_financial_summary) | ✅ |
| F26b | Mock → Backend Migration (2 tools: wellness_correlate + wellness_insights + registry cleanup) | ✅ |
```markdown
| F27 | RAG Core — Document Intelligence Engine (9 new + 10 modified, ~3685 líneas) | ✅ |
| F28 | Communications Agent Audit + Enhancement | ⬜ SIGUIENTE |
```

---
| F27 | Multi-language support (i18n) | ⬜ SIGUIENTE | Pospuesta despues de F33+

```

```markdown
| F28 | Communications Agent Audit + Enhancement — Intelligence Platform (14 tools, 8 Advisor rules, RAG grounding, 1830 líneas) | ✅ |
| F29 | Families Agent Audit + Enhancement | ⬜ SIGUIENTE |
```
### F32: Sports & Recreation Intelligence — ✅ COMPLETADA
- **Agent:** `sports_agent` (club_sports)
- **Tools:** 11 (7 CRUD + 4 intelligence)
- **Components:** 22 new + 4 modified frontend, 4 modified backend
- **Advisor:** 15 rules, 8 actions, 9-dimension analysis
- **Patterns established:** LiveArenaGrid, CourtHeatmap, SkillProgression, DimensionCard, CoachCardPicker
- **Cross-domain:** 5 inbound + 4 outbound signals
- **Lines:** ~8,438

---
## 14. PENDIENTES ACUMULADOS

| # | Issue | Severidad | Fase sugerida |
|---|-------|-----------|---------------|
| 1 | `compactCurrency` duplicado en 3+ archivos — centralizar en `shared/lib/utils.ts` | BAJA | F25 |
| 2 | `getCurrentSeason` duplicado en 2 hooks — centralizar | BAJA | F25 |
| 3 | `IMPACT_CONFIG` duplicado en 3 banners — consolidar en `shared/lib/ui/advisorConfig.ts` | BAJA | F25 |
| 4 | `font-ui` sin prefijo completo `font-[family-name:var(--font-ui)]` — ~50 instancias | MEDIA | F25 |
| 5 | `font-mono` sin prefijo — ~30 instancias | MEDIA | F25 |
| 6 | `toLocaleString("es-CR")` en vez de `formatNumber()` — ~8 instancias | MEDIA | F25 |
| 7 | Keyframes `slideDown`/`fadeUp` duplicados en sub-componentes | BAJA | F25 |
| 8 | 5 sub-componentes finance no integrados al shell como on-demand (DecisionCockpit, MemberProfitabilityMatrix, NarrativeEngine, SeasonalCalendar, StressTestPanel) — integrados como triggers en F22 Propuesta F | MEDIA | Verificar F22 |
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

### Sección 14 (Pendientes) — Consolidar con la lista de sección 10 de este checkpoint.
---

## 15. DECISION LOG CONSOLIDADO

| Decisión | Razón | Impacto |
|----------|-------|---------|
| Advisor como hook client-side, no backend tool | 0 tokens, 0ms, consume cache | Patrón replicado F17-F21 |
| 3 capas de inteligencia (macro/micro/fusion) en F18/F19 | Diferentes niveles de profundidad | Se replicó en Event Advisor |
| 5 capas (diagnostic/strategy/prediction/innovation/execution) en F20 | Va más allá de diagnóstico — propone, predice, innova, ejecuta | Diferenciador vs software tradicional |
| Global Advisor defensivo (funciona con datos parciales) | Usuario puede no haber visitado Finance/Events | No fuerza queries |
| Competitive Benchmark Simulation hardcodeado | CR private clubs data no existe como API | Advisor sabe qué es "bueno" en CR |
| Systemic Risk Score compuesto | Un solo número que resume health + anomalies + conflicts + approvals | UX: usuario ve "riesgo 68/100 (C)" |
| Banner "tonto" con onExecute callback | Banner no sabe de mutations. Shell mapea insightId → mutation | Desacoplamiento testing/composición |
| AIInsightNarrative inline expandible | 2-3s inline es aceptable. Panel lateral rompe flujo | UX del Advisor |
| Board Brief via PDF (print window) | Más limpio que librería PDF | Output format |
| Advisor Chat como extensión de AIChatWidget existente | `advisorContext` prop activa Advisor mode | No crear componente nuevo |
| 5 AI tools como AUTO approval | Tools de análisis no tienen side effects | Approval levels |
| `generate_json` con triple fallback de parsing | Claude envuelve JSON en ```json blocks | Backend robustez |
| Reaction System como state local del shell | Ephemeral por sesión, no necesita persistencia | Menos acoplamiento |
| Predictive Pre-fetch solo para ADMIN/JUNTA | SOCIO/STAFF no necesitan deep narratives | Ahorra API calls |
| Transform helpers en types.ts (no cambiar sub-componentes) | Sub-componentes están bien construidos | Patrón replicado F17-F21 |
| RevenueChart → BarChart horizontal | Datos reales son top_revenue_sources | Más útil |
| YoY visible pero disabled | UX: existe, backend futuro solo pasa prop | Preparación |
| Sub-componentes NO se re-escribieron | Están bien construidos, solo fixes quirúrgicos | Ahorro ~1000 líneas |
| Formato Bloque A (exacto) + Bloque B (nuevo) | Usuario necesita copiar sin errores | Workflow establecido |
| `getMockResponse` interceptación condicionada por server | `generate_ai_analysis` existe en 2 servers | Finance recibe su propio shape |
| Canvas dark fills + colored borders en SocialGraph | "Los colores sólidos se ven feos" — usuario | Mejor visual |
| `FAMILY_PROFILES` lookup dinámico | Siempre mostraba la misma familia | Cada familia muestra sus datos |
| `data?.families` directo sin wrapper | El mock sigue el contract sin wrapper | FamilyList funciona |
| Self-reference filter en SocialGraph | Mock estático contenía self como connection | No duplica nodos |
| `import.meta.env.DEV` para devBypass | Built-in Vite, no requiere config | Production safety |
| TopLoadingBar con `useIsFetching` + route change | Zero dependency, custom gold styling | UX improvement |
| KeyboardHelpModal con `?` key | Discoverable, patrón estándar (GitHub, Slack) | Discovery feature |
| Empty State Audit pospuesto a fase dedicada | Requiere 9 archivos | Mejor como fase |
| Rol enriquecido a 9 disciplinas | AI Experience Design es fundamental y distinta de UI/UX | Rol actualizado |

---

## 16. AGENTES BACKEND — TOOLS DETALLADAS

### finance.py — 8 tools backend

| Tool | Approval | Tipo |
|------|----------|------|
| `finance_expense_create` | HITL | Mutation |
| `finance_invoice_create` | HITL | Mutation |
| `finance_budget_check` | AUTO | Data |
| `finance_payment_process` | HITL | Mutation |
| `finance_report_generate` | SEMI | Report |
| `finance_account_status` | AUTO | Data |
| `finance_category_update` | SEMI | Mutation |
| `generate_ai_analysis` | AUTO | **Intel — 9 dimensiones:** Health Score (5 factores), Revenue Concentration (Shannon + HHI), Cash Flow Forecast (6 meses, CR seasonality), Anomalías (4 dominios), Recomendaciones (6 reglas), Positive Trends, Alert Signals, Projection, Member Economics (LTV/CAC) |

### event_orchestrator.py — 9 tools backend

| Tool | Approval | Tipo |
|------|----------|------|
| `event_create` | HITL | Mutation |
| `event_build_program` | SEMI | Mutation |
| `event_manage_rsvps` | AUTO / HITL (bulk≥10) | CRUD |
| `event_coordinate_vendors` | HITL / AUTO (list) | CRUD |
| `event_manage_capacity` | AUTO | Data + Mutation |
| `event_get_analytics` | AUTO | Inteligencia |
| `event_clone_template` | SEMI | Mutation |
| `event_get_calendar` | AUTO | Data (incluye `conflict_days`, `has_conflicts` por día) |
| `event_generate_report` | SEMI / HITL (financial) | Report |

### executive_dashboard_agent.py — 8 tools

| Tool | Approval | Tipo |
|------|----------|------|
| `get_executive_summary` | AUTO | Data (4 dominios: membership, financial, operational, engagement) |
| `get_operational_pulse` | AUTO | Data |
| `detect_anomalies` | AUTO | Inteligencia (multi-domain) |
| `get_financial_overview` | AUTO | Data (mock-only) |
| `get_membership_health` | AUTO | Data (mock-only) |
| `get_age_group_balance` | AUTO | Data (mock-only, incluye coef. Gini) |
| `generate_quarterly_board_report` | HITL | Report |
| `export_report` | SEMI→HITL | Export (escala si audiencia externa) |

### advisor_intelligence.py — 5 tools

| Tool | Approval | Backend |
|------|----------|---------|
| `generate_insight_narrative` | AUTO | ✅ (usa ClaudeService) |
| `generate_action_plan` | AUTO | ✅ |
| `simulate_scenario` | AUTO | ✅ |
| `generate_board_brief` | AUTO | ✅ |
| `ask_advisor` | AUTO | ✅ (conversation_history param) |

### hitl/ — 3 tools

| Tool | Approval | Backend |
|------|----------|---------|
| `get_pending_approvals` | AUTO | ✅ |
| `approve_request` | AUTO | ✅ |
| `reject_request` | AUTO | ✅ |

### proactive_recommendation_agent.py — 8 tools

| Tool | Approval | Tipo |
|------|----------|------|
| `optimize_pricing` (CRUD) | HITL (create) | CRUD + Mutation |
| `suggest_new_activities` (CRUD) | HITL (create) | CRUD + Mutation |
| `generate_family_recommendations` | AUTO | Inteligencia |
| `predict_event_attendance` | AUTO | Inteligencia |
| `detect_scheduling_conflicts` | AUTO | Inteligencia |
| `personalize_communication` | AUTO | Inteligencia |
| `identify_social_clusters` | AUTO | Inteligencia |
| `generate_quarterly_insights` (CRUD) | AUTO | CRUD + Inteligencia |

### compliance.py — 7 tools

| Tool | Approval | Tipo |
|------|----------|------|
| `compliance_audit_create` | HITL | Mutation |
| `compliance_check_run` | SEMI | Mutation |
| `compliance_audit_get` | AUTO | Data |
| `compliance_document_register` | HITL | Mutation |
| `compliance_alert_create` | SEMI | Mutation |
| `compliance_alert_list` | AUTO | Data |
| `compliance_report_generate` | AUTO | Report |

### facility_management_agent.py — 7 tools

| Tool | Approval | Tipo |
|------|----------|------|
| `manage_facilities` (CRUD) | AUTO | CRUD |
| `schedule_maintenance` | HITL | Mutation |
| `coordinate_event_setup` | HITL | Mutation |
| `get_facility_occupancy` | AUTO | Data |
| `manage_inspections` (CRUD) | AUTO | CRUD |
| `report_facility_issue` | AUTO | Mutation |
| `get_maintenance_schedule` | AUTO | Data |

---
## 1. domain-enums.ts — Master Source of Truth

### Propósito
Enum centralizado para TODOS los dominios. Evita que cada `features/*/types.ts` re-defina enums que comparten múltiples dominios.

### Regla absoluta
> Cross-domain enums → `domain-enums.ts`. Domain-specific enums → `features/*/types.ts`.

### Enums maestros (16 total)

| # | Sección | Enum | Valores count | Consumido por |
|---|---------|------|--------------|---------------|
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
| 15 | Shared | `TREND_DIRECTIONS` | 3 (improving, stable, declining) | **F33: utilization trend** |
| 16 | Shared | `SEVERITY_LEVELS` | 4 (low, medium, high, critical) | **F33: maintenance alerts** |

### Enums maestros adicionales (Shared Patterns)

| # | Enum | Valores | Uso cross-domain |
|---|------|---------|-----------------|
| 17 | `CONFIDENCE_LEVELS` | 3 (low, medium, high) | Advisor scoring universal |
| 18 | `PRIORITY_LEVELS` | 4 (low, medium, high, urgent) | Recommendations, anomalies |
| 19 | `OPERATION_STATUSES` | 8 (draft→cancelled) | Pricing, suggestions, campaigns |
| 20 | `APPROVAL_LEVELS` | 4 (auto, semi, hitl, always_human) | HITL system global |

### Display configs (13)
Cada enum tiene su `*_DISPLAY` record con `label`, `color` (Silver Tide tokens), `bgColor` (color-mix). NUNCA hardcodear colores — usar estos configs.

### Legacy mappings (8)
Transición segura de valores legacy → master. Útiles durante migración incremental. Documentados con source y target.

### Type guards (8)
Runtime validation para strings que vienen del backend. Usar en componentes que reciben datos MCP.

---

## 2. ai-intelligence.ts — AI Type System

### Propósito
Tipos genéricos para TODAS las features AI. Cada dominio extiende estos generics — nunca crea tipos ad-hoc.

### Regla absoluta
> Generic AI types → `ai-intelligence.ts`. Domain AI aliases → aquí también (Section 4). Component-specific shapes → `features/*/types.ts`.

### AI Primitives (7 tipos base)

| # | Tipo | Propósito | Usado por F33 |
|---|------|-----------|---------------|
| 1 | `AIFactor` | Factor individual con impact, direction, weight | Health score factors |
| 2 | `AIRecommendation` | Recomendación con category, impact, priority, effort | Optimization suggestions |
| 3 | `AIProjectedMetric` | Métrica proyectada con confidence interval | Utilization forecast |
| 4 | `AITrendPoint` | Punto time-series con metrics | 7-day utilization data |
| 5 | `AIAlert` | Alerta con urgency + action_required | Maintenance overdue, capacity overflow |
| 6 | `AIPositiveTrend` | Tendencia positiva con impact | Operational improvements |
| 7 | `AIRiskFactor` | Riesgo con severity, probability, mitigation | Structural/compliance risks |

### AI Output Types (8 tipos compuestos)

| # | Tipo | Propósito | Extension F33 |
|---|------|-----------|---------------|
| 1 | `AIPrediction<T>` | Predicción genérica con confidence + factors | `AIPrediction<number>` para utilization forecast |
| 2 | `AIAnalysis` | Reporte multi-dimensión (findings, recommendations, alerts, trends, risks) | Base de `FacilitiesAnalysis` |
| 3 | `AIHealthScore` | Score compuesto 0-100 con grade, level, factors[] | Facility health composite |
| 4 | `AIFinding` | Hallazgo con type, severity, evidence | Intelligence panel findings |
| 5 | `AINarrative` | Narrativa AI (root_cause, benchmark, recommendation) | Advisor "Análisis Profundo" |
| 6 | `AIScenario` | Escenario de simulación con probability | Space optimization scenarios |
| 7 | `AISimulation` | 3 escenarios + risk_assessment + recommended | "Simular" button en banner |
| 8 | `AIActionPlan` / `AIActionPlanItem` | Plan priorizado con items ejecutables | Maintenance prioritization plan |

### Brief Type (1)

| # | Tipo | Propósito |
|---|------|-----------|
| 1 | `AIBrief` | Documento ejecutivo con markdown, key_points, talking_points, q_and_a |

### Advisor Types (5)

| # | Tipo | Propósito | Uso F33 |
|---|------|-----------|---------|
| 1 | `AdvisorInsightBase` | Base para TODOS los domain insights (id, impact, title, reasoning, confidence, action?) | `FacilitiesAdvisorInsight extends AdvisorInsightBase` |
| 2 | `AdvisorCommand` | Acción ejecutable (server, tool, params, approval_level, label) | 5 acciones facilities |
| 3 | `AdvisorActionState` | Estado de ejecución (idle/loading/done/error) | Banner button states |
| 4 | `AdvisorReaction` | Feedback post-ejecución (source, status, reaction, next_step) | Reaction system |
| 5 | `AdvisorLayer` | 15 layers posibles (macro, micro, fusion, diagnostic, health, etc.) | health, utilization, maintenance, space, cross_domain |

### Domain AI Aliases (8 existentes → 1 nueva para F33)

| # | Alias | Domain | F33 status |
|---|-------|--------|-----------|
| 1 | `EventAttendancePrediction` | events | — |
| 2 | `FinancialAnalysis` | financial | — |
| 3 | `SatisfactionAnalysis` | satisfaction | — |
| 4 | `EngagementAnalysis` | engagement | — |
| 5 | `CommunicationAnalysis` | communication | — |
| 6 | `FamilyIntelligence` | family | — |
| 7 | `WellnessAnalysis` | wellness | — |
| 8 | `EventOptimization` | events | — |
| 9 | `ConflictAnalysis` | events | — |
| **10** | **`FacilitiesAnalysis`** | **facilities** | **NUEVO — crear en F33** |

### AI Domain Registry (12 dominios)

```typescript
AI_DOMAINS = [
  "financial", "events", "engagement", "communication",
  "family", "wellness", "satisfaction", "facilities",    // ← facilities YA registrado
  "cultural_social", "sports", "executive", "global",
]
```

**Nota:** El color de `facilities` en `AI_DOMAIN_DISPLAY` es `silver-300` (gris). Todos los demás dominios activos tienen colores vivos. Considerar upgrade a `teal-400` para F33.

### Helpers (6 funciones)

| # | Función | Propósito | Uso F33 |
|---|---------|-----------|---------|
| 1 | `getConfidenceLevel(score)` | Devuelve low/medium/high | Advisor confidence badges |
| 2 | `getConfidenceDisplay(score)` | Devuelve level + label + color | Advisor banner display |
| 3 | `sortInsightsByPriority(insights)` | Ordena por impact DESC, confidence DESC | Banner rendering order |
| 4 | `filterInsightsByImpact(insights, min)` | Filtra por mínimo impact | Banner threshold |
| 5 | `generateInsightId(domain, rule)` | ID único para insight | Hook rule output |
| 6 | `generateReactionId()` | ID único para reaction | Post-execution feedback |

---

## 3. Mapeo de reutilización para F33

### De domain-enums.ts → features/facilities/types.ts

| Qué importar | Por qué |
|---|---|
| `TREND_DIRECTIONS`, `TREND_DISPLAY` | Utilization trend en intelligence panel |
| `SEVERITY_LEVELS`, `SEVERITY_DISPLAY` | Maintenance alert severity |
| `PRIORITY_LEVELS`, `PRIORITY_DISPLAY` | Optimization priority |
| `CONFIDENCE_LEVELS`, `CONFIDENCE_DISPLAY` | Advisor confidence scoring |
| `EVENT_CATEGORIES`, `EVENT_CATEGORY_DISPLAY` | Cross-domain con coordinate_event_setup |
| `DisplayConfig` interface | Facility-specific display configs |

### De ai-intelligence.ts → features/facilities/types.ts

| Qué importar | Por qué |
|---|---|
| `AdvisorInsightBase` | Base para `FacilitiesAdvisorInsight` |
| `AdvisorCommand` | Acciones del advisor (5 facilities actions) |
| `AdvisorReaction` | Post-execution feedback |
| `AIHealthScore` | Facility health composite score |
| `AIAnalysis` | Base para `FacilitiesAnalysis` |
| `AIPrediction<T>` | Utilization forecast |
| `AIRecommendation` | Space optimization suggestions |
| `AITrendPoint` | Utilization time-series |
| `AIAlert` | Maintenance/capacity alerts |
| `AIFactor` | Health score factor breakdown |
| `sortInsightsByPriority()` | Banner insight ordering |
| `filterInsightsByImpact()` | Banner threshold filtering |
| `generateInsightId()` | Insight ID generation |
| `getConfidenceLevel()` | Confidence badge rendering |

### Lo que F33 crea en features/facilities/types.ts (domain-specific)

| Tipo/Enum | Razón de stay domain-specific |
|---|---|
| `FacilityType` (13 values) | Como `SportType` — solo facilities |
| `FacilityStatus` (5 values) | Solo facilities |
| `MaintenanceType` (6 values) | Solo facilities |
| `MaintenanceStatus` (5 values) | Solo facilities |
| `MaintenancePriority` (4 values) | Solo facilities (mapping a SEVERITY_DISPLAY para display) |
| `SetupStatus` (5 values) | Solo facilities |
| `InspectionResult` (4 values) | Solo facilities |
| `FacilitiesAdvisorInsight` | Extiende AdvisorInsightBase con layers domain-specific |
| `FacilitiesAnalysis` (alias) | Extiende AIAnalysis con campos facilities-specific |
| Transform helpers | `summaryToKPIs`, `buildOccupancyGrid`, `buildMaintenanceKPIs` |
| Config maps | `FACILITY_TYPE_DISPLAY`, `FACILITY_STATUS_DISPLAY`, `MAINTENANCE_*_DISPLAY`, etc. |

---

## 4. Anti-duplicación — Checklist antes de crear cualquier tipo

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKLIST ANTI-DUPLICACIÓN                                 ║
║                                                              ║
║  Antes de crear un tipo/enum en features/facilities/types.ts:║
║                                                              ║
║  1. ¿Existe en domain-enums.ts?                              ║
║     → SI: importar, NO re-definir                            ║
║     → NO: continuar                                          ║
║                                                              ║
║  2. ¿Es un AI type genérico?                                 ║
║     → SI: ¿existe en ai-intelligence.ts?                     ║
║       → SI: importar                                         ║
║       → NO: crear en ai-intelligence.ts primero              ║
║     → NO: continuar                                          ║
║                                                              ║
║  3. ¿Es domain-specific (FacilityType, etc.)?               ║
║     → SI: crear en features/facilities/types.ts              ║
║     → NO: reconsiderar dónde va                              ║
║                                                              ║
║  4. ¿Otro dominio podría necesitarlo?                        ║
║     → SI: crear en domain-enums.ts o ai-intelligence.ts      ║
║     → NO: stay en domain types.ts                            ║
║                                                              ║
║  5. ¿Los colores usan Silver Tide tokens?                    ║
║     → SI: proceder                                           ║
║     → NO: PARAR — usar var(--color-*) o color-mix()         ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Nota para Checkpoint y CLAUDE_CONTEXT.md

```
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️  INCLUIR EN CHECKPOINT F33 Y CLAUDE_CONTEXT.md              ║
║                                                                  ║
║  1. Este resumen ejecutivo como sección nueva                   ║
║     "Centralized Type System Reference"                          ║
║                                                                  ║
║  2. Actualizar domain-enums.ts:                                  ║
║     - Total enums: 16 → verificar count real                    ║
║     - Agregar nota: "FacilityType y similares → stay domain"    ║
║                                                                  ║
║  3. Actualizar ai-intelligence.ts:                               ║
║     - Agregar FacilitiesAnalysis alias (Section 4)              ║
║     - Actualizar AI_DOMAIN_DISPLAY.facilities.color             ║
║     - Total domain aliases: 8 → 9 (con facilities)             ║
║                                                                  ║
║  4. Actualizar CLAUDE_CONTEXT.md sección 4 (Stack):             ║
║     - Agregar domain-enums.ts como "Master Source of Truth"     ║
║     - Agregar ai-intelligence.ts como "AI Type System"          ║
║                                                                  ║
║  5. Actualizar CLAUDE_CONTEXT.md sección 8 (Mock System):       ║
║     - Agregar regla: "Before creating types, check              ║
║       domain-enums.ts y ai-intelligence.ts primero"             ║
║                                                                  ║
║  6. Agregar regla #30+ al set de reglas:                        ║
║     "Cross-domain enums → domain-enums.ts"                      ║
║     "AI generic types → ai-intelligence.ts"                     ║
║     "Domain-specific → features/*/types.ts"                     ║
╚══════════════════════════════════════════════════════════════════╝
```

---
