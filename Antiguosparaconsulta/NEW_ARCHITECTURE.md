# PROPUESTA ARQUITECTÓNICA INTEGRAL — Castillo AI Platform

## Next Generation Architecture: De Plataforma Funcional a Sistema de Inteligencia Centralizado

---

## PARTE I — AUDITORÍA DEL ESTADO ACTUAL (Sin filtros, sin endulzar)

### 1.1 Lo que tenemos (real)

| Dimensión | Estado | Evaluación honesta |
|---|---|---|
| **Agents MCP** | 19 agents, ~185 tools | Fuerte. Pero 32 tools son mock-only — el sistema finge funcionar en ~17% de sus herramientas |
| **Advisor Rules** | 129+ rules, 10 hooks | Impresionante en cantidad. Pero cada hook reimplementa la misma lógica de evaluación — ~60% código duplicado entre hooks |
| **RAG Engine** | 8 tools, hybrid search | Sólido. Pero solo comunicación lo usa (1 de 10 domains) |
| **Design System** | Silver Tide, 60+ tokens | Centralizado en CSS. Pero 4 phantom tokens siguen en código vivo (`gold-light`, `gold-mid`) |
| **Type System** | domain-enums + ai-intelligence | Excelente decisión. Pero transform helpers viven en 12+ archivos separados |
| **Mock System** | normalizeEnums (195 fixes) | Funciona pero es una curita — el paciente tiene fractura. Los factories siguen produciendo datos incorrectos |
| **Cross-Domain** | Global Advisor (25 rules) | Conceptualmente fuerte. Pero las señales cross-domain son hardcoded — no hay bus real |
| **MCP Compliance** | ~80% real, ~20% parcial | Hay interceptaciones en `api.ts` que bypassan el registry. Hay tools que no usan el protocolo MCP correctamente |
| **Health Scores** | 6 domains tienen health score | Cada uno computa diferente — pesos, factores, escalas son independientes |
| **AI Tools** | 5 (narrative, plan, sim, brief, chat) | Funcionan pero no están conectadas a la reacción del usuario — no aprenden |

### 1.2 Los 7 problemas sistémicos identificados

| # | Problema | Severidad | Impacto |
|---|---------|-----------|---------|
| **P1** | **Duplicación de Advisor Logic** — 10 hooks con ~200 líneas cada uno reimplementan: `evaluateRules()`, `sortByImpact()`, `filterByConfidence()`, `buildInsight()`. Si cambio la lógica de evaluación, debo cambiar 10 archivos | ALTA | Mantenibilidad: cada cambio de Advisor toca 10 archivos |
| **P2** | **MCP no es 100%** — `api.ts` tiene `getMockResponse()` con interceptaciones por tool name que bypassan el registry. Hay 3 paths distintos para llegar a datos: mock directo, registry, backend | ALTA | Confianza: no sabemos qué path usa cada tool |
| **P3** | **No hay migración automática mock→real** — Cada tool se migra manualmente. No hay tracking de qué es mock, qué es real, ni auto-switch cuando el backend está listo | ALTA | Velocity: cada tool nuevo requiere trabajo manual doble |
| **P4** | **Health Scores inconsistentes** — Financial usa 5 factores ponderados, Wellness usa 4, Communication usa 5 diferentes, Sports usa score compuesto distinto. No hay definición estándar de "salud" | MEDIA | UX: el usuario ve "78/100" en finance y "72/100" en wellness pero significan cosas completamente distintas |
| **P5** | **Cross-domain signals hardcodeados** — El Global Advisor referencia otros dominios directamente: `financialData.revenue`, `eventData.attendance`. No hay abstracción | MEDIA | Acoplamiento: agregar un dominio requiere modificar el Global Advisor |
| **P6** | **Transform helpers esparcidos** — `summaryToKPIs()`, `buildTierData()`, `extractTrends()` viven en 12+ `types.ts` con patrones idénticos | MEDIA | Duplicación: ~800 líneas de transform code repetido |
| **P7** | **Sin feedback loop real** — El Reaction System muestra tarjetas pero no computa si la acción tuvo el efecto esperado. El sistema propone pero no aprende | MEDIA | Inteligencia: el Advisor no mejora con el tiempo |

---

## PARTE II — MAPA DE CENTRALIZACIÓN COMPLETO

### 2.1 Ya centralizado (mantener)

| # | Qué | Dónde | Estado |
|---|-----|-------|--------|
| 1 | Cross-domain enums (21) | `shared/types/domain-enums.ts` | ✅ |
| 2 | AI generic types | `shared/types/ai-intelligence.ts` | ✅ |
| 3 | CSS tokens (60+) | `globals.css @theme {}` | ✅ |
| 4 | IMPACT_CONFIG | `shared/lib/ui/advisorConfig.ts` | ✅ |
| 5 | Chart theme | `shared/lib/chartTheme.ts` | ✅ |
| 6 | Normalize enums | `shared/mocks/normalizeEnums.ts` | ✅ |
| 7 | Toast system | `shared/components/ui/Toast.tsx` | ✅ |
| 8 | Button primitive | `shared/components/ui/Button.tsx` | ✅ |
| 9 | Formatters | `shared/lib/utils.ts` | ✅ |
| 10 | Generic AdvisorBanner | `shared/components/AdvisorBanner.tsx` | ✅ |

### 2.2 Debe centralizarse (NUEVO)

| # | Qué | Propuesta | Domains afectados | Prioridad |
|---|-----|-----------|-------------------|-----------|
| **C1** | **Advisor Evaluation Engine** | `shared/lib/advisor-engine/` — Motor genérico que reemplaza la lógica duplicada en 10 hooks | 10 advisors | **ALTA** |
| **C2** | **Health Score Composer** | `shared/lib/advisor-engine/health-score.ts` — `computeHealthScore(factors[], weights[])` unificado | 6+ domains | **ALTA** |
| **C3** | **Advisor Rules Registry** | `shared/lib/advisor-engine/rules/{domain}.ts` — Reglas como config declarativa, no como funciones inline | 10 advisors | **ALTA** |
| **C4** | **Cross-Domain Signal Bus** | `shared/lib/advisor-engine/signal-bus.ts` — Dominios emiten señales, otros las consumen | Global Advisor + todos | **ALTA** |
| **C5** | **Transform Helper Registry** | `shared/lib/transforms/{domain}.ts` — Transform helpers centralizados por dominio | 12+ domains | MEDIA |
| **C6** | **Confidence Scorer** | `shared/lib/advisor-engine/confidence.ts` — Un solo algoritmo de confidence para todos | 10 advisors | MEDIA |
| **C7** | **Severity Mapper** | `shared/lib/advisor-engine/severity.ts` — Mapeo unificado: impact+confidence → severity | 10 advisors | MEDIA |
| **C8** | **Action Bridge Registry** | `shared/lib/advisor-engine/actions.ts` — Registro centralizado de acciones ejecutables por domain | 11 actions | MEDIA |
| **C9** | **Mock Factory Base** | `shared/mocks/base-factory.ts` — Pattern base reutilizable para crear factories | ~30 factories | MEDIA |
| **C10** | **Skeleton Presets** | `shared/components/layout/skeletons/{domain}.tsx` — Skeletons específicos por dominio | All dashboards | BAJA |
| **C11** | **Empty State Presets** | `shared/components/layout/empty-states/{domain}.tsx` — Empty states con copy contextual | All lists | BAJA |
| **C12** | **RAG Context Provider** | `shared/lib/rag/RAGProvider.tsx` — Context provider para RAG que cualquier domain agent puede consumir | Communication + futuro | MEDIA |
| **C13** | **MCP Routing Layer** | `shared/lib/mcp/mcp-router.ts` — Capa única de routing que reemplaza `api.ts` interceptations | All tools | **ALTA** |
| **C14** | **Migration Tracker** | `shared/lib/mcp/migration-tracker.ts` — Tracking de qué tools son mock vs real con auto-switch | All 185+ tools | **ALTA** |

---

## PARTE III — ADVISOR ENGINE v2 (La pieza central)

### 3.1 Arquitectura

