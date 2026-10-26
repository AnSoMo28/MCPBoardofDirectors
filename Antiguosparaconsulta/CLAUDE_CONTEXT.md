markdown
markdown
# CLAUDE_CONTEXT.md — Castillo Country Club Frontend

> Archivo de memoria para continuidad entre conversaciones.
> LEER COMPLETO antes de escribir cualquier código.
> Actualizado: Sprint 12A + 11F Fusionado — Fase 7 Completada / Fase 8 Análisis Completo

---

## 0. MI ROL

Soy el **Principal FullStack Engineer** del Castillo Country Club.
Mis responsabilidades cubren cuatro disciplinas:

| Disciplina | Enfoque |
|---|---|
| **FullStack Engineering** | React 19 + TypeScript frontend, MCP backend integration, arquitectura de componentes |
| **UX Architecture** | Design System Silver Tide, jerarquía visual, data density, mobile-first |
| **Product Strategy** | Priorización, detección de deuda técnica, overengineering, trade-offs |
| **Private Club Operations** | Finanzas de clubes privados (P&L, cash flow, revenue management), marketing premium (lifecycle, churn, NPS), operaciones de club de campo en Costa Rica |

**Principios de trabajo:**
- Cada archivo lo analizo con el framework completo (finanzas, UX, operaciones, tech)
- Los reportes AI son herramientas de DECISIÓN, no decoración
- Detecto overengineering, deuda técnica, acoplamiento excesivo
- Nunca omito recomendaciones
- Propongo y analizo ANTES de escribir código. El usuario aprueba antes de generar

---

## 1. PROYECTO

Aplicación web React para gestión integral del **Castillo Country Club**,
club de campo de alto nivel en Costa Rica.

**Tech Stack:**
- React 19 + TypeScript
- React Router v7 (createBrowserRouter)
- TanStack Query (@tanstack/react-query) — datos del servidor
- Zustand — estado local (auth, theme, sidebar, notifications)
- Framer Motion — animaciones
- Lucide React — iconos
- Tailwind CSS 4 (via @tailwindcss/vite)
- Backend MCP (Model Context Protocol) — NO hay REST API genérica
- Backend FastAPI en localhost:8001 (Vite proxy: /api → localhost:8001)
- Única excepción REST: auth (login/logout/refresh) + chat (/api/chat/)

---

## 2. ROLES DE USUARIO

| Frontend | Backend | Acceso |
|----------|---------|--------|
| ADMIN    | "admin" | Acceso total |
| STAFF    | "staff" | Operaciones diarias |
| JUNTA    | "junta" | Directiva, dashboard ejecutivo, reportes, finanzas |
| SOCIO    | "socio" | Portal /mi-club |

**Auth flow:** Login devuelve JSON con tokens + user.role (lowercase).
auth.store.ts normaliza lowercase → UPPERCASE.

