// ═══════════════════════════════════════════════════════════
// src/features/families/FamiliesDashboardPage.tsx
// Phase 34+ Migration — Dashboard Page Wrapper
// Level 6+ Agency · Production Grade
//
// Thin page wrapper that reads :id from URL params and
// passes it to FamiliesDashboard. Keeps the component
// pure (prop-driven) while enabling router integration.
//
// PRE-WRITE VERIFICATION:
//   FamiliesDashboard   → ./components/FamiliesDashboard.tsx ✅
//   useParams           → react-router ✅
//   useNavigate          → react-router ✅
//
// ANTI-PATTERNS REMOVED:
//   - Component accepting router params directly → page wrapper pattern
//   - No navigation callbacks → prev/next/open handlers
//   - No error handling for missing id → guard with message
// ═══════════════════════════════════════════════════════════

import { useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { FamiliesDashboard } from "./components/FamiliesDashboard";

// ═══════════════════════════════════════════════════════════
// §1  Component
// ═══════════════════════════════════════════════════════════

export default function FamiliesDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleNavigateFamily = useCallback(
    (direction: "prev" | "next") => {
      // Navigate between siblings in the family list.
      // Uses browser history for simplicity — a future
      // enhancement could pass the full ID list via context.
      if (direction === "prev") {
        navigate(-1);
      } else {
        navigate(1);
      }
    },
    [navigate],
  );

  const handleOpenFamily = useCallback(
    (familyId: string) => {
      navigate(`/admin/families/${familyId}`);
    },
    [navigate],
  );

  if (!id) {
    return (
      <div className="fm-dash" data-testid="families-dashboard" data-state="error">
        <p className="fm-dash__error">ID de familia no especificado.</p>
      </div>
    );
  }

  return (
    <FamiliesDashboard
      familyId={id}
      onNavigateFamily={handleNavigateFamily}
      onOpenFamily={handleOpenFamily}
    />
  );
}