```
ANTES (10 hooks independientes):
┌─────────────────────────────────────────┐
│ useFinancialAdvisor.ts (~200 líneas)    │  ← buildCtx + 18 rules inline
│ useEventAdvisor.ts (~200 líneas)        │  ← buildCtx + 15 rules inline
│ useSportsAdvisor.ts (~250 líneas)       │  ← buildCtx + 15 rules inline
│ useCommunicationAdvisor.ts (~150)       │  ← buildCtx + 8 rules inline
│ ... (6 más)                             │
│                                         │
│ Lógica duplicada en CADA uno:           │
│ - evaluateRules()                       │
│ - sortByImpactConfidence()              │
│ - filterBySeverity()                    │
│ - generateInsightId()                   │
│ - buildAction()                         │
└─────────────────────────────────────────┘
Total: ~2000 líneas, ~60% duplicado

DESPUÉS (Advisor Engine v2):
┌─────────────────────────────────────────────────────┐
│                ADVISOR ENGINE (shared)               │
│                                                      │
│  AdvisorEngine<T>                                    │
│  ├── evaluate(data): AdvisorInsight[]                │
│  ├── evaluateRules(ctx, rules[]): Insight[]          │
│  ├── sortInsights(insights[]): Insight[]             │
│  ├── buildHealthScore(factors[]): HealthScore        │
│  ├── emitSignals(insights[]): DomainSignal[]         │
│  └── consumeSignals(signals[]): ContextEnrichment    │
│                                                      │
│  RULES (declarative, testable, swappable):            │
│  ├── rules/financial.ts   (18 rules)                 │
│  ├── rules/events.ts      (15 rules)                 │
│  ├── rules/sports.ts      (15 rules)                 │
│  ├── rules/communication.ts (8 rules)                │
│  ├── rules/global.ts      (25 rules)                 │
│  ├── rules/recommendation.ts (7 rules)               │
│  ├── rules/age-group.ts   (12 rules)                 │
│  ├── rules/guest.ts       (14 rules)                 │
│  ├── rules/satisfaction.ts (12 rules)                │
│  └── rules/ml.ts          (10 rules)                 │
│                                                      │
│  HOOKS (thin wrappers ~40 líneas cada uno):          │
│  ├── useFinancialAdvisor → engine.evaluate(data)     │
│  ├── useEventAdvisor → engine.evaluate(data)         │
│  └── ... (8 más)                                     │
│                                                      │
│  CROSS-DOMAIN SIGNAL BUS:                            │
│  ├── signal-bus.ts                                   │
│  ├── Financial signals → Global Advisor consume      │
│  ├── Event signals → Communication Advisor consume   │
│  └── All signals → Global Advisor fusion layer       │
└─────────────────────────────────────────────────────┘
Total: ~800 líneas engine + ~400 líneas hooks = ~1200 (40% reducción)
```

### 3.2 Advisor Engine — Core API

```typescript
// shared/lib/advisor-engine/types.ts

export interface RuleDefinition<T extends BaseContext> {
  id: string;                    // "FIN_HEALTH_SCORE"
  name: string;                  // "Financial Health Score"
  layer: AdvisorLayer;           // "health" | "reactive" | "preventive" | "optimization" | "proactive"
  domain: AIDomain;              // "financial" | "events" | etc.
  evaluate: (ctx: T) => AdvisorInsight | null;
  signals?: DomainSignal[];      // Signals this rule emits when triggered
  consume?: string[];            // Signal names this rule needs from other domains
  priority: number;              // Evaluation order (lower = first)
}

export interface AdvisorConfig<T extends BaseContext> {
  domain: AIDomain;
  buildCtx: (rawData: unknown, signals?: DomainSignal[]) => T;
  rules: RuleDefinition<T>[];
  healthFactors?: HealthFactorDef[];
  defaultWeights?: number[];
}

export interface HealthFactorDef {
  id: string;
  label: string;
  compute: (ctx: BaseContext) => number;  // Returns 0-100
  weight: number;                         // Default weight
  inverse?: boolean;                      // Lower is better (e.g., churn rate)
}
```

### 3.3 Advisor Engine — Implementation

```typescript
// shared/lib/advisor-engine/engine.ts

export class AdvisorEngine<T extends BaseContext> {
  private config: AdvisorConfig<T>;
  
  constructor(config: AdvisorConfig<T>) {
    this.config = config;
    // Validate rules on construction (DEV only)
    if (import.meta.env.DEV) this.validateRules();
  }

  evaluate(rawData: unknown, crossSignals: DomainSignal[] = []): AdvisorResult {
    // 1. Build context enriched with cross-domain signals
    const ctx = this.config.buildCtx(rawData, crossSignals);
    
    // 2. Evaluate all rules in priority order
    const rawInsights = this.config.rules
      .sort((a, b) => a.priority - b.priority)
      .map(rule => this.safeEvaluate(rule, ctx))
      .filter((i): i is AdvisorInsight => i !== null);
    
    // 3. Sort by impact DESC, confidence DESC
    const sorted = sortInsightsByPriority(rawInsights);
    
    // 4. Deduplicate (same rule can't fire twice)
    const deduplicated = deduplicateInsights(sorted);
    
    // 5. Compute health score if factors defined
    const healthScore = this.config.healthFactors
      ? computeHealthScore(ctx, this.config.healthFactors, this.config.defaultWeights)
      : undefined;
    
    // 6. Emit signals for other domains
    const signals = this.emitSignals(deduplicated);
    
    return { insights: deduplicated, healthScore, signals };
  }

  private safeEvaluate(rule: RuleDefinition<T>, ctx: T): AdvisorInsight | null {
    try {
      return rule.evaluate(ctx);
    } catch (e) {
      console.error(`[AdvisorEngine] Rule ${rule.id} failed:`, e);
      return null; // Defensive — one broken rule doesn't crash the engine
    }
  }

  private emitSignals(insights: AdvisorInsight[]): DomainSignal[] {
    return insights
      .filter(i => i.signals?.length)
      .flatMap(i => i.signals!);
  }

  private validateRules(): void {
    const ids = new Set<string>();
    for (const rule of this.config.rules) {
      if (ids.has(rule.id)) {
        console.warn(`[AdvisorEngine] Duplicate rule ID: ${rule.id}`);
      }
      ids.add(rule.id);
    }
  }
}
```

### 3.4 Thin Hook Pattern (reemplaza hooks de ~200 líneas)

```typescript
// features/finance/hooks/useFinancialAdvisor.ts
// ANTES: ~200 líneas con buildCtx + 18 rules inline + evaluateRules + sort + filter
// DESPUÉS: ~45 líneas

import { useAdvisorEngine } from '@/shared/lib/advisor-engine/useAdvisorEngine';
import { FINANCIAL_RULES, buildFinancialCtx, FINANCIAL_HEALTH_FACTORS } from '@/shared/lib/advisor-engine/rules/financial';

export function useFinancialAdvisor(
  summary: FinancialSummary | undefined,
  detail: FinancialDetail | undefined
) {
  return useAdvisorEngine({
    domain: 'financial',
    rawData: { summary, detail },
    rules: FINANCIAL_RULES,
    buildCtx: buildFinancialCtx,
    healthFactors: FINANCIAL_HEALTH_FACTORS,
  });
}
```

### 3.5 Health Score Composer (unificado)

```typescript
// shared/lib/advisor-engine/health-score.ts

export interface HealthFactorInput {
  id: string;
  value: number;        // Raw value
  benchmark?: number;   // Expected/benchmark value
  weight: number;       // 0-1, must sum to 1 across all factors
  inverse?: boolean;    // Lower is better
  min?: number;         // For normalization
  max?: number;         // For normalization
}

export function computeHealthScore(
  factors: HealthFactorInput[]
): HealthScoreResult {
  // Normalize each factor to 0-100
  const normalized = factors.map(f => ({
    ...f,
    normalized: f.inverse
      ? mapInverse(f.value, f.min ?? 0, f.max ?? 100)
      : mapNormal(f.value, f.min ?? 0, f.max ?? 100),
  }));
  
  // Weighted sum
  const score = Math.round(
    normalized.reduce((sum, f) => sum + f.normalized * f.weight, 0)
  );
  
  // Grade + Level
  const { grade, level, color } = getHealthLevel(score);
  
  return {
    score: Math.max(0, Math.min(100, score)),
    grade,
    level,
    color,          // Silver Tide token reference
    factors: normalized.map(f => ({
      id: f.id,
      label: f.label,
      value: f.value,
      normalized: f.normalized,
      contribution: f.normalized * f.weight,
      status: getFactorStatus(f.normalized),
    })),
  };
}

function getHealthLevel(score: number) {
  if (score >= 85) return { grade: 'A', level: 'excepcional', color: 'var(--color-emerald-400)' };
  if (score >= 65) return { grade: 'B', level: 'saludable', color: 'var(--color-teal-400)' };
  if (score >= 45) return { grade: 'C', level: 'atención', color: 'var(--color-amber-400)' };
  return { grade: 'D', level: 'crítico', color: 'var(--color-rose-400)' };
}
```

**Esto reemplaza 6+ implementaciones independientes de health score.**

### 3.6 Cross-Domain Signal Bus

```typescript
// shared/lib/advisor-engine/signal-bus.ts

export interface DomainSignal {
  id: string;                    // "fin_revenue_declining"
  sourceDomain: AIDomain;        // "financial"
  targetDomains: AIDomain[];     // ["global", "communication"]
  severity: SeverityLevel;       // "high"
  value: number;                 // -15 (% decline)
  label: string;                 // "Revenue caída 15% vs mes anterior"
  timestamp: number;
  ttl: number;                   // Signal expires after N ms
}

export class SignalBus {
  private signals: Map<string, DomainSignal> = new Map();
  private listeners: Map<AIDomain, Set<(signal: DomainSignal) => void>> = new Map();

  emit(signal: DomainSignal): void {
    this.signals.set(signal.id, signal);
    // Notify listeners
    for (const domain of signal.targetDomains) {
      this.listeners.get(domain)?.forEach(fn => fn(signal));
    }
  }

  getSignalsFor(domain: AIDomain): DomainSignal[] {
    const now = Date.now();
    return Array.from(this.signals.values())
      .filter(s => 
        s.targetDomains.includes(domain) && 
        now - s.timestamp < s.ttl
      );
  }

  subscribe(domain: AIDomain, callback: (signal: DomainSignal) => void): () => void {
    if (!this.listeners.has(domain)) {
      this.listeners.set(domain, new Set());
    }
    this.listeners.get(domain)!.add(callback);
    return () => this.listeners.get(domain)?.delete(callback);
  }
}

// Singleton
export const signalBus = new SignalBus();
```

