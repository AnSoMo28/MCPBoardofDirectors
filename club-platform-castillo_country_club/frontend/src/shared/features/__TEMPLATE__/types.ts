// src/features/__TEMPLATE__/types.ts
// ═══════════════════════════════════════════════════════════
// [FEATURE] Domain — Types & Configs
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   [PREFIX]-* (feature domain — see FEATURE_MAP in manifest)
// @keyframes   0 (type definitions only)
// @depends     @/shared/types/domain-enums, @/shared/types/ai-intelligence,
//              @/shared/lib/advisor-engine (for advisor types)
//
// SOURCE OF TRUTH:
//   backend/src/club_mcp/models/[model].py
//   backend/src/club_mcp/agents/[agent].py
//
// TEMPLATE COMPLIANCE:
//   [x] File header with metadata
//   [x] §0 SHARED IMPORTS — only from @/shared/
//   [x] §1 DOMAIN-SPECIFIC ENUMS — feature-only types
//   [x] §2 SUB-MODELS — reusable nested structures
//   [x] §3 CORE RESPONSE TYPES — backend-aligned
//   [x] §4 LIST + QUERY RESPONSES — pagination/filtering
//   [x] §5 ANALYTICS — metrics, reports
//   [x] §6 AI INTELLIGENCE — predictions, recommendations
//   [x] §7 ADVISOR INTEGRATION — extends shared advisor types
//   [x] §8 CONFIG MAPS — display configs (label, color, icon)
//
// RULES:
//   [x] All fields readonly (except documented form state)
//   [x] All colors via var(--color-*) tokens
//   [x] No hex in .ts files (R-16)
//   [x] Config maps use as const
//   [x] English enum values + Spanish display labels
//   [x] No default exports (R-13)
//   [x] Nested AI types extracted to named interfaces
//   [x] type imports use `import type` (isolatedModules)
//
// MIGRATION CHECKLIST:
//   [ ] 1. Copy this template to features/[feature]/types.ts
//   [ ] 2. Replace [FEATURE], [PREFIX], [model], [agent]
//   [ ] 3. Define domain enums in §1
//   [ ] 4. Define sub-models in §2 (from backend models)
//   [ ] 5. Define response types in §3 (from API responses)
//   [ ] 6. Define AI types in §6 (from MCP agent outputs)
//   [ ] 7. Define advisor integration in §7
//   [ ] 8. Define config maps in §8 (use var(--color-*) only)
//   [ ] 9. Run: npx tsc --noEmit → 0 errors
//   [ ] 10. Run: npx tsx tools/architecture-guardian.ts → 0 violations
//   [ ] 11. Run: npx tsx tools/validate-shared-imports.ts → 0 unaudited
//   [ ] 12. Update FEATURE_MAP in architecture.manifest.ts
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 SHARED IMPORTS
//
// ONLY import from @/shared/ — never relative (R-01/R-05).
// Use `import type` for type-only imports (isolatedModules).
// ═══════════════════════════════════════════════════════════

// Cross-domain enums (from shared)
import type {
  // EventCategory,
  // EventStatus,
  // RsvpStatus,
  // Add feature-specific shared enums here
} from "../../types/domain-enums";

// AI/intelligence base types (from shared)
import type {
  // AIFactor,
  // AdvisorInsightBase,
  // AdvisorLayer,
} from "../../types/ai-intelligence";

// Advisor engine types (for §7 integration)
import type {
  // BaseContext,
  // EventsContext,
  // HealthFactorDef,
  // Add advisor types as needed
} from "../../lib/advisor-engine";

// ═══════════════════════════════════════════════════════════
// §1 DOMAIN-SPECIFIC ENUMS
//
// Feature-only types. Cross-domain enums live in shared/types/.
// Values: English (type safety). Display labels: §8 CONFIG MAPS.
// ═══════════════════════════════════════════════════════════

// export type FeatureAccessType = "open" | "private" | "restricted";
// export type FeatureStatus = "active" | "inactive" | "archived";

// ═══════════════════════════════════════════════════════════
// §2 SUB-MODELS
//
// Reusable structures nested within response types.
// All fields readonly — immutable data objects.
// ═══════════════════════════════════════════════════════════

// export interface SubModel {
//   readonly id: string;
//   readonly name: string;
//   readonly created_at: string;
//   readonly updated_at: string;
// }

