// src/shared/lib/toolNameAdapter.ts
// ═══════════════════════════════════════════════════════════
// Tool Name Adapter — Migration bridge
//
// Translates frontend tool names → backend registered names.
// Only applied when calling the REAL backend (not mocks).
//
// Problem:
//   Frontend uses short names: "get_family", "list_families"
//   Backend registers prefixed: "family_get_profile", "family_search"
//
// Solution:
//   This map resolves the mismatch transparently.
//   Mocks keep using frontend names (unchanged).
//
// To migrate a new tool:
//   1. Add entry here
//   2. Remove from mock-registry.ts
//   3. Backend handles it automatically
// ═══════════════════════════════════════════════════════════

type ToolMap = Record<string, string>;

/**
 * Per-server tool name translations.
 * Key = frontend tool name, Value = backend tool name.
 * Only servers with mismatches need entries.
 */
const TRANSLATION_MAP: Record<string, ToolMap> = {
  families: {
    get_family: "family_get_profile",
    create_family: "family_create_profile",
    update_family: "family_update_members",
    list_families: "family_search",
    get_activity_history: "family_get_activity_history",
    get_social_graph: "family_get_social_graph",
    // family_set_preferences already matches — no entry needed
    get_financial_summary: "family_get_financial_summary",
  },
  // Add other servers here as needed:
  // events: { ... },
  // finance: { ... },
};

/**
 * Resolve frontend tool name → backend tool name.
 * Returns the original name if no translation exists.
 */
export function resolveToolName(server: string, tool: string): string {
  return TRANSLATION_MAP[server]?.[tool] ?? tool;
}