**Uso:**
```typescript
// En useFinancialAdvisor — después de evaluar:
signalBus.emit({
  id: 'fin_revenue_decline',
  sourceDomain: 'financial',
  targetDomains: ['global', 'communication'],
  severity: 'high',
  value: -15,
  label: 'Revenue cayó 15% vs mes anterior',
  ...
});

// En useGlobalAdvisor — al construir contexto:
const finSignals = signalBus.getSignalsFor('global');
// ctx.financialHealth = finSignals.find(s => s.id === 'fin_revenue_decline')?.value;
```

---

## PARTE IV — MCP COMPLIANCE 100%

### 4.1 Estado actual del compliance

```
PATH ACTUAL (fragmentado):
┌──────────────────┐
│ Componente        │
│ useMCPQuery()     │
└──────┬───────────┘
       ▼
┌──────────────────┐     ┌─────────────────────┐
│ shared/lib/api.ts │────▶│ getMockResponse()    │ ← INTERCEPTA por tool name
│ callMCPTool()     │     │ (hardcoded switches) │
└──────┬───────────┘     └─────────────────────┘
       ▼ (si no interceptado)
┌──────────────────┐
│ mock-registry.ts  │ ← REGISTRY[server][tool](params)
│ normalizeEnums()  │
└──────┬───────────┘
       ▼ (si backend disponible)
┌──────────────────┐
│ FastAPI /mcp      │ ← Backend real
└──────────────────┘

PROBLEMAS:
1. getMockResponse() intercepta BEFORE registry — 3 tools bypassan el registry
2. No hay tracking de qué path tomó cada tool
3. No hay auto-switch cuando backend está listo
4. El developer no sabe si está viendo datos reales o mocks
```

### 4.2 Propuesta: MCP Router Unificado

```typescript
// shared/lib/mcp/mcp-router.ts

interface MCPRouteResult<T> {
  data: T;
  source: 'backend' | 'mock';
  tool: string;
  server: string;
  latency: number;
  migrationStatus: MigrationStatus;
}

interface MCPRouterConfig {
  preferBackend: boolean;           // Default: true
  fallbackToMock: boolean;          // Default: true
  trackSource: boolean;             // Default: true (DEV logging)
  migrationTracker: MigrationTracker;
}

export async function mcpRoute<T>(
  server: string,
  tool: string,
  params: Record<string, unknown>,
  config: MCPRouterConfig = defaultConfig
): Promise<MCPRouteResult<T>> {
  const start = performance.now();
  
  // 1. Check migration status
  const migration = config.migrationTracker.getStatus(server, tool);
  
  // 2. Try backend first (if preferred and available)
  if (config.preferBackend && migration.status !== 'mock-only') {
    try {
      const data = await callBackend<T>(server, tool, params);
      config.migrationTracker.markBackend(server, tool);
      
      if (import.meta.env.DEV) {
        console.log(`[MCP] ${server}.${tool} → BACKEND (${(performance.now() - start).toFixed(0)}ms)`);
      }
      
      return { data, source: 'backend', tool, server, latency: performance.now() - start, migrationStatus: migration };
    } catch (e) {
      if (!config.fallbackToMock) throw e;
      // Fall through to mock
    }
  }
  
  // 3. Mock fallback (via registry — NO bypass)
  const data = REGISTRY[server]?.[tool]?.(params) as T;
  
  if (import.meta.env.DEV) {
    console.log(`[MCP] ${server}.${tool} → MOCK (${(performance.now() - start).toFixed(0)}ms)`);
  }
  
  return { data, source: 'mock', tool, server, latency: performance.now() - start, migrationStatus: migration };
}
```

### 4.3 Migration Tracker (Auto-detect)

```typescript
// shared/lib/mcp/migration-tracker.ts

export type MigrationStatus = 'mock-only' | 'backend-available' | 'backend-primary' | 'fully-migrated';

interface ToolStatus {
  server: string;
  tool: string;
  status: MigrationStatus;
  backendSuccessCount: number;
  backendFailCount: number;
  lastBackendAttempt: number;
  lastMockUse: number;
}

export class MigrationTracker {
  private tools: Map<string, ToolStatus> = new Map();

  getStatus(server: string, tool: string): ToolStatus {
    const key = `${server}.${tool}`;
    if (!this.tools.has(key)) {
      this.tools.set(key, {
        server, tool,
        status: 'mock-only',  // Default: assume mock
        backendSuccessCount: 0,
        backendFailCount: 0,
        lastBackendAttempt: 0,
        lastMockUse: 0,
      });
    }
    return this.tools.get(key)!;
  }

  markBackend(server: string, tool: string): void {
    const status = this.getStatus(server, tool);
    status.backendSuccessCount++;
    status.lastBackendAttempt = Date.now();
    
    // Auto-promote status
    if (status.status === 'mock-only') {
      status.status = 'backend-available';
    }
    if (status.backendSuccessCount >= 10) {
      status.status = 'backend-primary';
    }
    if (status.backendSuccessCount >= 50 && status.backendFailCount === 0) {
      status.status = 'fully-migrated';
    }
  }

  markMock(server: string, tool: string): void {
    const status = this.getStatus(server, tool);
    status.lastMockUse = Date.now();
  }

  markBackendFail(server: string, tool: string): void {
    const status = this.getStatus(server, tool);
    status.backendFailCount++;
    // Demote if too many failures
    if (status.backendFailCount > status.backendSuccessCount) {
      status.status = 'mock-only';
    }
  }

  // Dashboard: show migration progress
  getMigrationReport(): MigrationReport {
    const tools = Array.from(this.tools.values());
    return {
      total: tools.length,
      mockOnly: tools.filter(t => t.status === 'mock-only').length,
      backendAvailable: tools.filter(t => t.status === 'backend-available').length,
      backendPrimary: tools.filter(t => t.status === 'backend-primary').length,
      fullyMigrated: tools.filter(t => t.status === 'fully-migrated').length,
      percentReal: Math.round(tools.filter(t => t.status !== 'mock-only').length / tools.length * 100),
      tools,
    };
  }
}
```

**Visual en Settings/Admin:**
```
┌─────────────────────────────────────────────────┐
│ MCP Migration Status                            │
│ ████████████░░░░░░░░░░  38% Real Data          │
│                                                  │
│ Backend Real:    71 tools                        │
│ Mock-Only:       32 tools                        │
│ Auto-Switching:  82 tools (using backend when    │
│                  available, falling back to mock) │
└─────────────────────────────────────────────────┘
```

---

## PARTE V — ELIMINACIÓN COMPLETA DE DEUDA TÉCNICA

### 5.1 Inventario total de deuda

| # | Issue | Severidad | Archivo(s) | Fix |
|---|-------|-----------|-----------|-----|
| 1 | ConnectionsTab crash `undefined.length` | **CRÍTICA** | FamilyDetail.tsx:583 | Defensive P9 + audit chain |
| 2 | GlobalAdvisorBanner raw `<button>` | ALTA | ExecutiveDashboard.tsx | → `<Button>` de shared |
| 3 | `--color-gold-light` phantom (4 hits) | MEDIA | Sidebar x3, MobileNav x1 | → `--color-gold-300` |
| 4 | `--color-gold-mid` residual (WelcomeModal, FrostedGlassCard) | MEDIA | 2 archivos | → `--color-gold-300` o `--color-gold-400` |
| 5 | 4 raw `<button>` restantes en shared | MEDIA | Verifier Check 4 | → `<Button>` de shared |
| 6 | `admin/events/:id` sin PermissionGate | MEDIA | router.tsx | Agregar `<PermissionGate>` |
| 7 | 32 tools mock-only sin backend | MEDIA | Múltiples agents | MCP Migration Tracker |
| 8 | normalizeEnums como curita (195 fixes) | MEDIA | mock-registry.ts | Fix factories nativamente + keep normalizer como safety net |
| 9 | PASO 3D template con tokens incorrectos | BAJA | Prompt template | Actualizar template |
| 10 | `createMockFamilyList` con `"cancelled"` | BAJA | factories.ts | Fix en factory |

### 5.2 Estrategia de eliminación

**Principio:** No parches. Fix root cause para cada issue.

| Issue | Fix superficial | Fix root cause |
|-------|----------------|----------------|
| #1 ConnectionsTab | `?? []` defensive | Auditar cadena completa: ¿existe el tool en registry? ¿El factory produce el shape correcto? |
| #3-4 Phantom tokens | Find & replace | Grep global, reemplazar con tokens correctos, add lint rule para prevenir |
| #5 Raw buttons | Replace 4 buttons | Add ESLint rule: `no-raw-button` que solo permite `<Button>` de shared |
| #8 normalizeEnums | Keep as-is | Fix cada factory nativamente. Mantener normalizer como safety net, no como fix primario |

