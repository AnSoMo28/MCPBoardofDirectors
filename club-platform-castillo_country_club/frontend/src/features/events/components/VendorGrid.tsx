// src/features/events/components/VendorGrid.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Vendor Grid Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   vg-* (vendor grid)
// @keyframes   2 (in VendorGrid.css)
// @depends     shared/components/ui: Badge, EmptyState,
//              shared/lib/utils: cn,
//              lucide-react: Briefcase, Users, Phone, Mail,
//              DollarSign, Check, Utensils, Music, Palette,
//              Camera, Flower2, Truck,
//              ../types: VendorRecord, VENDOR_STATUS_CONFIG
//
// Vendor card grid with:
//   - Contract status left-border accent
//   - Service type icon circle
//   - Cost comparison bar (quoted vs final)
//   - Card stagger cascade (--card-i)
//   - Card hover lift + glow
//   - Summary cost breakdown with savings indicator
//
// PRE-WRITE VERIFICATION:
// [x] Badge: variant, size, children ✅ (FASE 1, 9.3)
// [x] EmptyState: icon?, title, description? ✅ (FASE 1, 9.3)
// [x] cn verified in shared/lib/utils ✅
// [x] VendorRecord, VENDOR_STATUS_CONFIG → ../types ✅
//
// ANTI-PATTERNS REMOVED:
// [x] 1 glass-* undefined namespace → vg-* BEM
// [x] ~20 Tailwind utilities → vg-* BEM
// [x] font-[ family-name:var(--font-*) ] → CSS font-family
// [x] w-3 h-3, w-12 h-12 → CSS sizing
// [x] 0 data-testid → 5 attributes
// [x] Props not readonly → readonly
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  Briefcase,
  Users,
  Phone,
  Mail,
  DollarSign,
  Utensils,
  Music,
  Palette,
  Camera,
  Flower2,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Shared — UI
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { VendorRecord } from "../types";
import { VENDOR_STATUS_CONFIG } from "../types";

// Styles
import "./VendorGrid.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface VendorGridProps {
  /** List of vendor records for the event */
  readonly vendors: readonly VendorRecord[];
}

/** Contract status → border color mapping. */
interface StatusBorderConfig {
  readonly borderClass: string;
  readonly badgeVariant: "success" | "error" | "neutral" | "info";
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Service type → icon + color. */
const SERVICE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  catering: { icon: Utensils, color: "var(--color-amber-400)" },
  food: { icon: Utensils, color: "var(--color-amber-400)" },
  musica: { icon: Music, color: "var(--color-violet-400)" },
  music: { icon: Music, color: "var(--color-violet-400)" },
  decoracion: { icon: Palette, color: "var(--color-rose-400)" },
  decor: { icon: Palette, color: "var(--color-rose-400)" },
  fotografia: { icon: Camera, color: "var(--color-teal-400)" },
  photography: { icon: Camera, color: "var(--color-teal-400)" },
  flores: { icon: Flower2, color: "var(--color-emerald-400)" },
  flowers: { icon: Flower2, color: "var(--color-emerald-400)" },
  logistica: { icon: Truck, color: "var(--color-sky-400)" },
  logistics: { icon: Truck, color: "var(--color-sky-400)" },
};

const DEFAULT_SERVICE_ICON = { icon: Briefcase, color: "var(--color-silver-400)" };

/** Contract status → border + badge variant. */
const STATUS_BORDER: Record<string, StatusBorderConfig> = {
  confirmed: { borderClass: "vg-card--confirmed", badgeVariant: "success" },
  pending: { borderClass: "vg-card--pending", badgeVariant: "neutral" },
  cancelled: { borderClass: "vg-card--cancelled", badgeVariant: "error" },
  draft: { borderClass: "vg-card--draft", badgeVariant: "neutral" },
};

// ═══════════════════════════════════════════════════════════
// §3 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 Vendor Card ─────────────────────────────────────

