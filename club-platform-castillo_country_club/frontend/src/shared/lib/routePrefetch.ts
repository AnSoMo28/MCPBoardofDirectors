// src/shared/lib/routePrefetch.ts
// ═══════════════════════════════════════════════════════════
// Route Prefetch Registry
//
// Maps sidebar nav paths to their lazy import functions.
// When user hovers a sidebar item, we call the corresponding
// prefetch to start downloading the chunk BEFORE they click.
//
// Each entry is a function that triggers dynamic import()
// without awaiting — the browser caches the chunk.
//
// To add a new route:
//   1. Add the lazy() in router.tsx
//   2. Add the import() here matching the same path
// ═══════════════════════════════════════════════════════════

type PrefetchFn = () => void;

const PREFETCH_MAP: Record<string, PrefetchFn> = {
  // ── Admin / Gerencia ──
  "/admin/dashboard": () => import("@/features/dashboard/ExecutiveDashboard"),
  "/admin/ai-system": () => import("@/features/ai-system/AISystemPage"),

  // ── Families ──
  "/admin/families": () => import("@/features/families/FamilyList"),

  // ── Events ──
  "/admin/events": () => import("@/features/events/EventCalendar"),

  // ── Facilities ──
  "/admin/facilities": () => import("@/features/facilities/FacilityMap"),
  "/admin/facilities-management": () => import("@/features/facilities/FacilitiesDashboard"),

  // ── Members — Phase 30: The Portrait Room ──
  "/admin/member-360": () => import("@/features/members/Member360Dashboard"),

  // ── Domain Dashboards ──
  "/admin/cultural": () => import("@/features/cultural/CulturalDashboard"),
  "/admin/sports": () => import("@/features/sports/SportsDashboard"),
  "/admin/age-groups": () => import("@/features/age-group/AgeGroupDashboard"),
  "/admin/wellness": () => import("@/features/wellness/WellnessDashboard"),
  "/admin/recommendations": () => import("@/features/recommendations/RecommendationsDashboard"),

  // ── ML Intelligence ──
  "/admin/ml": () => import("@/shared/components/ml/MLDashboardPage"),

  // ── Guest Management ──
  "/admin/guests": () => import("@/features/guests/GuestManagementDashboard"),

  // ── Finance ──
  "/admin/finance": () => import("@/features/finance/FinancialDashboard"),

  // ── Communications ──
  "/admin/communications": () => import("@/features/communications/CommunicationCenter"),
  "/admin/communications/board": () => import("@/features/communications/AnnouncementBoard"),
  "/admin/communications/emergency": () => import("@/features/communications/EmergencyBroadcast"),

  // ── Engagement & Satisfaction ──
  "/admin/engagement": () => import("@/features/engagement/EngagementDashboard"),
  "/admin/engagement/campaigns": () => import("@/features/engagement/ReactivationCampaigns"),
  "/admin/engagement/surveys": () => import("@/features/engagement/SatisfactionSurvey"),

  // ── Documents ──
  "/admin/documents": () => import("@/features/documents/DocumentRepository"),
  "/admin/documents/knowledge": () => import("@/features/documents/KnowledgeQuery"),

  // ── Approvals ──
  "/admin/approvals": () => import("@/features/approvals/ApprovalQueue"),

  // ═══════════════════════════════════════════════════════
  // SOCIO (Mi Club)
  // ═══════════════════════════════════════════════════════

  "/mi-club": () => import("@/features/mi-club/MiClubLanding"),
  "/mi-club/familia": () => import("@/features/mi-club/MiClubFamilyPage"),
  "/mi-club/eventos": () => import("@/features/events/EventCalendar"),
  "/mi-club/reservas": () => import("@/features/mi-club/MyReservations"),
  "/mi-club/cuenta": () => import("@/features/finance/FamilyAccount"),
  "/mi-club/encuestas": () => import("@/features/engagement/SatisfactionSurvey"),

  // ═══════════════════════════════════════════════════════
  // OPERACIONES (Staff)
  // ═══════════════════════════════════════════════════════

  "/operaciones/checkin": () => import("@/features/guests/GuestRegistration"),
  "/operaciones/invitados": () => import("@/features/guests/GuestList"),
  "/operaciones/reservas": () => import("@/features/facilities/FacilityMap"),
  "/operaciones/centro-operaciones": () => import("@/features/operations/OperationsDashboard"),

  // ═══════════════════════════════════════════════════════
  // JUNTA DIRECTIVA
  // ═══════════════════════════════════════════════════════

  "/junta/dashboard": () => import("@/features/dashboard/ExecutiveDashboard"),
  "/junta/reportes": () => import("@/features/reports/BoardReportViewer"),

  // ═══════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════

  "/settings": () => import("@/features/settings/SettingsPage"),
};

/**
 * Trigger prefetch for a route chunk.
 * Safe to call multiple times — browser deduplicates.
 * No-op if path has no registered prefetch.
 */
export function prefetchRoute(path: string): void {
  const fn = PREFETCH_MAP[path];
  if (fn) fn();
}