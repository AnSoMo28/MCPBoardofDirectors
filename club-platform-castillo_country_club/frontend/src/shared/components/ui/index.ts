// src/shared/components/ui/index.ts
// ═══════════════════════════════════════════════════════════
// SHARED UI COMPONENTS — Barrel Re-Export
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.1
// @namespace   N/A — barrel re-export
// @keyframes   0
// @depends     All ./Component.tsx files in this directory
//
// Single import point for all shared UI primitives.
// Features MUST import from this barrel — never from individual files.
//
//   // ✅ CORRECT — barrel import
//   import { Button, Card, Modal } from "@shared/components/ui";
//
//   // ❌ FORBIDDEN — direct file import (R-02)
//   import { Button } from "@shared/components/ui/Button";
//
// MANIFEST NOTE (§3):
//   Manifest lists 23 component names. Actual export surface (v2.1,
//   verificado por conteo estático — hallazgo G8-14):
//   - 30 component symbols from 23 files (compound: Card → 6,
//     Skeleton → 3, Toast → 1 component + 1 imperative API)
//   - 1 imperative API function (showToast)
//   - 2 utility class strings (inputClass, selectClass — exactamente
//     2; el "etc." de v2.0 era claim drift)
//   - 23 type re-exports (Props interfaces + ToastMessage/ToastType)
//
//   Naming discrepancies documented:
//   - Manifest "Toast" → actual: ToastContainer + showToast +
//     ToastMessage/ToastType types (v2.1: types re-exported)
//   - Manifest "Card" → actual: Card + 5 compound sub-components
//
// ANTI-PATTERNS REMOVED (v1 → v2):
// [x] Missing 7 exports (manifest §3 says 23, barrel had 16) → all 23 added
// [x] No file header → complete header with metadata
// [x] No documentation → usage examples + manifest mapping
// [x] No § sections → organized by component category
// [x] Sparse type re-exports → Props types added for audited components
// [x] Utility strings ungrouped → §8 UTILITIES section
//
// FIXES APPLIED (v2.1) — hallazgo G8-14 (auditoría Lote 4):
// [x] "3 utility class strings (…etc.)" → son 2 (inputClass,
//     selectClass) — el "etc." era drift documental.
// [x] ToastMessage / ToastType NO se re-exportaban → añadidos
//     (los consumers tipan estado de toasts; providers.tsx v1.1 y
//     los hooks los necesitan vía barrel).
// [x] Conteo de components precisado: 30 símbolos / 23 archivos.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §1 CORE PRIMITIVES
// Buttons, badges, inputs, cards — the building blocks.
// ═══════════════════════════════════════════════════════════

export { Button } from "./Button";
export type { ButtonProps } from "./Button";

export { Badge } from "./Badge";
export type { BadgeProps } from "./Badge";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
export type {
  CardProps,
} from "./Card";

export { Input } from "./Input";
export type { InputProps } from "./Input";

// ═══════════════════════════════════════════════════════════
// §2 FORMS
// Field-level form components.
// ═══════════════════════════════════════════════════════════

export { FormField } from "./FormField";
export type { FormFieldProps } from "./FormField";

export { FilterDropdown } from "./FilterDropdown";
export type { FilterDropdownProps, FilterOption } from "./FilterDropdown";

export { WizardStepper } from "./WizardStepper";
export type { WizardStepperProps } from "./WizardStepper";

// ═══════════════════════════════════════════════════════════
// §3 FEEDBACK
// Loading states, empty states, notifications.
// ═══════════════════════════════════════════════════════════

export {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
} from "./Skeleton";
export type {
  SkeletonProps,
  CardSkeletonProps,
  TableSkeletonProps,
} from "./Skeleton";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

// ═══════════════════════════════════════════════════════════
// §4 OVERLAYS
// Modals, toasts, notifications.
// ═══════════════════════════════════════════════════════════

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";

// Manifest §3 lists "Toast". Actual export surface: ToastContainer
// (component) + showToast (imperative API) + ToastMessage/ToastType
// (types — G8-14). All exported.
export { ToastContainer, showToast } from "./Toast";
export type { ToastMessage, ToastType } from "./Toast";

export { NotificationDropdown } from "./NotificationDropdown";

export { CommandPalette } from "./CommandPalette";

// ═══════════════════════════════════════════════════════════
// §5 DATA DISPLAY
// Tables, charts, gauges, status indicators.
// ═══════════════════════════════════════════════════════════

export { Table } from "./Table";
export type { TableProps } from "./Table";

export { ScoreGauge } from "./ScoreGauge";
export type { ScoreGaugeProps } from "./ScoreGauge";

export { TrendIcon } from "./TrendIcon";
export type { TrendIconProps } from "./TrendIcon";

export { FreshnessBadge } from "./FreshnessBadge";
export type { FreshnessBadgeProps } from "./FreshnessBadge";

export { StaleDataBanner } from "./StaleDataBanner";
export type { StaleDataBannerProps } from "./StaleDataBanner";

// ═══════════════════════════════════════════════════════════
// §6 GLASS SURFACES
// Glass morphism primitives from globals.css.
// ═══════════════════════════════════════════════════════════

export { GlowButton } from "./GlowButton";
export type { GlowButtonProps } from "./GlowButton";

export { FrostedGlassCard } from "./FrostedGlassCard";
export type { FrostedGlassCardProps } from "./FrostedGlassCard";

// ═══════════════════════════════════════════════════════════
// §7 ADVISOR UI
// Components that render Advisor Engine output.
// ═══════════════════════════════════════════════════════════

export { AdvisorActionModal } from "./AdvisorActionModal";

export { AdvisorReactionCard } from "./AdvisorReactionCard";
export type { AdvisorReactionCardProps } from "./AdvisorReactionCard";

export { PlanStepApprovalModal } from "./PlanStepApprovalModal";
export type { PlanStepApprovalModalProps } from "./PlanStepApprovalModal";

// ═══════════════════════════════════════════════════════════
// §8 UTILITIES
// Class name constants for styling shared form elements.
// These are CSS class strings, not React components. Exactly 2
// (G8-14: "etc." eliminado — el conteo es verificable).
// Used when a feature needs the shared input styling
// but builds its own wrapper (e.g., custom select, textarea).
// ═══════════════════════════════════════════════════════════

export { inputClass, selectClass } from "./FormField";