function VendorCard({
  vendor,
  cardIndex,
}: {
  readonly vendor: VendorRecord;
  readonly cardIndex: number;
}) {
  const config = VENDOR_STATUS_CONFIG[vendor.contract_status];
  const statusBorder = STATUS_BORDER[vendor.contract_status] ?? STATUS_BORDER.draft;
  const serviceKey = vendor.service_type.toLowerCase();
  const serviceCfg = SERVICE_ICONS[serviceKey] ?? DEFAULT_SERVICE_ICON;
  const ServiceIcon = serviceCfg.icon;

  const hasFinal = vendor.final_cost != null && vendor.final_cost > 0;
  const costPct = hasFinal && vendor.quoted_cost > 0
    ? Math.min(100, ((vendor.final_cost ?? 0) / vendor.quoted_cost) * 100)
    : 0;
  const isOverBudget = hasFinal && (vendor.final_cost ?? 0) > vendor.quoted_cost;

  return (
    <div
      className={cn(
        "vg-card",
        statusBorder.borderClass,
        "vg-stagger",
      )}
      style={{ "--card-i": cardIndex } as React.CSSProperties}
      data-testid={`vg-card-${vendor.id}`}
    >
      {/* Header */}
      <div className="vg-card__header">
        <div className="vg-card__service-icon" style={{ "--svc-color": serviceCfg.color } as React.CSSProperties} aria-hidden="true">
          <ServiceIcon size={16} />
        </div>
        <div className="vg-card__title-block">
          <h5 className="vg-card__name">{vendor.name}</h5>
          <p className="vg-card__type">{vendor.service_type}</p>
        </div>
        <Badge
          variant={statusBorder.badgeVariant}
          size="sm"
        >
          {config.label}
        </Badge>
      </div>

      {/* Notes */}
      {vendor.notes && (
        <p className="vg-card__notes">{vendor.notes}</p>
      )}

      {/* Cost comparison bar */}
      {vendor.quoted_cost > 0 && (
        <div className="vg-cost" data-testid={`vg-cost-${vendor.id}`}>
          <div className="vg-cost__header">
            <span className="vg-cost__label">Cotizado</span>
            <span className="vg-cost__amount">₡{vendor.quoted_cost.toLocaleString("es-CR")}</span>
          </div>
          {hasFinal && (
            <>
              <div className="vg-cost__bar">
                <div
                  className={cn("vg-cost__fill", isOverBudget && "vg-cost__fill--over")}
                  style={{ width: `${costPct}%` }}
                />
              </div>
              <div className="vg-cost__final">
                <span className="vg-cost__final-label">Final</span>
                <span className={cn("vg-cost__final-amount", isOverBudget ? "vg-cost__final-amount--over" : "vg-cost__final-amount--under")}>
                  ₡{(vendor.final_cost ?? 0).toLocaleString("es-CR")}
                  {!isOverBudget && (
                    <span className="vg-cost__savings">
                      (−₡{(vendor.quoted_cost - (vendor.final_cost ?? 0)).toLocaleString("es-CR")})
                    </span>
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Contact info */}
      <div className="vg-card__contacts">
        {vendor.contact_name && (
          <span className="vg-card__contact">
            <Users size={12} className="vg-card__contact-icon" aria-hidden="true" />
            {vendor.contact_name}
          </span>
        )}
        {vendor.contact_phone && (
          <span className="vg-card__contact">
            <Phone size={12} className="vg-card__contact-icon" aria-hidden="true" />
            {vendor.contact_phone}
          </span>
        )}
        {vendor.contact_email && (
          <span className="vg-card__contact">
            <Mail size={12} className="vg-card__contact-icon" aria-hidden="true" />
            {vendor.contact_email}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * VendorGrid — Vendor card grid with cost comparison.
 *
 * Cards show service type icon, contract status border,
 * quoted vs final cost comparison bar, and contact info.
 * Summary bar shows total vendors and budget status.
 */
export function VendorGrid({ vendors }: VendorGridProps) {
  const totalQuoted = useMemo(
    () => vendors.reduce((sum, v) => sum + v.quoted_cost, 0),
    [vendors],
  );

  const totalFinal = useMemo(
    () => vendors.reduce((sum, v) => sum + (v.final_cost ?? v.quoted_cost), 0),
    [vendors],
  );

  const hasFinalCosts = useMemo(
    () => vendors.some((v) => v.final_cost != null && v.final_cost > 0),
    [vendors],
  );

  const savings = totalQuoted - totalFinal;

  if (vendors.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="vg__empty-icon" />}
        title="Sin proveedores"
        description="Aún no se han registrado proveedores para este evento."
      />
    );
  }

  return (
    <div className="vg" data-testid="vg">
      {/* Summary */}
      <div className="vg-summary" data-testid="vg-summary">
        <span className="vg-summary__count">
          {vendors.length} proveedor{vendors.length !== 1 ? "es" : ""}
        </span>
        {hasFinalCosts && (
          <span className={cn("vg-summary__total", savings >= 0 ? "vg-summary__total--saved" : "vg-summary__total--over")}>
            <DollarSign size={12} aria-hidden="true" />
            Total: ₡{totalFinal.toLocaleString("es-CR")}
            {savings > 0 && (
              <span className="vg-summary__savings">
                · Ahorrado: ₡{savings.toLocaleString("es-CR")}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="vg__grid">
        {vendors.map((vendor, idx) => (
          <VendorCard key={vendor.id} vendor={vendor} cardIndex={idx} />
        ))}
      </div>
    </div>
  );
}