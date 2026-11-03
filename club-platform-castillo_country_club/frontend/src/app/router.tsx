// src/app/router.tsx

import { createBrowserRouter, Navigate } from "react-router";
import { RoleRedirect } from "./RoleRedirect";
import { lazy } from "react";
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { Placeholder } from "@/shared/components/feedback/Placeholder";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import NotFoundPage from "@/shared/components/error/NotFoundPage";
// ── Lazy-loaded page components ──

// Dashboard
const ExecutiveDashboard = lazy(() => import("@/features/dashboard/ExecutiveDashboard"));

// Families
const FamilyList = lazy(() => import("@/features/families/FamilyList"));
const FamilyDetail = lazy(() => import("@/features/families/FamilyDetail"));
const FamilyForm = lazy(() => import("@/features/families/FamilyForm"));
const FamiliesDashboardPage = lazy(
  () => import("@/features/families/FamiliesDashboardPage"),
);

// Facilities
const FacilityMap = lazy(() => import("@/features/facilities/FacilityMap"));
const FacilityDetail = lazy(() => import("@/features/facilities/FacilityDetail"));
const ReservationCalendar = lazy(() => import("@/features/facilities/components/ReservationCalendar"));
const FacilitiesDashboard = lazy(() =>
  import("@/features/facilities/FacilitiesDashboard").then((m) => ({ default: m.FacilitiesDashboard })),
);

// Events
const EventCalendar = lazy(() =>
  import("@/features/events/EventCalendar").then(
    (m) => ({ default: m.EventCalendar }),
  ),
);
const EventDetail = lazy(() =>
  import("@/features/events/EventDetail").then(
    (m) => ({ default: m.EventDetail }),
  ),
);
const EventForm = lazy(() =>
  import("@/features/events/EventForm").then(
    (m) => ({ default: m.EventForm }),
  ),
);

// Finance
const FinancialDashboard = lazy(() => import("@/features/finance/FinancialDashboard"));
const FamilyAccount = lazy(() => import("@/features/finance/FamilyAccount"));

// Guests
const GuestRegistration = lazy(() => import("@/features/guests/GuestRegistration"));
const GuestList = lazy(() => import("@/features/guests/GuestList"));
const GuestManagementDashboard = lazy(() => import("@/features/guests/GuestManagementDashboard"));

// Communications
const CommunicationCenter = lazy(() =>
  import("@/features/communications/CommunicationCenter").then(
    (m) => ({ default: m.CommunicationCenter }),
  ),
);
const AnnouncementBoard = lazy(() =>
  import("@/features/communications/AnnouncementBoard").then(
    (m) => ({ default: m.AnnouncementBoard }),
  ),
);
const EmergencyBroadcast = lazy(() =>
  import("@/features/communications/EmergencyBroadcast").then(
    (m) => ({ default: m.EmergencyBroadcast }),
  ),
);

// Engagement
const EngagementDashboard = lazy(() =>
  import("@/features/engagement/EngagementDashboard").then(
    (m) => ({ default: m.EngagementDashboard }),
  ),
);
const ReactivationCampaigns = lazy(() =>
  import("@/features/engagement/ReactivationCampaigns").then(
    (m) => ({ default: m.ReactivationCampaigns }),
  ),
);
const SatisfactionSurvey = lazy(() =>
  import("@/features/engagement/SatisfactionSurvey").then(
    (m) => ({ default: m.SatisfactionSurvey }),
  ),
);
const SatisfactionReport = lazy(() =>
  import("@/features/engagement/SatisfactionReport").then(
    (m) => ({ default: m.SatisfactionReport }),
  ),
);

// Members — Phase 30: The Portrait Room
const Member360Dashboard = lazy(() => import("@/features/members/Member360Dashboard"));

// Wellness
const WellnessDashboard = lazy(() =>
  import("@/features/wellness/WellnessDashboard").then(
    (m) => ({ default: m.WellnessDashboard }),
  ),
);

// Cultural
const CulturalDashboard = lazy(() =>
  import("@/features/cultural/CulturalDashboard").then(
    (m) => ({ default: m.CulturalDashboard }),
  ),
);

// Sports — Phase 33: "The Arena"
const SportsDashboard = lazy(() =>
  import("@/features/sports/SportsDashboard").then((m) => ({
    default: m.SportsDashboard,
  })),
);
// Age Groups
const AgeGroupDashboard = lazy(() =>
  import("@/features/age-group/AgeGroupDashboard").then(
    (m) => ({ default: m.AgeGroupDashboard }),
  ),
);

// Recommendations
const RecommendationsDashboard = lazy(() =>
  import("@/features/recommendations/RecommendationsDashboard").then(
    (m) => ({ default: m.RecommendationsDashboard }),
  ),
);

// AI / ML
const MLDashboardPage = lazy(() => import("@/shared/components/ml/MLDashboardPage"));
const AISystemPage = lazy(() => import("@/features/ai-system/AISystemPage"));

// Operations
const OperationsDashboard = lazy(() => import("@/features/operations/OperationsDashboard"));

// Documents
const DocumentRepository = lazy(() => import("@/features/documents/DocumentRepository"));
const KnowledgeQuery = lazy(() => import("@/features/documents/KnowledgeQuery"));