**Login response:**
```json
{
  "status": "success",
  "message": "Bienvenido, ...",
  "tokens": {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "admin",
    "family_id": null
  }
}


3. DESIGN SYSTEM — "Silver Tide"

Dark-first cinematic. Paleta en global.css via @theme de Tailwind 4.


REGLA DE ORO: NUNCA colores hardcoded. SIEMPRE tokens.

3.1 Token Map (hex values para Recharts)

text
text
--color-abyss:        #080B12     (fondo base)
--color-surface-0:    #0D1117     (superficies base)
--color-surface-1:    #151B24     (superficies nivel 1)
--color-surface-2:    #1C2230     (superficies nivel 2 — datos/cards)
--color-surface-3:    #242C3A     (superficies nivel 3)

--color-silver-100:   #F0F2F5     (texto principal bright)
--color-silver-200:   #D8DCE4     (texto principal)
--color-silver-300:   #B8C0CC     (texto secondary)
--color-silver-400:   #8A95A5     (texto muted)
--color-silver-500:   #5C6978     (placeholder text)
--color-silver-600:   #3D4755     (disabled)

--color-gold-400:     #C9A96E     (acento primario / marca)
--color-teal-400:     #2A9AB5     (funcional / datos / info)
--color-emerald-400:  #3DAA70     (éxito / positivo)
--color-amber-400:    #D4A840     (warning)
--color-rose-400:     #C46470     (error / destructivo)
--color-terracotta-400: #D47A5A   (tierra / charts)
--color-sage-400:     #5B8A6A     (verde elegante)

3.2 Patrones

text
text
bgColors:  color-mix(in srgb, var(--color-xxx) 12%, transparent)
Bordes:    border-white/[0.06] sutil | [0.08] medio | [0.12] emphasis
Shadows:   var(--shadow-card) | var(--shadow-elevated) | var(--shadow-soft)

3.3 Tipografía (Google Fonts CDN)

text
text
--font-display: "Cormorant Garamond"   — headings
--font-body:    "Source Serif 4"        — body text
--font-ui:      "DM Sans"              — UI elements
--font-mono:    "DM Mono"              — data/numbers

3.4 SUPERFICIES — REGLA CRÍTICA

NO usar backdrop-filter para contenedores de datos.
El WebGL background del DashboardLayout causa interferencia con backdrop-blur.


Patrón correcto para superficies de datos:

text
text
"rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)]"

3.5 Clases CSS Globales Disponibles

text
text
glass-card  — Tarjeta con efecto vidrio (para superficies decorativas, NO datos)
glass-input — Input con efecto vidrio

3.6 Recharts Theme — REGLA CRÍTICA

SVG attributes de Recharts requieren valores HEX, no CSS vars.


Archivo: shared/lib/chartTheme.ts


typescript
typescript
export const CHART = {
  axisTick: "#8A95A5",          // --color-silver-400
  axisLabel: "#C8D1DC",         // --color-silver-300
  tooltipBg: "#1C2230",         // --color-surface-2
  tooltipText: "#D8DCE4",       // --color-silver-200
  tooltipBorder: "rgba(255,255,255,0.08)",
  gridStroke: "rgba(255,255,255,0.06)",
  cursorFill: "rgba(255,255,255,0.03)",
} as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: CHART.tooltipBg,
    border: `1px solid ${CHART.tooltipBorder}`,
    borderRadius: "8px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  },
  itemStyle: { color: CHART.tooltipText },
  labelStyle: { color: "#F0F2F5" },
} as const;

export const AXIS_TICK = {
  tick: { fill: CHART.axisTick, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART.gridStroke },
} as const;

export const CHART_PALETTE = {
  gold: "#C9A96E",
  terracotta: "#D47A5A",
  sage: "#5B8A6A",
  teal: "#2A9AB5",
  rose: "#C46470",
  emerald: "#3DAA70",
  amber: "#D4A840",
  silver: "#B8C0CC",
} as const;

export const CHART_COLORS = [
  CHART_PALETTE.gold,
  CHART_PALETTE.terracotta,
  CHART_PALETTE.sage,
  CHART_PALETTE.teal,
  CHART_PALETTE.rose,
  CHART_PALETTE.emerald,
];

3.7 Risk Theme

Archivo: shared/lib/riskTheme.ts


Centraliza colores de riesgo en tokens Silver Tide. Paralelo a chartTheme.ts.
Contiene: RISK_CATEGORY_CONFIG (6 categorías), RISK_LEVEL_CONFIG (4 niveles), PROBABILITY_LABELS, IMPACT_LABELS, getRiskLevel(), getRiskCellColor(), getRiskCellBg(). Helper interno withAlpha(hex, alpha) para generar rgba() limpios.


3.8 Aurora Glow System

GlowButton: borde de luz rotatoria con conic-gradient + @property --glow-angle.
Respeta prefers-reduced-motion y pointer: coarse.


Card con glowColor prop: activa clase .glow-card con box-shadow basado en --glow-color.


Paleta de glow por actividad:


text
text
Piscina/Acuáticas:      var(--color-teal-400)       #2A9AB5
Pista de hielo:         var(--color-teal-200)       #7ACCE0
Aire libre/Naturaleza:  var(--color-emerald-400)    #3DAA70
Deportes:               var(--color-gold-400)       #C9A96E
Eventos sociales:       var(--color-gold-300)       #D4B96A
Cultural:               var(--color-terracotta-400) #D47A5A
Gastronómico:           var(--color-amber-400)      #D4A840
Infantil:               var(--color-sage-400)       #5B8A6A
Corporativo:            var(--color-silver-300)     #B8C0CC
Wellness/Spa:           var(--color-emerald-300)    #6DD4A0
Privado/Exclusivo:      var(--color-gold-200)       #E8D49A
Temporada:              var(--color-gold-400)       #C9A96E


4. ESTRUCTURA DE ARCHIVOS (Actualizada)

text
text
src/
├── app/
│   ├── App.tsx                          ✅
│   ├── providers.tsx                    ✅
│   └── router.tsx                       ✅ (ErrorBoundary en todas las rutas)
│
├── stores/
│   ├── auth.store.ts                    ✅ (loginTimestamp agregado Fase 7)
│   ├── theme.store.ts                   ✅
│   ├── sidebar.store.ts                 ✅
│   └── notification-prefs.store.ts      ✅ (NUEVO Fase 7 — Zustand persist)
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Badge.tsx                ✅
│   │   │   ├── Button.tsx               ✅ (focus-visible, aurora-btn)
│   │   │   ├── Card.tsx                 ✅ (+glowColor prop)
│   │   │   ├── Input.tsx                ✅
│   │   │   ├── Skeleton.tsx             ✅
│   │   │   ├── Modal.tsx                ✅ (+focus trap, responsive)
│   │   │   ├── Table.tsx                ✅ (responsive padding)
│   │   │   ├── EmptyState.tsx           ✅
│   │   │   ├── Toast.tsx                ✅ (showToast({ type, message }))
│   │   │   ├── FrostedGlassCard.tsx     ✅
│   │   │   ├── GlowButton.tsx           ✅
│   │   │   ├── CommandPalette.tsx       ✅
│   │   │   ├── NotificationDropdown.tsx ✅
│   │   │   ├── WizardStepper.tsx        ✅
│   │   │   ├── FormField.tsx            ✅
│   │   │   ├── FilterDropdown.tsx       ✅ (single + multi, ARIA)
│   │   │   └── index.ts                ✅
│   │   │
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx      ✅ (+SkipNav, +CommandPalette)
│   │   │   ├── Sidebar.tsx              ✅
│   │   │   ├── Header.tsx               ✅
│   │   │   ├── PageContainer.tsx        ✅
│   │   │   ├── StatCard.tsx             ✅
│   │   │   ├── EmptyState.tsx           ✅
│   │   │   ├── WebGLBackground.tsx      ✅
│   │   │   ├── CursorEffect.tsx         ✅
│   │   │   ├── MarbleCanvas.tsx         ✅
│   │   │   ├── AvatarAura.tsx           ✅
│   │   │   ├── SkipNavigation.tsx       ✅
│   │   │   └── DetailTabs.tsx           ✅ (ARIA, keyboard nav, count badge)
│   │   │
│   │   ├── ai/
│   │   │   └── AIDecisionPanel.tsx      ✅ (NUEVO Fase 8)
│   │   │
│   │   ├── auth/PermissionGate.tsx      ✅
│   │   ├── chat/AIChatWidget.tsx        ✅ (Fase 9 completada)
│   │   ├── error/ErrorBoundary.tsx      ✅
│   │   ├── error/NotFoundPage.tsx       ✅
│   │   └── feedback/Placeholder.tsx     ✅
│   │
│   ├── hooks/
│   │   ├── useMCPQuery.ts               ✅ (incluye useMCPMutation + useExecutiveSummary)
│   │   ├── useBreakpoint.ts             ✅
│   │   └── useReducedMotion.ts          ✅
│   │
│   └── lib/
│       ├── utils.ts                     ✅ (cn, formatCurrency, formatPercent, formatUSD, getGreeting, timeAgo, roleLabel)
│       ├── focusTrap.ts                 ✅
│       ├── chartTheme.ts               ✅ (CHART, TOOLTIP_STYLE, AXIS_TICK, CHART_PALETTE, CHART_COLORS)
│       └── riskTheme.ts                ✅ (NUEVO Fase 7)
│
├── features/
│   ├── auth/
│   │   └── LoginPage.tsx                ⬜ NO se migra
│   │
│   ├── dashboard/                       ← Agent: ExecutiveDashboardAgent
│   │   ├── ExecutiveDashboard.tsx       ✅
│   │   └── components/
│   │       ├── KPICards.tsx             ✅
│   │       ├── RevenueChart.tsx         ✅
│   │       ├── MembershipDonut.tsx      ✅ (pendiente fix: tooltip + useReducedMotion)
│   │       ├── TopActivities.tsx        ✅
│   │       ├── AnomalyFeed.tsx          ✅
│   │       ├── HitlQueue.tsx            ✅ (pendiente fix: botones raw → Button shared)
│   │       ├── QuickActions.tsx         ✅
│   │       ├── AgeBalanceWidget.tsx     ✅ (pendiente fix: mock colors → CHART_PALETTE)
│   │       ├── PeriodSelector.tsx       ✅
│   │       ├── YearOverYearToggle.tsx   ✅
│   │       └── PrintView.tsx            ⬜ Fase 8 (pendiente lectura/rewrite)
│   │
│   ├── families/                        ← Agent: FamilyProfileAgent (families MCP)
│   │   ├── types.ts                     ✅ (FIX Fase 7: TIER_CONFIG tokens)
│   │   ├── FamilyList.tsx               ✅
│   │   ├── FamilyDetail.tsx             ✅
│   │   ├── FamilyForm.tsx               ✅
│   │   └── components/                  ✅
│   │
│   ├── facilities/                      ← Agent: FacilityManagementAgent
│   │   ├── types.ts                     ✅
│   │   ├── FacilityMap.tsx              ✅
│   │   ├── FacilityDetail.tsx           ✅
│   │   └── ReservationCalendar.tsx      ✅
│   │
│   ├── events/                          ← Agent: EventOrchestrator
│   │   ├── types.ts                     ✅ (incluye EVENT_TYPE_CONFIG)
│   │   ├── EventCalendar.tsx            ✅
│   │   ├── EventDetail.tsx              ✅
│   │   └── EventForm.tsx                ✅
│   │
│   ├── finance/                         ← Agents: FinanceAgent + ExecutiveDashboardAgent
│   │   ├── types.ts                     ✅ (FIX Fase 7: TRANSACTION_STATUS_CONFIG)
│   │   ├── FinancialDashboard.tsx       ⬜ Fase 6 (rewrite + AI pendiente)
│   │   └── FamilyAccount.tsx            ✅ (REWRITE Fase 7)
│   │
│   ├── guests/                          ← Agent: GuestManagementAgent
│   │   ├── GuestList.tsx                ✅
│   │   ├── GuestRegistration.tsx        ✅
│   │   └── types.ts                     ✅
│   │
│   ├── communications/                  ← Agent: CommunicationAgent
│   │   ├── CommunicationCenter.tsx      ⬜ Fase 6 (rewrite pendiente)
│   │   ├── AnnouncementBoard.tsx        ✅
│   │   └── EmergencyBroadcast.tsx       ✅
│   │
│   ├── engagement/                      ← Agents: MemberEngagement + Satisfaction + Wellness + ProactiveRecommendation
│   │   ├── EngagementDashboard.tsx      ⬜ Fase 6 (rewrite + AI pendiente)
│   │   ├── ReactivationCampaigns.tsx    ✅
│   │   ├── SatisfactionSurvey.tsx       ✅
│   │   └── SatisfactionReport.tsx       ✅
│   │
│   ├── documents/                       ← Agent: documents (MCP)
│   │   ├── DocumentRepository.tsx       ✅
│   │   └── KnowledgeQuery.tsx           ✅
│   │
│   ├── reports/                         ← Agents: reports (MCP) + ExecutiveDashboardAgent
│   │   ├── types.ts                     ✅ (REWRITE Fase 7)
│   │   ├── RiskHeatmap.tsx              ✅ (REWRITE Fase 7)
│   │   ├── BoardReportViewer.tsx        ✅ (REWRITE Fase 7)
│   │   └── PrintView.tsx                ⬜ Fase 8
│   │
│   ├── settings/                        ← No depende de agente MCP específico
│   │   └── SettingsPage.tsx             ✅ (REWRITE Fase 7)
│   │
│   ├── approvals/                       ← Agent: hitl (MCP)
│   │   └── ApprovalQueue.tsx            ⬜ Fase 6 (rewrite pendiente)
│   │
│   └── mi-club/                         ← Portal SOCIO (multi-agente)
│       ├── MiClubLanding.tsx            ✅ (REWRITE Fase 7)
│       └── MyReservations.tsx           ✅ (REWRITE Fase 7)
│
├── global.css                           ✅
└── index.css → global.css               ✅


5. ARQUITECTURA MCP

5.1 Pattern

typescript
typescript
// Query (lectura)
const { data, isLoading, error } = useMCPQuery<ResponseType>(
  "server_name",   // "finance", "engagement", "families"
  "tool_name",     // "get_financial_summary", "list_families"
  { param1: "value" },
  { staleTime: 60_000 }
);

// Mutation (escritura) — SÍ existe, en shared/hooks/useMCPQuery.ts
const mutation = useMCPMutation<ResponseType>(
  "server_name",
  "tool_name",
  {
    onSuccess: () => { /* invalida queries automáticamente */ }
  }
);

5.2 MCP Execution Flow (Mock Architecture)

text
text
Frontend → useMCPQuery/useMCPMutation → callMCPTool (api.ts)
                                              ↓
                              getMockResponse() busca en REGISTRY
                                              ↓
                                    ¿Existe mock? → Devuelve mock
                                    No existe → Fetch al backend real (/api/mcp)

18 tools registrados como mocks en mock-data.ts
8 tools conectan al backend real
Los mocks definen el shape de datos que el frontend espera
Cuando se migre a backend real, se eliminan mocks uno a uno y el backend debe devolver el mismo shape

5.3 MCP Servers y Tools

Server	Tools	Dominio
executive_dashboard	get_executive_summary, get_financial_overview, get_membership_health, get_operational_pulse, detect_anomalies, get_age_group_balance, generate_quarterly_board_report, export_report	Dashboard ejecutivo
finance	finance_budget_check, finance_account_status, finance_report_generate, finance_expense_create, finance_invoice_create, finance_payment_process, finance_category_update, get_family_account, get_transactions, get_invoices	Finanzas
member_engagement	get_engagement_dashboard, get_engagement_insights, submit_feedback, manage_referrals, design_reactivation_campaign, manage_loyalty_rewards	Engagement
communication	broadcast_club_announcement, manage_emergency_broadcast, send_personalized_notification, manage_notification_templates, schedule_notification, get_notification_history, manage_communication_preferences, send_board_package	Comunicaciones
proactive_recommendation	identify_social_clusters, generate_family_recommendations, generate_quarterly_insights, predict_event_attendance, detect_scheduling_conflicts, personalize_communication, optimize_pricing, suggest_new_activities	Recomendaciones
satisfaction	get_satisfaction_trends, analyze_event_satisfaction, get_survey_for_event, get_satisfaction_questions, generate_satisfaction_report, submit_satisfaction_survey	Satisfacción
wellness	wellness_profile_get, wellness_activity_log, wellness_recommendations, wellness_report, wellness_profile_update, wellness_goal_set, wellness_schedule_class	Wellness
guest_management	get_guest_analytics, manage_guest_privileges, register_guest, plan_private_event, manage_trial_memberships	Invitados
families	list_families, get_family	Familias
facilities	list_facilities, get_facility, get_reservations	Instalaciones
events	list_events, get_event, update_event_status	Eventos
guests	get_today_guests, get_today_summary, list_trial_memberships, checkout_guest	Invitados del día
documents	search_documents	Documentos
reports	get_board_report, get_risk_matrix	Reportes
hitl	get_pending_approvals, approve_request, reject_request	Aprobaciones
auth	(REST excepción)	Login/logout/refresh
chat	(REST POST /api/chat/)	Chat AI — NO MCP, ClaudeService en backend, role-aware


6. AGENTES BACKEND — Desglose Completo

6.1 ExecutiveDashboardAgent — 8 tools

Archivo:backend/src/club_mcp/agents/executive_dashboard_agent.py


Tool	Aprobación	Destino Frontend
get_executive_summary	AUTO	FinancialDashboard, EngagementDashboard
get_financial_overview	AUTO	FinancialDashboard
get_membership_health	AUTO	EngagementDashboard
get_operational_pulse	AUTO	EngagementDashboard
detect_anomalies	AUTO	Ambos dashboards
get_age_group_balance	AUTO	EngagementDashboard
generate_quarterly_board_report	HITL	ApprovalQueue
export_report	SEMI→HITL	ApprovalQueue (condicional: audiencia externa)

Notas clave:

generate_quarterly_board_report devuelve pending_approval, no el reporte directo. execute_board_report() genera el reporte post-aprobación
get_board_report y get_risk_matrix NO están en este agente — viven en el MCP server "reports" separado
detect_anomalies detecta por dominio (membership/financial/operational/engagement) con severidad y acciones sugeridas
get_age_group_balance calcula coeficiente de Gini de participación en runtime
export_report tiene escalación condicional: internamente SEMI_AUTO, escala a HITL si audience es EXTERNAL o MEMBERS
KPIs financieros ya consolidados aquí: Collection Ratio, Operating Margin, Budget Variance, Revenue Growth, anomalías
KPIs de engagement ya consolidados aquí: Satisfaction Score, NPS, At Risk Members, Churn Risk, Engagement Score

Tool propuesto (pendiente aprobación):

generate_ai_analysis — Parámetro scope: "financial" | "engagement". Reutiliza datos de tools existentes. Usa claude_service con fallback determinístico. Estado: PENDIENTE de aprobación backend.

6.2 FinanceAgent — 7 tools

Archivo:backend/src/club_mcp/agents/finance.py


Tool	Aprobación	Destino Frontend
finance_budget_check	AUTO	FinancialDashboard
finance_account_status	AUTO	FinancialDashboard
finance_report_generate	SEMI	FinancialDashboard
finance_expense_create	HITL	ApprovalQueue
finance_invoice_create	HITL	ApprovalQueue
finance_payment_process	HITL	ApprovalQueue
finance_category_update	SEMI	ApprovalQueue

6.3 MemberEngagementAgent — 6 tools

Archivo:backend/src/club_mcp/agents/member_engagement_agent.py


Tool	Aprobación	Destino Frontend
get_engagement_dashboard	AUTO	EngagementDashboard
get_engagement_insights	AUTO	EngagementDashboard
submit_feedback	AUTO	CommunicationCenter
manage_referrals	AUTO	EngagementDashboard
design_reactivation_campaign	HITL	ApprovalQueue
manage_loyalty_rewards	HITL	ApprovalQueue

6.4 CommunicationAgent — 8 tools

Archivo:backend/src/club_mcp/agents/communication_agent.py


Tool	Aprobación	Destino Frontend
broadcast_club_announcement	HITL	CommunicationCenter + ApprovalQueue
manage_emergency_broadcast	ALWAYS_HUMAN	CommunicationCenter + ApprovalQueue (doble aprobación)
send_personalized_notification	SEMI→HITL	CommunicationCenter + ApprovalQueue (>100 destinatarios)
manage_notification_templates	AUTO	CommunicationCenter
schedule_notification	AUTO	CommunicationCenter
get_notification_history	AUTO	CommunicationCenter
manage_communication_preferences	AUTO	CommunicationCenter
send_board_package	SEMI	CommunicationCenter (rol JUNTA)

Hallazgo crítico:get_communication_insights NO existe. El agente NO tiene analytics (open rates, click rates). Solo tiene get_notification_history (logs). CommunicationCenter se limita a historial.


6.5 ProactiveRecommendationAgent — 8 tools

Archivo:backend/src/club_mcp/agents/proactive_recommendation_agent.py


Tool	Aprobación	Destino Frontend
identify_social_clusters	AUTO	EngagementDashboard
generate_family_recommendations	AUTO	EngagementDashboard
generate_quarterly_insights	AUTO	EngagementDashboard
predict_event_attendance	AUTO	EngagementDashboard
detect_scheduling_conflicts	AUTO	EngagementDashboard
personalize_communication	AUTO	CommunicationCenter
optimize_pricing	HITL	ApprovalQueue
suggest_new_activities	HITL	ApprovalQueue

6.6 SatisfactionAgent — 6 tools

Archivo:backend/src/club_mcp/agents/satisfaction_agent.py


Tool	Aprobación	Destino Frontend
get_satisfaction_trends	AUTO	EngagementDashboard
analyze_event_satisfaction	SEMI	EngagementDashboard
get_survey_for_event	AUTO	EngagementDashboard
get_satisfaction_questions	AUTO	—
generate_satisfaction_report	SEMI	EngagementDashboard
submit_satisfaction_survey	HITL (auto-approve)	ApprovalQueue (audit trail)

6.7 WellnessAgent — 7 tools

Archivo:backend/src/club_mcp/agents/wellness_agent.py


Tool	Aprobación	Destino Frontend
wellness_profile_get	AUTO	EngagementDashboard
wellness_activity_log	AUTO	EngagementDashboard
wellness_recommendations	AUTO	—
wellness_report	AUTO	EngagementDashboard
wellness_profile_update	SEMI	—
wellness_goal_set	SEMI	—
wellness_schedule_class	HITL	ApprovalQueue

6.8 GuestManagementAgent — 5 tools

Archivo:backend/src/club_mcp/agents/guest_management_agent.py


Tool	Aprobación	Destino Frontend
get_guest_analytics	AUTO	EngagementDashboard
manage_guest_privileges	AUTO	—
register_guest	SEMI→HITL	ApprovalQueue (condicional: >4/día)
plan_private_event	HITL	ApprovalQueue
manage_trial_memberships	HITL	ApprovalQueue


7. SISTEMA DE APROBACIONES

7.1 Niveles de Aprobación

Nivel	Significado	Visual en ApprovalQueue
AUTO	Sin intervención humana	No aparece en queue
SEMI	Aprobación condicional	Badge amarillo, aparece solo cuando se activa condición
HITL	Human-in-the-loop siempre	Badge rojo, requiere acción
ALWAYS_HUMAN	Doble confirmación	Badge rojo pulsante + paso extra de confirmación

7.2 Patrones de Escalación Condicional (3 patrones)

Tool	Agente	Condición
register_guest	GuestManagement	>4 invitados/día → HITL
send_personalized_notification	Communication	>100 destinatarios → HITL
export_report	ExecutiveDashboard	audiencia externa → HITL

7.3 ApprovalQueue — 17 tipos consolidados

#	Agente	Tool	Nivel	Tipo	Riesgo
1	Finance	finance_expense_create	HITL	Gasto	Alto
2	Finance	finance_invoice_create	HITL	Factura	Alto
3	Finance	finance_payment_process	HITL	Pago	Alto
4	Engagement	design_reactivation_campaign	HITL	Campaña masiva	Alto
5	Engagement	manage_loyalty_rewards	HITL	Recompensa	Medio
6	Communication	broadcast_club_announcement	HITL	Anuncio masivo	Alto
7	Communication	manage_emergency_broadcast	ALWAYS_HUMAN	Emergencia	Crítico
8	Communication	send_personalized_notification	SEMI→HITL	Notif. masiva	Medio
9	Proactive	optimize_pricing	HITL	Cambio de precio	Alto
10	Proactive	suggest_new_activities	HITL	Nueva actividad	Medio
11	Wellness	wellness_schedule_class	HITL	Clase	Bajo
12	Guests	plan_private_event	HITL	Evento privado	Alto
13	Guests	manage_trial_memberships	HITL	Trial membership	Medio
14	Guests	register_guest	SEMI→HITL	Excepción límite	Bajo
15	Executive	generate_quarterly_board_report	HITL	Informe junta	Alto
16	Executive	export_report	SEMI→HITL	Export externo	Medio
17	Satisfaction	submit_satisfaction_survey	HITL (auto-approve)	Encuesta	N/A


8. MAPEO: ARCHIVOS FRONTEND → AGENTES

8.1 ExecutiveDashboardAgent
Archivo	Uso
features/dashboard/ExecutiveDashboard.tsx	Padre — consolida datos de todos los sub-componentes
features/dashboard/components/KPICards.tsx	KPIs de get_executive_summary
features/dashboard/components/RevenueChart.tsx	Revenue data de get_financial_overview
features/dashboard/components/MembershipDonut.tsx	Tier data de get_membership_health
features/dashboard/components/TopActivities.tsx	Activities de get_operational_pulse
features/dashboard/components/AnomalyFeed.tsx	Anomalías de detect_anomalies
features/dashboard/components/HitlQueue.tsx	Pendientes HITL del agente
features/dashboard/components/AgeBalanceWidget.tsx	Grupos etarios de get_age_group_balance
features/dashboard/components/QuickActions.tsx	Acciones rápidas (navegación)
features/dashboard/components/PeriodSelector.tsx	Selector de periodo para queries
features/dashboard/components/YearOverYearToggle.tsx	Toggle YoY
features/dashboard/components/PrintView.tsx	Vista de impresión
features/finance/FinancialDashboard.tsx	Parcial — usa get_financial_overview, detect_anomalies
features/engagement/EngagementDashboard.tsx	Parcial — usa get_membership_health, get_operational_pulse, get_age_group_balance
features/reports/BoardReportViewer.tsx	Indirecto — usa reports MCP pero KPIs alineados con Executive
features/reports/RiskHeatmap.tsx	Embebido en BoardReportViewer

8.2 FinanceAgent
Archivo	Uso
features/finance/FinancialDashboard.tsx	Principal — budget, account status, reports
features/finance/FamilyAccount.tsx	get_family_account, get_transactions, get_invoices

8.3 MemberEngagementAgent
Archivo	Uso
features/engagement/EngagementDashboard.tsx	Principal — dashboard, insights, referrals
features/engagement/ReactivationCampaigns.tsx	design_reactivation_campaign
features/engagement/SatisfactionSurvey.tsx	submit_feedback
features/engagement/SatisfactionReport.tsx	Reportes de satisfacción

8.4 CommunicationAgent
Archivo	Uso
features/communications/CommunicationCenter.tsx	Principal — broadcasts, notifications, templates, historial
features/communications/AnnouncementBoard.tsx	broadcast_club_announcement
features/communications/EmergencyBroadcast.tsx	manage_emergency_broadcast

8.5 ProactiveRecommendationAgent
Archivo	Uso
features/engagement/EngagementDashboard.tsx	Parcial — clusters, recomendaciones, insights, predicciones
features/communications/CommunicationCenter.tsx	Parcial — personalize_communication
features/mi-club/MiClubLanding.tsx	Parcial — generate_family_recommendations (futuro)

8.6 SatisfactionAgent
Archivo	Uso
features/engagement/EngagementDashboard.tsx	Parcial — satisfaction trends, analytics
features/engagement/SatisfactionSurvey.tsx	get_survey_for_event, get_satisfaction_questions
features/engagement/SatisfactionReport.tsx	generate_satisfaction_report

8.7 WellnessAgent
Archivo	Uso
features/engagement/EngagementDashboard.tsx	Parcial — wellness profile, activity, report

8.8 GuestManagementAgent
Archivo	Uso
features/guests/GuestList.tsx	get_guest_analytics, manage_guest_privileges
features/guests/GuestRegistration.tsx	register_guest
features/approvals/ApprovalQueue.tsx	Parcial — plan_private_event, manage_trial_memberships

8.9 FamilyProfileAgent (families MCP)
Archivo	Uso
features/families/FamilyList.tsx	list_families
features/families/FamilyDetail.tsx	get_family
features/families/FamilyForm.tsx	family_create_profile, family_update_members
features/mi-club/MiClubLanding.tsx	Parcial — get_family (portal socio)

8.10 EventOrchestrator (events MCP)
Archivo	Uso
features/events/EventCalendar.tsx	list_events, event_get_calendar
features/events/EventDetail.tsx	get_event
features/events/EventForm.tsx	event_create, event_build_program
features/mi-club/MiClubLanding.tsx	Parcial — list_events (eventos próximos)

8.11 FacilityManagementAgent (facilities MCP)
Archivo	Uso
features/facilities/FacilityMap.tsx	list_facilities
features/facilities/FacilityDetail.tsx	get_facility
features/facilities/ReservationCalendar.tsx	get_reservations (mock)
features/mi-club/MyReservations.tsx	get_reservations (portal socio)

8.12 HITL Agent (hitl MCP)
Archivo	Uso
features/approvals/ApprovalQueue.tsx	get_pending_approvals, approve_request, reject_request

8.13 Reports MCP
Archivo	Uso
features/reports/BoardReportViewer.tsx	get_board_report
features/reports/RiskHeatmap.tsx	get_risk_matrix (embebido en BoardReportViewer)
features/reports/PrintView.tsx	Vista de impresión (Fase 8)

8.14 Documents MCP
Archivo	Uso
features/documents/DocumentRepository.tsx	search_documents
features/documents/KnowledgeQuery.tsx	search_documents (query AI)

8.15 Sin dependencia MCP directa
Archivo	Stores/Dependencias
features/settings/SettingsPage.tsx	useAuthStore, useThemeStore, useNotificationPrefsStore, /api/health
features/auth/LoginPage.tsx	REST auth (NO se migra)
features/mi-club/MiClubLanding.tsx	Multi-agente: families + events + engagement


9. COMPONENTES SHARED DISPONIBLES

Componente	Ubicación	Props clave
PageContainer	shared/components/layout/	title, subtitle, actions[]
StatCard	shared/components/layout/	title, value, icon, trend
EmptyState	shared/components/layout/	icon, title, description, action
Card	shared/components/ui/	glowColor prop
CardHeader	shared/components/ui/	title, subtitle, icon
Badge	shared/components/ui/	variant: success, warning, danger, default; size: sm
Button	shared/components/ui/	variant: primary, secondary, ghost; icon
Skeleton	shared/components/ui/	className
Table	shared/components/ui/	responsive padding
Modal	shared/components/ui/	focus trap, responsive
FilterDropdown	shared/components/ui/	single + multi select, ARIA
DetailTabs	shared/components/layout/	tabs con ARIA, keyboard nav, count badge
GlowButton	shared/components/ui/	aurora glow rotatorio
Toast	shared/components/ui/	showToast({ type: "success", message: "..." })
FormField	shared/components/ui/	wrapper label+error+hint
WizardStepper	shared/components/ui/	stepper compartido
AIDecisionPanel	shared/components/ai/	analysisType, data, onRefresh


10. REGLAS DE TRABAJO (21 completas)

1.NUNCA colores hardcoded — siempre var(--color-xxx) o color-mix
2.NUNCA backdrop-filter para superficies de datos — bg-[var(--color-surface-2)] sólido
3.Recharts: importar de shared/lib/chartTheme.ts — NUNCA hex inline
4.Siempre mostrar changelog con reemplazos exactos
5.Código completo cuando cambios >30%, quirúrgico cuando ≤15 líneas
6.badgeVariant son props del Badge, no tokens CSS
7.Tailwind 4 + CSS custom properties
8.Hover glow en botones:@keyframes CSS con gradient
9.Glow en cards:glowColor prop en Card componente
10.Responsiveness: mobile-first, sm/md/lg, touch targets mínimo 44px
11.Accesibilidad:focus-visible (no focus), role, aria-*, prefers-reduced-motion
12.Formularios: con onSubmit, auto-focus primer input en cambio de step
13.Tabs: componente DetailTabs compartido — NO tabs local
14.Filtros: componente FilterDropdown compartido — NO dropdowns local
15.Toast: SIEMPRE showToast({ type: "success", message: "..." })
16.Breadcrumbs: SIEMPRE paths absolutos con /admin/ prefix
17.Botones: SIEMPRE componente Button compartido — NO botones raw
18.Animaciones: SIEMPRE verificar useReducedMotion()
19.AI sections: MCP calls bajo demanda (botón), NO auto-load
20.Responsiveness JS:useBreakpoint() para cambios JS (Recharts radius, margins), Tailwind breakpoints para layout. Mobile: <640px, Tablet: 640-1023px, Desktop: ≥1024px. FABs: bottom-4 right-4 sm:bottom-6 sm:right-6
21.Checklist responsive antes de entregar: 320px, 375px, 768px, 1280px. Recharts adaptados. FABs sin solapar. Touch targets ≥44px


11. RESPONSIVE ARCHITECTURE

Hook disponible

typescript
typescript
// shared/hooks/useBreakpoint.ts
const { isMobile, isTablet, isDesktop, isWide, width } = useBreakpoint();
// matchMedia (event-driven, no resize listeners)
// isMobile: < 640px | isTablet: 640-1023px | isDesktop: ≥ 1024px | isWide: ≥ 1280px

Patrón de uso

Tipo de cambio	Herramienta	Ejemplo
Layout (grid, flex direction, spacing)	Tailwind breakpoints	flex-col sm:flex-row, grid-cols-1 lg:grid-cols-3
Mostrar/ocultar elementos	Tailwind	hidden sm:inline, sm:hidden
Recharts (radius, margins, height)	useBreakpoint()	innerRadius={isMobile ? 45 : 65}
Lógica condicional JS	useBreakpoint()	isMobile ? w-40 : w-56
Alturas de contenedores	Tailwind o hook	h-48 sm:h-72 o isMobile ? "h-48" : "h-72"
FAB position	Tailwind	fixed bottom-4 right-4 sm:bottom-6 sm:right-6
Chat panel position	Tailwind	fixed bottom-20 left-4 sm:bottom-24 sm:left-6


12. METODOLOGÍA DE TRABAJO

Tipo de cambio	Formato
Quirúrgico (≤15 líneas)	"Buscar X → Reemplazar por Y"
Código completo (>30% rewrite)	Archivo entero con changelog al final
Archivos nuevos	Completo + integración (imports, index.ts exports)

Dinámica:

Yo propongo y analizo antes de escribir código
El usuario aprueba antes de generar
Siempre changelog detallado al final
Prioridad: ALTA → MEDIA → BAJA
Los agentes backend se leen para entender el shape de datos y las tools disponibles, no para reescribir backend


13. FASES DEL SPRINT

Fase	Contenido	Estado
1	Infraestructura	✅
2	Global tokens	✅
3	Formularios	✅
4	Lists	✅
5	Detail pages	✅
6	Dashboards densos + AI	⬜ (análisis ✅, implementación pendiente)
7	Reports/mi-club/settings/finance	✅ COMPLETADA
8	Dashboard sub-componentes	⬜ (análisis 12/13 ✅, implementación pendiente)
9	Shared UI restante + chat	✅ COMPLETADA
10	QA + cross-check	✅ COMPLETADA (reporte generado)


14. FASE 7 — COMPLETADA

Archivo nuevo creado
src/shared/lib/riskTheme.ts — Centraliza colores de riesgo en Silver Tide tokens

Archivos reescritos completos (7)

1.src/features/reports/types.ts — Tipos de riesgo re-exportados desde riskTheme.ts. Eliminado RiskMatrixCell (código muerto).
2.src/features/reports/RiskHeatmap.tsx — Eliminada grid muerta. Click-outside handler. Overflow clamping popover. Escape key. useReducedMotion(). Touch targets 44px. ARIA grid/dialog.
3.src/features/reports/BoardReportViewer.tsx — PERIODS dinámico (últimos 5 trimestres). Eliminado TrendIcon (muerto). Un solo botón "Exportar". NPS sin trend hack.
4.src/features/mi-club/MyReservations.tsx — Fix timezone CR (UTC-6): getTodayLocal() usa fecha local. Fix navegación. useReducedMotion(). Error state → EmptyState.
5.src/features/mi-club/MiClubLanding.tsx — EVENT_TYPE_CONFIG importado de events/types. Navegación a detalle. formatCurrency. LandingSkeleton. useReducedMotion().
6.src/features/finance/FamilyAccount.tsx — EmptyState para familyId undefined. Aging buckets 4 (0-30, 31-60, 61-90, 90+). TRANSACTION_STATUS_CONFIG centralizado. Tabs ARIA. useReducedMotion().
7.src/features/settings/SettingsPage.tsx — NotificationPrefsStore Zustand persist. getSessionElapsed() real. useBackendHealth() con fetch /api/health. useReducedMotion(). aria-label en toggles.

Archivos con fixes (2)
8.src/features/families/types.ts — TIER_CONFIG colores → tokens Silver Tide
9.src/stores/auth.store.ts — loginTimestamp agregado


15. FASE 8 — ANÁLISIS COMPLETO (12/13 archivos)

Hallazgos de Arquitectura MCP

#	Hallazgo	Severidad
1	Dashboard actual ignora datos MCP — usa mocks hardcodedos inline	ALTA
2	get_financial_summary NO existe en backend real — solo mock	ALTA
3	get_communication_center_data NO existe en backend real — solo mock	ALTA
4	Tier mismatch: backend "basic"/"premium"/"vip" vs frontend "platino"/"oro"/"plata"/"bronce"	MEDIA
5	useMCPMutation SÍ existe (no documentado en contexto original)	—
6	TOOLTIP_STYLE y AXIS_TICK SÍ existen en chartTheme.ts	—
7	glass-card y glass-input son clases CSS globales válidas	—

Sub-componentes del Dashboard (12 archivos)

text
text
dashboard/
├── ExecutiveDashboard.tsx (padre)
└── components/
    ├── KPICards.tsx
    ├── RevenueChart.tsx
    ├── MembershipDonut.tsx
    ├── TopActivities.tsx
    ├── AnomalyFeed.tsx
    ├── HitlQueue.tsx
    ├── QuickActions.tsx
    ├── AgeBalanceWidget.tsx
    ├── PeriodSelector.tsx
    ├── YearOverYearToggle.tsx
    └── PrintView.tsx (Fase 8 — pendiente lectura)

Problemas cross-cutting del dashboard
Ningún sub-componente usa useReducedMotion() (Regla #18)
Ningún sub-componente importa de chartTheme.ts — todos hardcodean los mismos hex
formatUSD usado en vez de formatCurrency (club costarricense)
Tooltips custom con backdrop-filter: blur() en RevenueChart y MembershipDonut (Regla #2)
YoYContext completo pero KPICards no lo consume — toggle visual sin efecto real
YoYDeltaBadge y YoYSparkline exportados pero nunca importados

Archivos con responsiveness aplicado (Fase 8)

#	Archivo	Cambio
1	PeriodSelector.tsx	flex-col sm:flex-row, "a" hidden en mobile
2	MembershipDonut.tsx	useBreakpoint() para w/radius Recharts
3	RevenueChart.tsx	useBreakpoint() para height y margins
4	AIDecisionPanel.tsx	lg:grid-cols-4 en vez de sm:grid-cols-4
5	QuickActions.tsx	bottom-4 right-4 sm:bottom-6 sm:right-6
6	AIChatWidget.tsx	bottom-20 left-4 sm:bottom-24 sm:left-6


16. HALLAZGOS PENDIENTES (Consolidado)

Severidad ALTA — Pendientes de Fase 6

#	Archivo	Problema	Fix
1	Dashboard completo	Ignora datos MCP, usa mocks inline	Rewire a MCP real
2	FinancialDashboard.tsx	Rewrite + AI pendiente	Fase 6
3	EngagementDashboard.tsx	Rewrite + AI pendiente	Fase 6
4	CommunicationCenter.tsx	Rewrite pendiente	Fase 6
5	ApprovalQueue.tsx	Rewrite pendiente	Fase 6

Severidad ALTA — Corregidas en Fase 7

#	Archivo	Problema	Estado
1	MyReservations.tsx	Bug timezone UTC vs local	✅ Corregido
2	FamilyAccount.tsx	familyId undefined sin empty state	✅ Corregido
3	RiskHeatmap.tsx	Popover sin click-outside	✅ Corregido
4	BoardReportViewer.tsx	PDF = print (mismo botón)	✅ Corregido

Severidad MEDIA — Pendientes

#	Archivo	Problema
1	SettingsPage.tsx	Notificaciones store local no sync con backend
2	SettingsPage.tsx	Versión frontend hardcoded "1.0.0-beta"
3	MiClubLanding.tsx	StatPill duplica funcionalidad de StatCard shared
4	FamilyAccount.tsx	Tab bar local en vez de DetailTabs (Regla #13)
5	FamilyAccount.tsx	Filter select raw en vez de FilterDropdown (Regla #14)
6	FamilyAccount.tsx	Table raw en vez de Table compartido
7	family_profile vs families/types	Tier mismatch backend vs frontend
8	MembershipDonut.tsx	Tooltip con backdrop-filter: blur()
9	AgeBalanceWidget.tsx	Mock group colors no son tokens Silver Tide
10	Sub-componentes dashboard	Hex hardcodeados en vez de chartTheme.ts
11	HitlQueue.tsx	Botones raw en vez de Button shared (Regla #17)
12	MembershipDonut.tsx	Falta useReducedMotion() (Regla #18)

Severidad BAJA — Pendientes

#	Archivo	Problema
1	MiClubLanding.tsx	Engagement thresholds hardcodeados (70/40)
2	MiClubLanding.tsx	formatCurrency podría necesitar ser formatCRC
3	FamilyAccount.tsx	"Realizar Pago" sin handler
4	SettingsPage.tsx	Info sistema hardcoded (versión, framework)
5	RiskHeatmap.tsx	Emojis como icons en vez de Lucide
6	MyReservations.tsx	Tipos inline no compartidos


17. QA CROSS-CHECK CONTRA LAS 21 REGLAS

Reglas sin violaciones (14/21)

#4 Changelog, #5 Completeness, #6 Badge props, #7 Tailwind 4, #9 Glow cards (glass-card válido), #10 Responsiveness, #12 Formularios, #15 Toast, #16 Breadcrumbs, #19 AI bajo demanda (en archivos reescritos), #20 Responsive JS, #21 Responsive checklist


Violaciones pendientes

Regla	Archivo	Fix
#1 + #3 + #11 + #18	MembershipDonut.tsx	Tooltip → TOOLTIP_STYLE, +useReducedMotion(), tier colors → CHART_PALETTE
#1	AgeBalanceWidget.tsx	Mock group colors → CHART_PALETTE hex
#13	FamilyAccount.tsx	Tab bar → DetailTabs shared
#14	FamilyAccount.tsx	Filter → FilterDropdown shared
#17	HitlQueue.tsx	Botones raw → Button shared
#2	MembershipDonut.tsx	Tooltip backdrop-filter → sólido
#19	EngagementDashboard.tsx	Verificar AI bajo demanda (Fase 6)
#19	CommunicationCenter.tsx	Verificar AI bajo demanda (Fase 6)

Imports rotos — Verificación: SIN IMPORTS ROTOS

Mock keys — Verificación: TODAS LAS KEYS MATCHean REGISTRY


18. ARCHIVOS FASE 7 — Rutas y Orden de Trabajo

Grupo A: Reports (RiskHeatmap es dependencia de BoardReportViewer)

#	Archivo	Líneas aprox	Dependencia
1	src/features/reports/types.ts	~150	Ninguna
2	src/features/reports/RiskHeatmap.tsx	~300-400	types.ts
3	src/features/reports/BoardReportViewer.tsx	~500-700	RiskHeatmap

Grupo B: Portal Socio

#	Archivo	Líneas aprox	Dependencia
4	src/features/mi-club/MyReservations.tsx	~300-400	Ninguna
5	src/features/mi-club/MiClubLanding.tsx	~400-500	families/events types

Grupo C: Finance y Settings

#	Archivo	Líneas aprox	Dependencia
6	src/features/finance/FamilyAccount.tsx	~400-500	finance types
7	src/features/settings/SettingsPage.tsx	~200-300	Stores


19. PRÓXIMOS PASOS

Inmediato — Fase 6 (implementación)
Archivos a reescribir:

1.src/features/finance/FinancialDashboard.tsx (rewrite + AI)
2.src/features/engagement/EngagementDashboard.tsx (rewrite + AI)
3.src/features/communications/CommunicationCenter.tsx (rewrite)
4.src/features/approvals/ApprovalQueue.tsx (rewrite)

Agentes backend necesarios: finance.py, member_engagement_agent.py, communication_agent.py, base.py (HITL pattern)


Corto plazo — Fase 8 (implementación)
Sub-componentes del dashboard (12 archivos) — rewire a datos MCP reales
PrintView.tsx — pendiente lectura/rewrite
PDF export real (html2pdf.js o @react-pdf/renderer)

Futuro
Tool generate_ai_analysis para ExecutiveDashboardAgent (pendiente aprobación backend)
Sync notification prefs con family_set_preferences de FamilyProfileAgent
Tier mapping backend↔frontend
get_communication_insights tool nuevo si se necesitan analytics