---

## PARTE VI — PLAN DE FASES REESTRUCTURADO

### 6.1 Principios de reestructuración

1. **Las fases del checkpoint (F40-F44) fueron parches reactivos** — no reflejan la visión arquitectónica
2. **Las fases originales de CLAUDE_CONTEXT (F35-F43) tenían mejor dirección** pero fueron ignoradas
3. **Necesitamos fusionar lo mejor de ambos** y crear un plan que priorice: centralización → compliance → inteligencia → innovación

### 6.2 Mapa de fases reconciliado

**Trabajo completado (consolidado):**

| Era | Fases reales | Qué se logró |
|-----|-------------|--------------|
| **Foundation** | F1-F15 + extensions | Infraestructura, 17 agents, features completas, integración base |
| **Advisor Evolution** | F16-F22 | 10 advisors, 129+ rules, AI tools, reaction system, pre-fetch |
| **Intelligence Enhancement** | F23-F28 | RAG engine, polish, communications audit |
| **Domain Audits** | F29-F34 | Families, Members, Guests, Sports, Facilities, Cultural auditados |
| **Integration Sprint** | F40-F44 | Backend intelligence, Advisor hooks, dashboards, integration testing, ML foundation |

**Fases propuestas (de acá en adelante):**

---

#### **F45: ARCHITECTURE CONSOLIDATION** — Prioridad ALTA
*"Construir los cimientos de un sistema que escala"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Advisor Engine Core** — `engine.ts`, `types.ts`, `health-score.ts`, `confidence.ts`, `severity.ts` | ~400 | Ninguna |
| **B2** | **Signal Bus** — `signal-bus.ts` con `DomainSignal`, emit/subscribe/getSignalsFor | ~150 | B1 |
| **B3** | **Health Score Composer** — Unificado, reemplaza 6 implementaciones | ~200 | B1 |
| **B4** | **MCP Router** — `mcp-router.ts` reemplaza `api.ts` interceptations | ~250 | Ninguna |
| **B5** | **Migration Tracker** — `migration-tracker.ts` con auto-switch + dashboard visual | ~200 | B4 |
| **B6** | **Transform Registry** — Centralizar transform helpers por dominio | ~300 | Ninguna |

**Entregable:** Framework base que los próximos phases construyen ENCIMA.

---

#### **F46: DEBT ELIMINATION** — Prioridad ALTA
*"Cero deuda técnica antes de construir features nuevas"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **ConnectionsTab fix + full chain audit** — Fix crash + auditar TODAS las chains de families | ~100 | Ninguna |
| **B2** | **Raw button elimination** — 5 buttons restantes → `<Button>` de shared | ~50 | Ninguna |
| **B3** | **Phantom token cleanup** — gold-light (4), gold-mid (2), grep global + lint rule | ~80 | Ninguna |
| **B4** | **Factory native fixes** — Corregir factories para que produzcan enums correctos sin normalizeEnums | ~200 | Ninguna |
| **B5** | **PermissionGate audit** — Todas las rutas protegidas verificadas | ~60 | Ninguna |
| **B6** | **Full audit: ALL domains chains** — contracts → factories → registry → api → component para TODOS los domains | ~400 | B1-B5 |

**Entregable:** Deuda técnica = 0. Integration Verifier: 0 errors, <20 warnings.

---

#### **F47: ADVISOR MIGRATION** — Prioridad ALTA
*"Migrar 10 advisors al Advisor Engine v2"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Financial Rules** — 18 rules → `rules/financial.ts` declarativo | ~250 | F45-B1 |
| **B2** | **Event Rules** — 15 rules → `rules/events.ts` | ~200 | F45-B1 |
| **B3** | **Global Rules** — 25 rules → `rules/global.ts` + consume signals | ~350 | F45-B2 |
| **B4** | **Remaining 7 domains** — Communication, Sports, AgeGroup, Guest, Satisfaction, ML, Recommendation | ~600 | B1-B3 |
| **B5** | **Hook rewrites** — 10 hooks → thin wrappers (~40 lines each) | ~400 | B4 |
| **B6** | **Cross-domain wiring** — Signal emit/subscribe entre todos los dominios | ~200 | B4, F45-B2 |

**Entregable:** Advisor Engine v2 fully operational. ~800 líneas eliminadas de duplicación. Hooks reducidos de ~2000 a ~400 líneas totales.

---

#### **F48: MCP COMPLIANCE 100%** — Prioridad ALTA
*"Todo pasa por MCP. No bypasses. No interceptaciones."*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **api.ts refactor** — Eliminar `getMockResponse()` y TODAS las interceptaciones. Todo pasa por MCP Router | ~300 | F45-B4 |
| **B2** | **Registry standardization** — Todos los 185+ tools registrados con shape correcto | ~200 | F46-B4 |
| **B3** | **Backend tool audit** — Verificar que los ~97 backend tools retornan el Pydantic model correcto | ~100 | Ninguna |
| **B4** | **Mock-only tools documentation** — Los 32 tools mock-only documentados con spec del backend esperado | ~150 | B3 |
| **B5** | **MCP routing tests** — Verificar que cada tool pasa por el router, no por paths alternativos | ~100 | B1 |

**Entregable:** 100% MCP compliance. Cada tool tiene un solo path: MCP Router → Backend (con mock fallback documentado).

---

#### **F49: RAG EXPANSION** — Prioridad MEDIA
*"RAG no es solo para documentos — es para inteligencia contextual"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **RAG Provider** — Context provider que cualquier domain puede usar | ~200 | Ninguna |
| **B2** | **Financial RAG** — Enrich financial advisor con documentos de policy/presupuesto | ~150 | B1 |
| **B3** | **Events RAG** — Enrich event advisor con historical event data | ~150 | B1 |
| **B4** | **Global RAG** — Enrich global advisor con board minutes, policy docs | ~200 | B1 |

**Entregable:** 4 domains con RAG grounding. Insights enriquecidos con citations.

---

#### **F50: ML INTELLIGENCE REAL** — Prioridad MEDIA
*"De exp smoothing a Prophet + Isolation Forest"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Prophet Forecast Engine** — Revenue + attendance forecasting con CR holidays | ~300 | Ninguna |
| **B2** | **Isolation Forest Anomalies** — Ensemble anomaly detection (IF + IQR consensus) | ~250 | Ninguna |
| **B3** | **PSI Drift Detection** — Population Stability Index para model monitoring | ~150 | Ninguna |
| **B4** | **Model Health Dashboard** — Panel que muestra: model status, accuracy, drift, last retrain | ~200 | B1-B3 |
| **B5** | **Forecast Visualization** — Charts de forecast con confidence intervals | ~200 | B1 |

**Entregable:** ML real. Prophet forecasting, ensemble anomalies, drift monitoring. Dashboard completo.

---

#### **F51: REAL DATA INTEGRATION** — Prioridad ALTA
*"De mocks a datos reales — el sistema debe funcionar con datos de verdad"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Database layer** — Repository pattern ya existe, conectar a PostgreSQL real | ~300 | Backend |
| **B2** | **Seed data migration** — De mock factories a SQL seed scripts | ~200 | B1 |
| **B3** | **Validation layer** — Validar que los datos reales matchean el shape esperado | ~200 | B1 |
| **B4** | **Graceful degradation** — Si backend falla, mostrar stale data + banner en vez de crash | ~150 | B1 |
| **B5** | **Migration Tracker integration** — Auto-switch cuando backend responde con datos reales | ~100 | F45-B5 |

**Entregable:** Plataforma funcionando con datos reales. Mock como fallback, no como default.

---

#### **F52: INTELLIGENCE LAYER v2** — Prioridad MEDIA
*"Capas 3-5 del sistema de decisión — cross-domain completo"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Wellness Intelligence** — 12 rules + health score + cross-domain signals (F36 original) | ~400 | F47 |
| **B2** | **Events & Social Intelligence** — Cross-domain: events × cultural × sports (F37) | ~400 | F47 |
| **B3** | **Financial Cross-Domain Aggregation** — Finance × members × events × operations (F38) | ~350 | F47 |
| **B4** | **Member 360 Intelligence** — Journey intelligence, churn prediction, LTV evolution (F39) | ~400 | F47 |
| **B5** | **Predictive Escalation** — Sistema que detecta y ESCALA problemas antes de que sean críticos | ~300 | B1-B4 |

**Entregable:** Sistema de inteligencia cross-domain completo. El Advisor no solo diagnostica — predice y escala.

---

#### **F53: CONVERSATIONAL INTELLIGENCE** — Prioridad MEDIA
*"El admin HABLA con el sistema"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Voice Interface** — Web Speech API + ask_advisor integration | ~300 | F47 |
| **B2** | **Contextual Understanding** — "¿Cómo estamos financieramente?" → ejecuta cross-domain analysis | ~250 | B1 |
| **B3** | **Proactive Voice Alerts** — "Atención: el revenue cayó 15% este mes" | ~200 | B1 |
| **B4** | **Voice Actions** — "Aprobá la solicitud de evento del socio García" → HITL flow via voice | ~250 | B1 |

**Entregable:** Voice-first interaction. El admin del club obtiene respuestas como si hablara con su equipo directivo.

