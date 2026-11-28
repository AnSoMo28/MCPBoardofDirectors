/* ═══════════════════════════════════════════════════════════════
   Wellness Family Selector — Extracted (P18)
   Admin family search and selection.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Search, Users } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import './WellnessFamilySelector.css';

/**
 * P2-C3g C16 — items de family_search: FamilyBrief
 * (backend/src/club_mcp/models/family.py · 7 campos snake_case).
 * El tipo compartido (families/types, 14 campos camelCase) queda como deuda C3h.
 */
interface WellnessFamilyItem {
  id: string;
  name: string;
  tier: string;
  status: string;
  member_count: number;
  engagement_score: number;
  join_date: string;
}

interface WellnessFamilyListResponse {
  families: WellnessFamilyItem[];
}

interface Props {
  selectedId: string;
  onSelect: (family: WellnessFamilyItem) => void;
}

export function WellnessFamilySelector({ selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const { data: familiesResp, isLoading } = useMCPQuery<WellnessFamilyListResponse>(
    "family_profile",
    "family_search",
    { query: search || "", limit: 100 },
    { staleTime: 60_000 },
  );

  const families = familiesResp?.families ?? [];
  const filtered = search
    ? families.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()),
      )
    : families;

  return (
    <Card className="wellness-family-selector p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
          }}
        >
          <Users
            className="w-5 h-5"
            style={{ color: "var(--color-gold-400)" }}
          />
        </div>
        <div>
          <h3 className="font-display text-base text-[var(--color-silver-100)]">
            Seleccionar Familia
          </h3>
          <p className="font-ui text-xs text-[var(--color-silver-400)]">
            Elegí una familia para ver su análisis de bienestar
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-silver-500)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar familia..."
          className="pl-10 min-h-[44px]"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="font-ui text-sm text-[var(--color-silver-400)] text-center py-4">
          No se encontraron familias.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {filtered.map((family) => {
            const isSelected = selectedId === family.id;
            return (
              <Button
                variant="unstyled"
                key={family.id}
                onClick={() => onSelect(family)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150",
                  "border min-h-[52px]",
                  isSelected
                    ? "bg-[color-mix(in srgb,var(--color-gold-400)10%,transparent)] border-[var(--color-gold-400)]/25"
                    : "bg-[var(--color-surface-1)] border-white/[0.06] hover:border-white/[0.12] hover:bg-[var(--color-surface-2)]",
                )}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-ui"
                  style={{
                    background: "var(--color-surface-3)",
                    color: isSelected
                      ? "var(--color-gold-400)"
                      : "var(--color-silver-300)",
                  }}
                >
                  {family.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-ui text-sm truncate"
                    style={{
                      color: isSelected
                        ? "var(--color-gold-400)"
                        : "var(--color-silver-200)",
                    }}
                  >
                    {family.name}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--color-silver-500)]">
                    {family.member_count} miembro
                    {family.member_count !== 1 ? "s" : ""} · {family.tier}
                  </p>
                </div>
                <Badge
                  variant={family.status === "active" ? "success" : "warning"}
                  size="sm"
                >
                  {family.status === "active" ? "Activa" : family.status}
                </Badge>
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
}