// Reports & Approvals
const BoardReportViewer = lazy(() => import("@/features/reports/BoardReportViewer"));
const ApprovalQueue = lazy(() => import("@/features/approvals/ApprovalQueue"));

// Mi Club (Socio)
const MiClubLanding = lazy(() => import("@/features/mi-club/MiClubLanding"));
const MyReservations = lazy(() => import("@/features/mi-club/MyReservations"));
const MiClubFamilyPage = lazy(() => import("@/features/mi-club/MiClubFamilyPage"));

// Settings
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));


// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ErrorBoundary level="global">
        <DashboardLayout />
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: <RoleRedirect />,
      },

      // ═══════════════════════════════════════════════════════
      // ADMIN / GERENCIA
      // ═══════════════════════════════════════════════════════

      {
        path: "admin/dashboard",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN"]}>
              <ExecutiveDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/ai-system",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN"]}>
              <AISystemPage />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Families ──
      {
        path: "admin/families",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <FamilyList />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/families/new",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <FamilyForm />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/families/:id/dashboard",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <FamiliesDashboardPage />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/families/:id",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <FamilyDetail />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/families/:id/edit",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <FamilyForm />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Events ──
      {
        path: "admin/events",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <EventCalendar />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/events/new",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <EventForm />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/events/:id",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <EventDetail />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/events/:id/edit",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <EventForm />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Facilities (Map & Detail) ──
      {
        path: "admin/facilities",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <FacilityMap />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/facilities/:id",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <FacilityDetail />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/facilities/:id/reservations",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "SOCIO"]}>
              <ReservationCalendar />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Members — Phase 30: The Portrait Room ──
      {
        path: "admin/member-360",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <Member360Dashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/member-360/:memberId",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <Member360Dashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      // Redirect deprecated route to new Portrait Room
      {
        path: "admin/members/intelligence",
        element: (
          <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
            <Navigate to="/admin/member-360" replace />
          </PermissionGate>
        ),
      },

      // ── Domain Dashboards ──
      {
        path: "admin/cultural",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <CulturalDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/sports",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <SportsDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/facilities-management",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <FacilitiesDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/age-groups",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <AgeGroupDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/wellness",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <WellnessDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/recommendations",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN"]}>
              <RecommendationsDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── ML Intelligence ──
      {
        path: "admin/ml",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <MLDashboardPage />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Guest Management ──
      {
        path: "admin/guests",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <GuestManagementDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Finance ──
      {
        path: "admin/finance",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <FinancialDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/finance/family/:id",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <FamilyAccount />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Communications ──
      {
        path: "admin/communications",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <CommunicationCenter />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/communications/board",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "JUNTA"]}>
              <AnnouncementBoard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/communications/emergency",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN"]}>
              <EmergencyBroadcast />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Engagement & Satisfaction ──
      {
        path: "admin/engagement",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <EngagementDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/engagement/campaigns",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <ReactivationCampaigns />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/engagement/surveys",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF"]}>
              <SatisfactionSurvey />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/engagement/surveys/:id/results",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <SatisfactionReport />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Documents ──
      {
        path: "admin/documents",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <DocumentRepository />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "admin/documents/knowledge",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN", "JUNTA"]}>
              <KnowledgeQuery />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ── Approvals ──
      {
        path: "admin/approvals",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <ApprovalQueue />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ═══════════════════════════════════════════════════════
      // SOCIO (Mi Club)
      // ═══════════════════════════════════════════════════════

      {
        path: "mi-club",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <MiClubLanding />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/familia",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <MiClubFamilyPage />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/eventos",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <EventCalendar />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/reservas",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <MyReservations />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/cuenta",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <FamilyAccount />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/encuestas",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <SatisfactionSurvey />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "mi-club/encuestas/:id",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["SOCIO"]}>
              <SatisfactionSurvey />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ═══════════════════════════════════════════════════════
      // OPERACIONES (Staff)
      // ═══════════════════════════════════════════════════════

      {
        path: "operaciones/checkin",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN"]}>
              <GuestRegistration />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "operaciones/invitados",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN"]}>
              <GuestList />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "operaciones/reservas",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF"]}>
              <FacilityMap />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "operaciones/mantenimiento",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN"]}>
              <Placeholder title="Mantenimiento" subtitle="Phase 32" />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "operaciones/centro-operaciones",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["STAFF", "ADMIN"]}>
              <OperationsDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ═══════════════════════════════════════════════════════
      // JUNTA DIRECTIVA
      // ═══════════════════════════════════════════════════════

      {
        path: "junta/dashboard",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["JUNTA"]}>
              <ExecutiveDashboard />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "junta/reportes",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "JUNTA"]}>
              <BoardReportViewer />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
      {
        path: "junta/estrategia",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["JUNTA"]}>
              <Placeholder title="Estrategia" subtitle="Phase 2" />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },

      // ═══════════════════════════════════════════════════════
      // SETTINGS
      // ═══════════════════════════════════════════════════════

      {
        path: "settings",
        element: (
          <ErrorBoundary level="route">
            <PermissionGate roles={["ADMIN", "STAFF", "SOCIO", "JUNTA"]}>
              <SettingsPage />
            </PermissionGate>
          </ErrorBoundary>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);