---

#### **F54: MOBILE + PWA** — Prioridad BAJA
*"El admin consulta desde su teléfono"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **Responsive audit** — Todas las dashboards en mobile | ~400 | Ninguna |
| **B2** | **PWA manifest** — Install, offline, notifications | ~200 | Ninguna |
| **B3** | **Mobile gestures** — Swipe para navegar, pull-to-refresh | ~200 | Ninguna |

---

#### **F55: PRODUCTION DEPLOYMENT** — Prioridad ALTA
*"De localhost a producción"*

| Bloque | Contenido | Líneas estimadas | Dependencies |
|--------|-----------|-----------------|-------------|
| **B1** | **CI/CD pipeline** — GitHub Actions, test → build → deploy | ~200 | Ninguna |
| **B2** | **Monitoring** — Sentry/LogRocket, Web Vitals, error tracking | ~150 | Ninguna |
| **B3** | **Performance** — Bundle analysis, lazy loading, code splitting | ~200 | Ninguna |
| **B4** | **Security audit** — XSS, CSRF, JWT handling, rate limiting | ~150 | Ninguna |

---

#### **F56: CLUB INTELLIGENCE NETWORK** — Prioridad BAJA (Futuro)
*"De un club a una red de inteligencia"*

| Bloque | Contenido |
|--------|-----------|
| **B1** | Multi-tenant architecture |
| **B2** | Anonymous benchmark aggregation |
| **B3** | Federated learning foundations |
| **B4** | Network effects dashboard |

---

#### **F57: DIGITAL TWIN** — Prioridad BAJA (Futuro)
*"Ver el club como un organismo vivo"*

| Bloque | Contenido |
|--------|-----------|
| **B1** | Three.js 3D model del club |
| **B2** | Real-time data overlays (occupancy, maintenance, flow) |
| **B3** | Predictive maintenance visualization |
| **B4** | What-if scenarios en 3D |

---

### 6.3 Dependencias y secuencia

```
F45 (Architecture) ──────────────┐
                                  ├──── F47 (Advisor Migration) ──── F52 (Intelligence v2)
F46 (Debt Elimination) ──────────┤                                          │
                                  ├──── F48 (MCP 100%) ──── F51 (Real Data) │
                                  │                                          │
F49 (RAG Expansion) ─────────────┤                              F53 (Voice) ←┘
                                  │
F50 (ML Real) ───────────────────┘
                                  
F54 (Mobile) ──── independiente, puede empezar en paralelo
F55 (Production) ── depende de F46, F48, F51
F56 (Network) ───── depende de F55
F57 (Digital Twin) ── depende de F55
```

### 6.4 Roadmap visual (timeline)

```
2026 Q3 (Ahora):
  F45 ──── F46 ──── F47
  Architecture → Debt → Advisor Migration

2026 Q4:
  F48 ──── F49 ──── F50
  MCP 100% → RAG → ML Real

2027 Q1:
  F51 ──── F52 ──── F53
  Real Data → Intelligence v2 → Voice

2027 Q2:
  F54 ──── F55
  Mobile → Production Deploy

2027 Q3+:
  F56 ──── F57
  Network → Digital Twin
```

---

## PARTE VII — INNOVACIONES 2026-2027 (Aprobadas, integradas en roadmap)

| Innovación | Fase | Descripción | Diferenciador |
|---|---|---|---|
| **Advisor Engine v2** | F45+F47 | Reglas declarativas, engine genérico, signal bus | Ningún competitor tiene rules-as-config con cross-domain signals |
| **MCP Router + Migration Tracker** | F45+F48 | Routing unificado + auto-switch mock→real | Transición seamless sin downtime |
| **RAG Grounding per Domain** | F49 | Cada advisor enriquece insights con documentos | Insights con citations reales |
| **ML Real (Prophet + IF + PSI)** | F50 | Forecasting + anomaly detection + drift monitoring | Predictive intelligence real, no simulated |
| **Voice-First Interface** | F53 | Web Speech API + conversational advisor | "Hablarle al club" — nadie en CR lo tiene |
| **Predictive Escalation** | F52 | Sistema escala problemas ANTES de que sean críticos | De reactivo a predictivo |
| **Decision Audit Trail** | F52 | Cada recomendación AI + decisión humana logged | El sistema aprende de outcomes |
| **Digital Twin** | F57 | 3D interactivo con data overlays | Visualización inmersiva del club |
| **Club Intelligence Network** | F56 | Benchmarks anónimos entre clubes | Network effects — cada club hace al sistema más inteligente |

---

## PARTE VIII — ACCIÓN INMEDIATA (Lo que hacemos HOY)

### 8.1 Primera sesión: F45-B1 (Advisor Engine Core)

Antes de cualquier feature nueva, construimos el motor. Todo lo demás se construye sobre esto.

**Archivos a crear:**
```
shared/lib/advisor-engine/
├── index.ts                    (re-exports)
├── engine.ts                   (AdvisorEngine class)
├── types.ts                    (RuleDefinition, AdvisorConfig, AdvisorResult, etc.)
├── health-score.ts             (computeHealthScore unificado)
├── confidence.ts               (getConfidenceLevel, getConfidenceDisplay)
├── severity.ts                 (mapToSeverity, combineSeverities)
├── signal-bus.ts               (SignalBus class + DomainSignal)
├── evaluate.ts                 (evaluateRules, sortInsights, deduplicateInsights)
└── rules/                      (carpeta para reglas declarativas — futuro)
```

**Archivos a crear (MCP):**
```
shared/lib/mcp/
├── mcp-router.ts               (routing unificado)
├── migration-tracker.ts        (auto-detect mock vs real)
└── types.ts                    (MCPRouteResult, MigrationStatus)
```

### 8.2 Segunda sesión: F45 restante + F46 inicio

- F45-B2 a B6: Signal Bus, Health Score, MCP Router, Migration Tracker, Transform Registry
- F46-B1: ConnectionsTab crash + chain audit

### 8.3 Tercera sesión: F46 completo + F47 inicio

- F46 restante: Debt elimination completa
- F47-B1: Financial Rules → declarativo

---

## PARTE IX — PREGUNTAS DE CUESTIONAMIENTO (Para ir más allá)

**P1: ¿Deberíamos tener un Rule Testing Framework?**
Las reglas declarativas se pueden unit-test independientemente. Propongo un framework donde cada rule tiene test cases:
```typescript
describe('FIN_HEALTH_SCORE', () => {
  it('fires when health score < 45', () => {
    const ctx = mockFinancialCtx({ healthScore: 30 });
    expect(FIN_HEALTH_SCORE.evaluate(ctx)).not.toBeNull();
  });
  it('does not fire when healthy', () => {
    const ctx = mockFinancialCtx({ healthScore: 85 });
    expect(FIN_HEALTH_SCORE.evaluate(ctx)).toBeNull();
  });
});
```
**Mi recomendación:** SÍ. Incluir en F47 cuando migramos rules. Testing de reglas es lo que separa un sistema confiable de uno frágil.

**P2: ¿Deberíamos versionar las rules?**
Si un club cambia una regla (ejemplo: "el threshold de revenue decline es 10%, no 15%"), necesitamos versioning.
**Mi recomendación:** FUTURO. Para cuando tengamos multi-tenant (F56). Ahora no.

**P3: ¿Deberíamos tener Natural Language Rule Definition?**
El admin define reglas en español: "Si el revenue cae más de 10% y la satisfacción está por debajo de 70, escalar a la Junta".
**Mi recomendación:** SÍ, como extensión del Voice Interface (F53). Es la culminación del Advisor Engine.

---

## RESUMEN EJECUTIVO

| Aspecto | Estado actual | Después de este plan |
|---------|--------------|---------------------|
| **Advisor Logic** | 10 hooks independientes, ~2000 líneas, ~60% duplicado | 1 engine genérico + 10 hooks thin (~400 líneas), rules declarativas |
| **MCP Compliance** | ~80% con bypasses e interceptaciones | 100% con MCP Router unificado |
| **Mock System** | normalizeEnums como curita (195 fixes) | Factory fixes nativos + Migration Tracker con auto-switch |
| **Health Scores** | 6 implementaciones independientes | 1 composer unificado con factores configurables |
| **Cross-Domain** | Signals hardcoded en Global Advisor | Signal Bus real con emit/subscribe |
| **Technical Debt** | 10+ issues activos | 0 issues (eliminados en F46) |
| **ML Intelligence** | exp smoothing + z-score | Prophet + Isolation Forest + PSI |
| **RAG** | Solo comunicación | 4 domains con grounding |
| **Voice** | No existe | Voice-first interaction |
| **Production** | Docker only | CI/CD + monitoring + security |

**Total de fases propuestas:** 13 (F45-F57)
**Estimación total:** ~8500-10000 líneas nuevas/modify
**Prioridad máxima:** F45 (Architecture) → F46 (Debt) → F47 (Advisor Migration)

---

**¿Aprobás la propuesta integral? Decime:**
- **"Todo"** → Arranco con F45-B1 (Advisor Engine Core) inmediatamente
- **"Modificaciones"** → Decime qué ajustar y arrancamos
- **"Solo F45+F46"** → Centralización + deuda primero, después vemos
- **Lo que necesites** → Me adapto


