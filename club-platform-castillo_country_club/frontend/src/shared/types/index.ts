// src/shared/types/index.ts
// ═══════════════════════════════════════════════════════════
// SHARED TYPES — Barrel Re-Export
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v1.0 (G9-02)
// @namespace   N/A — barrel re-export
// @keyframes   0
// @depends     ./ai-intelligence.ts · ./domain-enums.ts · ./permissions.ts
//
// Public API of the shared type layer. La entry "shared/types" del
// AUDITED_REGISTRY (manifest §8) resolvía como directorio sin barrel —
// moduleExists() exige archivo o index (VM-06, G9). Mismo patrón que
// shared/lib/mcp/index.ts y shared/components/ui/index.ts.
//
// Nota G9-02: permissions.ts NO está en AUDITED_REGISTRY (consumido por
// stores/auth.store.ts → J-09 ×1); se exporta igual para no partir la
// superficie pública existente — su registro/audit es task M-01.

export type * from "./ai-intelligence";
export type * from "./domain-enums";
export type * from "./permissions";
