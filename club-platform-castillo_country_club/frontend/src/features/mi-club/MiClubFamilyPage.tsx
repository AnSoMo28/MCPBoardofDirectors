/**
 * @component MiClubFamilyPage
 * @namespace (no namespace — wrapper delegante)
 * @depends FamilyDetail, EmptyState
 * @note Wrapper that resolves familyId from auth store and delegates
 *       to FamilyDetail. Defensive: EmptyState with CTA if no family.
 * @import import { MiClubFamilyPage } from './MiClubFamilyPage';
 */

import { useAuthStore } from "@/stores/auth.store";
import FamilyDetail from "@/features/families/FamilyDetail";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Users } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import './MiClubFamilyPage.css';

export function MiClubFamilyPage() {
  const familyId = useAuthStore((s) => s.user?.familyId);

  if (!familyId) {
    return (
      <EmptyState
        icon={<Users className="mi-club-family-page w-12 h-12" />}
        title="Sin familia asociada"
        description="Tu cuenta no tiene una familia vinculada. Contactá al club para más información."
        action={<Button onClick={() => window.open("tel:+50622000000")}>Llamar al club</Button>}
        
      />
    );
  }

  return <FamilyDetail familyIdOverride={familyId} />;
}

export default MiClubFamilyPage;