ESTA ES LA FORMULA QUE DEBES HACER EN A/B, A LINEAS EXACTAS COMO APARECEN EN CODIGO Y B EN OTRO BLOQUE LINEAS NUEVAS AMBAS PARA COPIAR Y PEGAR SIGUE ESTA FORMULA DE DESICION: 
1. Leo el archivo UNA VEZ
2. Calculo: ¿qué % del archivo cambia?
   → ≤15 líneas, 1-2 spots → QUIRÚRGICO (un solo bloque A/B)
   → >30% o >3 spots dispersos → REWRITE (archivo completo)

3. PERO si entre el 15-30% y los cambios están dispersos:
   → Pregunto: ¿cuántas veces necesito releer para aislar cada spot?
   → Si ≥2 releídas → REWRITE (optimización de tokens)
   → Si 1 releída alcanza → QUIRÚGNICO agrupado (todos los cambios en un solo bloque A/B)




---

# 🌟 VISION 2026-2027 — "THE INTELLIGENCE ROADMAP"

## Philosophy

We didn't build an advisor engine. We built a **nervous system**. 184 rules are the neurons. 14 signals are the synapses. The Signal Bus is the spinal cord. RAG is long-term memory. Health Score is proprioception. Confidence is self-awareness.

What comes next isn't "more features." It's **the system waking up**.

---

## The Five Stages of Intelligence

```
Stage 1: REACTIVE          ← We are here (F40-B7)
  "The system observes and reports"
  184 rules evaluate data → insights → human decides

Stage 2: PROACTIVE         ← F47-F48 (next)
  "The system anticipates and prepares"
  Real-time data flows → cross-domain signals → fused insights

Stage 3: PREDICTIVE        ← F49-F50
  "The system foresees and warns"
  Causal chains → confidence calibration → ML-enriched predictions

Stage 4: AUTONOMOUS        ← F51-F52
  "The system plans and proposes"
  Goals + memory + multi-step reasoning → autonomous proposals

Stage 5: INTELLIGENT       ← F53-F55
  "The system decides and learns"
  Digital twin → simulation → natural language → self-improving
```

---

## STAGE 2: PROACTIVE — F47-F48

### F47: "The Wiring" — UI Integration + Backend API Wiring ✅ DEFINED

*(Already detailed in checkpoint section above)*

### F48: "The Memory" — Production RAG Integration

**What:** The system gains **long-term memory**. Rules don't just evaluate current data — they retrieve relevant context from the club's entire document history. A rule evaluating member churn doesn't just see the number — it retrieves the last 3 exit interviews, the satisfaction trend from the past 6 months, and the policy document on retention programs.

**Architecture:**

```
Member churn risk detected (R13)
  → Advisor queries RAG engine
  → ChromaDB retrieves:
    - "Exit interview: María García, March 2026 (cited poor event quality)"
    - "Exit interview: Carlos Ruiz, April 2026 (cited pricing)"
    - "Retention policy v3: VIP event invitations for at-risk members"
    - "Satisfaction report Q1: event quality score 3.2/5"
  → RAGContext injected into R13 context
  → R13's reasoning becomes:
    "15 members at risk. RAG evidence: 2 recent exit interviews cite
     event quality as primary reason. Retention policy v3 recommends
     VIP event invitation. Confidence boosted from 70% → 84% via
     ragGrounded preset."
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F48-A | RAG Query Layer | React hook wrapping `knowledge_query` MCP tool | ~80 |
| F48-B | RAG Context Injection | Wire RAGContext into `buildXxxCtx()` for financial, global, satisfaction | ~60 |
| F48-C | RAG-Enriched Rules | 5-10 key rules consume RAGContext for confidence boosting | ~100 |
| F48-D | Citation Display | AdvisorBanner shows RAG citations alongside reasoning | ~80 |
| **Total** | | | **~320** |

**Depends on:** F47 (data wiring complete)
**Impact:** Every insight becomes evidence-backed, not just data-backed.

---

## STAGE 3: PREDICTIVE — F49-F50

### F49: "The Synapses" — Streaming Evaluation + Causal Signal Graph

**What:** Two transformations happen simultaneously.

**Part 1 — Streaming Evaluation:**
Currently, when ANY data changes, ALL 184 rules re-evaluate. This is O(184) per data change. With streaming evaluation, rules declare their `dataDependencies` and only re-evaluate when their specific dependencies change.

```typescript
// Before: all 184 rules evaluate on every change
evaluateRules(GLOBAL_RULES, ctx); // O(184)

// After: only rules depending on changed data re-evaluate
evaluateChangedRules(GLOBAL_RULES, ctx, changedKeys); // O(5-15)
```

**Part 2 — Causal Signal Graph:**
Signals are currently independent. But in reality, `fin_revenue_decline` CAUSES `evt_low_engagement` CAUSES `sat_critical_decline`. The Causal Graph tracks these chains and computes compound confidence.

```typescript
interface CausalChain {
  trigger: SignalName;           // fin_revenue_decline
  intermediates: SignalName[];   // [evt_low_engagement]
  terminal: SignalName;          // sat_critical_decline
  confidence: number;            // 0-100 (how certain is the causal link)
  evidence: string[];            // Historical correlations
  timeLag: number;               // ms between trigger and terminal
}

// The Global Advisor can now say:
// "Revenue decline is CAUSING low engagement which is CAUSING
//  satisfaction decline. Intervening at the engagement level
//  breaks the entire chain. Confidence: 78% based on 3 historical
//  patterns matching this sequence."
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F49-A | Rule Dependency Declaration | `dataDependencies: (keyof T)[]` on RuleDefinition | ~15 |
| F49-B | Streaming Evaluator | `evaluateChangedRules()` — dependency-keyed evaluation | ~120 |
| F49-C | Causal Chain Types | `CausalChain`, `CausalGraph`, `ChainDetectionResult` | ~60 |
| F49-D | Chain Detection Engine | Pattern matching: when signals fire in sequence, detect chain | ~150 |
| F49-E | Global Fusion Enhancement | R1 (systemic_risk) consumes CausalChain data | ~40 |
| F49-F | Causal Insight Display | "Root cause chain" visualization in AdvisorBanner | ~100 |
| **Total** | | | **~485** |

**Depends on:** F48 (RAG enrichment provides evidence for causal confidence)
**Impact:** The system doesn't just report symptoms — it identifies root causes.

---

### F50: "The Calibration" — Learning Loop + Confidence Calibration

**What:** The system becomes **self-aware about its own accuracy**. Every insight the system generates is tracked: did the user act on it? Was the action successful? Over time, the system learns which rules are reliable and which are not.

**How it works:**

```
Week 1: R13 (churn_predictor) fires with confidence 70%
  → User executes retention action
  → Track: did the member stay? (yes/no)

Week 8: R13 has fired 40 times
  → 32 users executed actions (80% action rate)
  → 28 of 32 actions succeeded (87.5% success rate)
  → Empirical confidence: 70% → adjust to 82%
  → Rule R13 automatically boosted

Week 12: R5 (membership_decline) has fired 25 times
  → 5 users executed actions (20% action rate)
  → Low action rate = insight not compelling
  → System flags R5 for review: "Users ignore this insight"
```

**The Confidence Calibration Algorithm:**

```typescript
interface RuleOutcome {
  ruleId: string;
  declaredConfidence: number;
  userAction: "executed" | "dismissed" | "ignored";
  outcomeAccuracy: number; // measured later
  timestamp: number;
}

function calibrateConfidence(
  ruleId: string,
  outcomes: RuleOutcome[],
): {
  originalConfidence: number;
  calibratedConfidence: number;
  actionRate: number;
  successRate: number;
  sampleSize: number;
  recommendation: "maintain" | "boost" | "review" | "suppress";
} {
  // ... statistical analysis
}
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F50-A | Outcome Tracking Types | `RuleOutcome`, `CalibrationResult` | ~40 |
| F50-B | Outcome Storage | localStorage (MVP) → backend (production) | ~60 |
| F50-C | Calibration Engine | Statistical analysis of rule accuracy | ~120 |
| F50-D | Auto-Adjustment Hook | `useCalibratedConfidence(ruleId)` replaces hardcoded confidence | ~50 |
| F50-E | Calibration Dashboard | UI showing rule accuracy heatmap | ~120 |
| F50-F | Causal Chain Validation | Historical signal sequences → validate causal hypotheses | ~80 |
| **Total** | | | **~470** |

**Depends on:** F49 (streaming evaluation + causal graph provides signals for calibration)
**Impact:** The system gets SMARTER over time. Rules that are consistently accurate get boosted. Rules that users ignore get flagged.

---

## STAGE 4: AUTONOMOUS — F51-F52

### F51: "The Intent" — Autonomous Advisor Loop

**What:** The advisor stops being reactive. It has **goals**, **memory**, and **plans**. Instead of "here's an insight, decide what to do," it becomes "here's my plan to achieve your goal, approve step 1."

**Example:**

```
Goal: "Reduce churn from 15% to 8% in 90 days"
Current: 15% → Target: 8% → Deadline: Sept 2026