// ═══════════════════════════════════════════════════════════
// §3 CORE RESPONSE TYPES
//
// Backend-aligned response interfaces.
// Full = complete entity with relations.
// Brief = lightweight for list views.
// ═══════════════════════════════════════════════════════════

// export interface FeatureResponse {
//   readonly id: string;
//   readonly name: string;
//   readonly status: FeatureStatus;
//   readonly created_at: string;
//   readonly updated_at: string;
//   readonly sub_models: readonly SubModel[];
// }

// export interface FeatureBrief {
//   readonly id: string;
//   readonly name: string;
//   readonly status: FeatureStatus;
// }

// ═══════════════════════════════════════════════════════════
// §4 LIST + QUERY RESPONSES
//
// Pagination, filtering, calendar/grid views.
// ═══════════════════════════════════════════════════════════

// export interface FeatureListResponse {
//   readonly items: readonly FeatureBrief[];
//   readonly total: number;
//   readonly page: number;
//   readonly total_pages: number;
// }

/**
 * Query filters for list views.
 * INTENTIONALLY MUTABLE — form state (R-14 documented exception).
 */
// export interface FeatureFilters {
//   status: FeatureStatus | "";
//   search?: string;
//   page: number;
//   limit: number;
// }

// ═══════════════════════════════════════════════════════════
// §5 ANALYTICS
//
// Metrics, reports, dashboard data.
// ═══════════════════════════════════════════════════════════

// export interface FeatureAnalytics {
//   readonly total: number;
//   readonly active: number;
//   readonly trend: "up" | "down" | "stable";
// }

// ═══════════════════════════════════════════════════════════
// §6 AI INTELLIGENCE
//
// AI-generated predictions and recommendations.
// Populated by MCP agent tools.
// Extract nested structures to named interfaces.
// ═══════════════════════════════════════════════════════════

// export interface FeaturePrediction {
//   readonly value: number;
//   readonly confidence: number;
//   readonly factors: readonly AIFactor[];
//   readonly recommendation: string;
// }

// export interface FeatureRecommendation {
//   readonly id: string;
//   readonly suggestion: string;
//   readonly priority: "high" | "medium" | "low";
//   readonly estimated_impact: string;
// }

// ═══════════════════════════════════════════════════════════
// §7 ADVISOR INTEGRATION
//
// Feature-specific advisor types.
// Follow events/types.ts pattern (Track C — verified).
//
// PATTERN (from events/types.ts v2):
//   1. Define FeatureAdvisorLayer (extends AdvisorLayer)
//   2. Define FeatureAdvisorInsight using Omit<> & intersection
//      (safe for wider union — prevents covariance error)
// ═══════════════════════════════════════════════════════════

// export type FeatureAdvisorLayer =
//   | AdvisorLayer
//   | "custom_layer_1"
//   | "custom_layer_2";

// export type FeatureAdvisorInsight = Omit<
//   AdvisorInsightBase,
//   "layer" | "domain"
// > & {
//   readonly layer: FeatureAdvisorLayer;
//   readonly domain: "feature_name"; // literal from AIDomain
// };

// ═══════════════════════════════════════════════════════════
// §8 CONFIG MAPS
//
// Display configuration: label (Spanish), color (CSS var), icon.
//
// RULES:
//   - Colors: ONLY var(--color-*) — zero hex (R-16)
//   - bgColor: color-mix() pattern (from events/types.ts)
//   - All maps: as const assertion
//   - English enum values as keys (type-safe Record lookup)
// ═══════════════════════════════════════════════════════════

// export const FEATURE_STATUS_CONFIG: Record<
//   FeatureStatus,
//   { readonly label: string; readonly color: string }
// > = {
//   active:   { label: "Activo",    color: "var(--color-emerald-400)" },
//   inactive: { label: "Inactivo",  color: "var(--color-silver-400)" },
//   archived: { label: "Archivado", color: "var(--color-rose-400)" },
// } as const;

// export const FEATURE_CATEGORY_CONFIG: Record<
//   FeatureCategory,
//   { readonly label: string; readonly color: string; readonly bgColor: string; readonly icon: string }
// > = {
//   category1: {
//     label: "Categoría 1",
//     icon: "📌",
//     color: "var(--color-gold-400)",
//     bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
//   },
// } as const;