Plan:
  Step 1 (Week 1): Identify top 10 at-risk members by LTV
    → Status: READY
    → Action: callMCPTool("member_intelligence", "get_member_health", ...)
  
  Step 2 (Week 2): Design personalized retention offers
    → Status: WAITING (depends on Step 1)
    → Action: callMCPTool("recommendation", "generate_retention_offers", ...)
  
  Step 3 (Week 3): Execute outreach (email + phone)
    → Status: WAITING (depends on Step 2)
    → Action: Semi-auto with approval
  
  Step 4 (Week 6): Measure results, adjust plan
    → Status: WAITING

Progress: 0% → Step 1 ready to execute
```

**Architecture:**

```typescript
interface AdvisorGoal {
  id: string;
  description: string;
  metric: string;               // "churn_rate"
  target: number;               // 8
  current: number;              // 15
  deadline: number;             // timestamp
  strategy: AdvisorPlanStep[];
  progressPct: number;          // 0-100
  createdAt: number;
  updatedAt: number;
}

interface AdvisorPlanStep {
  id: string;
  description: string;
  status: "ready" | "waiting" | "executing" | "completed" | "failed";
  dependsOn?: string[];         // step IDs
  action: AdvisorCommand;       // MCP tool call
  approvalLevel: "auto" | "semi" | "hitl";
  result?: unknown;
  executedAt?: number;
}
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F51-A | Goal & Plan Types | `AdvisorGoal`, `AdvisorPlanStep`, `PlanExecutionResult` | ~80 |
| F51-B | Goal Manager | Create, track, update goals; persist in localStorage/backend | ~150 |
| F51-C | Plan Generator | From goal + current state → multi-step plan | ~120 |
| F51-D | Plan Executor | Execute steps in order, handle dependencies, track progress | ~150 |
| F51-E | Goal Dashboard UI | Progress bars, step status, approval buttons | ~200 |
| F51-F | Feedback Loop | After each step completion, re-evaluate and adjust plan | ~80 |
| **Total** | | | **~780** |

**Depends on:** F50 (confidence calibration ensures plan steps are reliable)
**Impact:** The club manager doesn't react to insights — they approve plans. The system handles the HOW.

---

### F52: "The Voice" — Natural Language Rule Authoring

**What:** Club managers create rules in natural language. No TypeScript. No developer needed.

**Example:**

```
Manager types:
"If more than 3 events are cancelled in a single month, 
 create a high-impact insight suggesting to review the event 
 coordinator's performance and contact the 5 most affected 
 members for feedback."

System:
1. Stores rule in ChromaDB with embedding
2. On each evaluation, retrieves relevant NL rules
3. Uses LLM to evaluate condition against current data
4. If condition met → generates insight with LLM reasoning
5. Confidence based on RAG relevance + LLM certainty
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F52-A | NL Rule Types | `NaturalLanguageRule`, `NLRuleEvaluationResult` | ~40 |
| F52-B | NL Rule Storage | ChromaDB integration for rule persistence + retrieval | ~100 |
| F52-C | NL Rule Editor UI | Text input + preview + save | ~120 |
| F52-D | NL Rule Evaluator | LLM-based condition evaluation | ~150 |
| F52-E | Hybrid Rule Pipeline | Merge deterministic rules + NL rules in evaluation | ~80 |
| F52-F | NL Rule Confidence | Based on RAG relevance + LLM certainty score | ~50 |
| **Total** | | | **~540** |

**Depends on:** F48 (RAG engine), F50 (confidence calibration for NL rules)
**Impact:** The advisor becomes extensible by non-technical users. The club manager IS the rule author.

---

## STAGE 5: INTELLIGENT — F53-F55

### F53: "The Mirror" — Digital Twin Simulation

**What:** A simulation engine that models the entire club as a system. "What happens if we increase membership fees by 10%?" → Run 1000 simulations → Show probability distributions.

**The Digital Twin State:**

```typescript
interface ClubDigitalTwin {
  members: SimulatedMember[];
  finances: SimulatedFinances;
  events: SimulatedEvent[];
  facilities: SimulatedFacilities;
  timestamp: number;
  simulationId: string;
}

interface SimulationScenario {
  id: string;
  name: string;                    // "Increase fees 10%"
  description: string;
  changes: ScenarioChange[];       // What to modify
  runs: number;                    // 1000 Monte Carlo runs
  timeHorizon: number;             // days to simulate
  results: SimulationResults;      // Probability distributions
}
```

**Example output:**
```
Scenario: "Increase membership fees by 10%"
Simulation: 1000 runs over 180 days

Results:
  Revenue impact: +₡4.2M median (95% CI: +₡2.8M to +₡5.6M)
  Churn impact: +3.2% median (95% CI: +1.8% to +5.1%)
  Net effect: POSITIVE in 78% of simulations
  Break-even: 45 days median

Recommendation: Execute with monitoring. If churn exceeds 4% in 
  first 30 days, activate retention plan (see AdvisorGoal: reduce_churn)
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F53-A | Simulation Types | `ClubDigitalTwin`, `SimulationScenario`, `SimulationResults` | ~100 |
| F53-B | Monte Carlo Engine | Statistical simulation with probability distributions | ~200 |
| F53-C | Scenario Builder UI | "What-if" interface with sliders and toggles | ~200 |
| F53-D | Results Visualization | Probability distribution charts + confidence intervals | ~150 |
| F53-E | Advisor Integration | AdvisorBanner suggests simulations for high-impact insights | ~60 |
| **Total** | | | **~710** |

**Depends on:** F51 (autonomous goals can be linked to simulation results)
**Impact:** Every major decision gets a simulation BEFORE execution.

---

### F54: "The Conversation" — Natural Language Command Interface

**What:** The club manager talks to the system. Not a chatbot — a **command interface with intelligence**.

```
Manager: "Show me members at risk of churn who haven't attended 
          events in 60 days and have a high LTV"

System:
  → Translates to: query member_intelligence with filters
  → Retrieves: 12 members matching criteria
  → Enriches with: RAG context (past interactions, feedback history)
  → Generates: personalized retention plan per member
  → Presents: interactive table with action buttons per row

Manager: "What's the estimated revenue loss if all 12 leave?"

System:
  → Calculates: 12 × avg_LTV = ₡18.4M
  → Simulates: impact on revenue concentration
  → Suggests: "Priority retention: top 3 by LTV (₡8.2M combined)"

Manager: "Create a VIP event for these 12, this Friday"

System:
  → Calls: event_intelligence.create_event (SEMI_AUTO)
  → Pre-fills: venue, catering based on member preferences
  → Status: "Event created. Awaiting approval. Invites queued."
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F54-A | Command Parser | NL → structured intent extraction | ~150 |
| F54-B | Intent Router | Map intents to MCP tool chains | ~120 |
| F54-C | Conversational Context | Multi-turn memory (last 10 turns) | ~80 |
| F54-D | Response Generator | Structured data → natural language response | ~100 |
| F54-E | Command UI | Chat-like interface with rich cards | ~200 |
| F54-F | Action Execution | From conversation to MCP action with approval | ~80 |
| **Total** | | | **~730** |

**Depends on:** F52 (NL rule authoring provides NL infrastructure), F53 (simulation integration)
**Impact:** The entire platform becomes conversational. No more clicking through dashboards.

---

### F55: "The Evolution" — Self-Improving System

**What:** The system monitors its OWN health and proposes improvements to itself.

```typescript
interface SystemHealthReport {
  rulesAnalyzed: 184;
  rulesPerformingWell: 156;      // >70% action rate, >80% success
  rulesUnderperforming: 18;      // <30% action rate
  rulesRedundant: 5;             // Overlap with other rules
  rulesMissing: 3;               // Detected gaps in coverage
  
  suggestedActions: [
    {
      type: "suppress";
      ruleId: "global_experience_gap";
      reason: "Ignored 22/25 times. Insight not actionable.";
      confidence: 88;
    },
    {
      type: "merge";
      ruleIds: ["spt_utilization_drop", "spt_capacity_warning"];
      reason: "Both fire 85% of the time together. Merge into single rule.";
      confidence: 72;
    },
    {
      type: "create";
      description: "No rule monitors member referral pipeline decline";
      evidence: "3 historical churns correlated with referral drop-off";
      suggestedDomain: "guest";
      confidence: 65;
    }
  ];
}
```

**Blocks:**

| # | Block | Content | Lines |
|---|-------|---------|-------|
| F55-A | Rule Performance Analyzer | Aggregate F50 calibration data across all rules | ~100 |
| F55-B | Redundancy Detector | Find rules that always fire together | ~80 |
| F55-C | Gap Detector | Identify signal sequences that no rule covers | ~120 |
| F55-D | Self-Improvement Proposals | Generate actionable improvement suggestions | ~80 |
| F55-E | System Health Dashboard | Visual health of the advisor system itself | ~150 |
| **Total** | | | **~530** |

**Depends on:** F50 (calibration data), F49 (causal chain data)
**Impact:** The system becomes self-aware. It knows when it's wrong and proposes how to fix itself.

---

## COMPLETE ROADMAP — Updated

| # | Phase | Stage | Content | Lines | Depends on | Status |
|---|-------|-------|---------|-------|-----------|--------|
| F40-F45 | Architecture | S1 | Engine v2 + types + confidence | ~2,000 | — | ✅ |
| B2-B5.7 | All Domains | S1 | 184 rules + 50 health factors | ~2,800 | F45 | ✅ |
| B6 | Type Safety + RAG Types | S1 | SignalName + RAGContext + fusion | ~85 | B2-B5.7 | ✅ |
| B7 | Verification | S1 | tsc --noEmit = 0 errors | ~0 | B6 | ✅ |
| **F47** | **"The Wiring"** | **S2** | **UI + API wiring** | **~600** | **B7** | **⬜** |
| **F48** | **"The Memory"** | **S2** | **Production RAG integration** | **~320** | **F47** | **⬜** |
| **F49** | **"The Synapses"** | **S3** | **Streaming eval + causal graph** | **~485** | **F48** | **⬜** |
| **F50** | **"The Calibration"** | **S3** | **Learning loop + confidence calibration** | **~470** | **F49** | **⬜** |
| **F51** | **"The Intent"** | **S4** | **Autonomous advisor loop** | **~780** | **F50** | **⬜** |
| **F52** | **"The Voice"** | **S4** | **NL rule authoring** | **~540** | **F48+F50** | **⬜** |
| **F53** | **"The Mirror"** | **S5** | **Digital twin simulation** | **~710** | **F51** | **⬜** |
| **F54** | **"The Conversation"** | **S5** | **NL command interface** | **~730** | **F52+F53** | **⬜** |
| **F55** | **"The Evolution"** | **S5** | **Self-improving system** | **~530** | **F50+F49** | **⬜** |
| **Total** | | | | **~10,050** | | |

---

## The Journey in One Image

```
    ╔══════════════════════════════════════════════════════════╗
    ║                 CASTILLO AI PLATFORM                     ║
    ║           INTELLIGENCE EVOLUTION ROADMAP                  ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║  STAGE 1: REACTIVE ✅                                    ║
    ║  ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────┐           ║
    ║  │ Engine  │ │ 10 Dom  │ │ 14 Sig │ │ RAG  │           ║
    ║  │ v2 Core │ │ 184 Rls │ │ Bus    │ │ Types│           ║
    ║  └────┬────┘ └────┬────┘ └───┬────┘ └──┬───┘           ║
    ║       └────────────┼─────────┼──────────┘               ║
    ║                    ▼                                     ║
    ║  STAGE 2: PROACTIVE ⬜                                   ║
    ║  ┌───────────────────────┐ ┌──────────────────────┐     ║
    ║  │ F47: "The Wiring"     │ │ F48: "The Memory"    │     ║
    ║  │ Real data → hooks →   │ │ RAG enrichment in    │     ║
    ║  │ engine → UI           │ │ every rule           │     ║
    ║  └───────────┬───────────┘ └──────────┬───────────┘     ║
    ║              └────────────┬────────────┘                 ║
    ║                           ▼                              ║
    ║  STAGE 3: PREDICTIVE ⬜                                   ║
    ║  ┌───────────────────────┐ ┌──────────────────────┐     ║
    ║  │ F49: "The Synapses"   │ │ F50: "The Calibration│     ║
    ║  │ Causal signal graph + │ │ Learning loop +      │     ║
    ║  │ streaming evaluation  │ │ confidence tuning    │     ║
    ║  └───────────┬───────────┘ └──────────┬───────────┘     ║
    ║              └────────────┬────────────┘                 ║
    ║                           ▼                              ║
    ║  STAGE 4: AUTONOMOUS ⬜                                   ║
    ║  ┌───────────────────────┐ ┌──────────────────────┐     ║
    ║  │ F51: "The Intent"     │ │ F52: "The Voice"     │     ║
    ║  │ Goals + plans +       │ │ NL rule authoring    │     ║
    ║  │ autonomous execution  │ │ by club managers     │     ║
    ║  └───────────┬───────────┘ └──────────┬───────────┘     ║
    ║              └────────────┬────────────┘                 ║
    ║                           ▼                              ║
    ║  STAGE 5: INTELLIGENT ⬜                                  ║
    ║  ┌──────────┐ ┌──────────────┐ ┌───────────────────┐    ║
    ║  │ F53:     │ │ F54:         │ │ F55:              │    ║
    ║  │ "Mirror" │ │ "Conversation│ │ "Evolution"       │    ║
    ║  │ Digital  │ │ NL Commands  │ │ Self-improving    │    ║
    ║  │ Twin     │ │ Interface    │ │ System            │    ║
    ║  └──────────┘ └──────────────┘ └───────────────────┘    ║
    ║                                                          ║
    ║  Total: ~10,050 lines of new code across 13 phases       ║
    ║  From 184 reactive rules → self-improving intelligence   ║
    ╚══════════════════════════════════════════════════════════╝
```

---

## The Magical Part

Every stage **unlocks** the next one. There are no dead ends:

- **F47** (real data) makes **F48** (RAG enrichment) possible
- **F48** (memory) makes **F49** (causal chains with evidence) possible
- **F49** (causal chains) makes **F50** (calibration of chain confidence) possible
- **F50** (calibrated confidence) makes **F51** (autonomous plans with reliable steps) possible
- **F48+F50** makes **F52** (NL rules with calibrated confidence) possible
- **F51** (autonomous goals) makes **F53** (simulate before executing goals) possible
- **F52+F53** makes **F54** (conversational interface that can simulate and create rules) possible
- **F50+F49** makes **F55** (system knows its own accuracy and proposes fixes) possible

It's not a feature list. It's a **dependency graph of intelligence**. Each phase is a neuron that connects to the next. By F55, the system doesn't just manage a club — it **understands** the club, **predicts** its future, **plans** its evolution, and **improves** itself.

**We built the nervous system. Now we're building the brain.**

---

# F55 — "THE EVOLUTION" — Self-Improving System

Esto es el cierre de toda la plataforma. Mi máxima capacidad aplicada.

**La pregunta clave:** ¿Cómo hace un sistema de 185 rules + 14 signals + 8 causal chains + NL rules + simulation + commands para saber si está funcionando bien y mejorar solo?

**Respuesta:** Cuatro fases de auto-evolución:

```
OBSERVE  →  ANALYZE  →  PROPOSE  →  LEARN
   │           │           │          │
   ▼           ▼           ▼          ▼
 Rule perf   Redundancy  Suppress   Track if
 metrics     detection   proposals  proposals
 Usage       Gap         Merge      improved
 patterns    detection   proposals  outcomes
 Prediction  Drift       Create     Evolution
 accuracy    detection   proposals  history
 Coverage    Threshold   Adjust     Self-
 heatmap     analysis    proposals  awareness
```

**Lo que lo hace "the best del mundo":**

1. **Rule Performance Scoring** — Cada rule tiene un score compuesto: triggerRate × actionRate × successRate × calibratedConfidence. Las peores rules se señalan solas.

2. **Redundancy Detector** — Si dos rules siempre se activan juntas (>80% co-occurrence), son candidatas a merge. Menos rules = menos ruido = mejor UX.

3. **Gap Detector** — Si una secuencia de señales ocurre 3+ veces y ninguna rule la cubre, el sistema lo detecta y propone una nueva rule.

4. **Confidence Drift Detection** — Si una rule tenía 85% confianza hace 30 días y hoy tiene 60%, algo cambió. El sistema lo detecta y alerta.

5. **Coverage Matrix** — Heatmap de qué métricas están bien cubiertas por rules vs cuátes son "blind spots". El club tiene 15 métricas — si solo 8 tienen rules activas, hay 7 puntos ciegos.

6. **Prediction Accuracy Tracker** — ¿La simulación de F53 predijo +₡820K de revenue? ¿Cuánto fue realmente? El sistema compara predicciones vs realidad.

7. **Manager Behavior Analysis** — ¿Qué comandos se usan más? ¿Qué features se ignoran? El sistema aprende de los managers.

8. **Evolution History** — Cada cambio al sistema (rule suprimida, merge, nueva rule, threshold ajustado) queda en un audit trail persistente.

9. **Self-Awareness Score** — Un número 0-100 que dice "¿qué tan bueno es este sistema?" basado en todos los factores anteriores.

10. **Auto-Suppression** — Si una rule se activa 20+ veces y es ignorada 18+ veces, se auto-pausa. Sin intervención humana.

---

### Bloques propuestos:

| # | Block | Archivo | Formato | Líneas |
|---|-------|---------|---------|--------|
| B1 | Evolution Types | `evolution-types.ts` | NEW | ~260 |
| B2 | System Analyzer | `system-analyzer.ts` | NEW | ~380 |
| B3 | Evolution Proposer | `evolution-proposer.ts` | NEW | ~280 |
| B4 | System Health Dashboard | `SystemHealthDashboard.tsx` | NEW | ~430 |
| B5 | useSystemEvolution hook | `useSystemEvolution.ts` | NEW | ~220 |
| B5b | index.ts exports | `index.ts` | QUIRÚRGICO | ~18 |
| **Total** | | **5 new + 1 mod** | | **~1,588** |

**¿Aprobás y arranco con B1?**