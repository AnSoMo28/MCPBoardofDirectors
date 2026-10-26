/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessFamilyMap.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Family Map
   Family wellness profile: fitness level, preferred activities,
   health conditions, dietary restrictions, emergency info.

   Proposals: P1 Family Atlas · P2 Compliance · P3 CSS Stagger ·
     P4 Level Visualization · P5 Activity Focus · P6 Red Zone ·
     P7 Summary Strip · P8 Glass CSS
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Dumbbell,
  Waves,
  Flower2,
  Circle,
  Sparkles,
  Activity,
  UserCheck,
  Brain,
  Heart,
  Phone,
  ShieldAlert,
  Leaf,
  AlertTriangle,
  MoreHorizontal,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

import type {
  WellnessProfileGetResponse,
  WellnessReport,
  ActivityType,
  ClassLevel,
} from "../types";
import { ACTIVITY_TYPE_CONFIG } from "../types";
import "./WellnessFamilyMap.css";

// ═══════════════════════════════════════════════════════════════
// §1  Config
// ═══════════════════════════════════════════════════════════════

interface WellnessReportResponse {
  status: string;
  message: string;
  data: WellnessReport;
  period: string;
}

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  gym: Dumbbell,
  yoga: Flower2,
  pilates: Activity,
  swimming: Waves,
  tennis: Circle,
  spa: Sparkles,
  personal_training: UserCheck,
  group_class: Users,
  meditation: Brain,
  other: MoreHorizontal,
};

const FITNESS_LEVEL_ORDER: ClassLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const FITNESS_LEVEL_CONFIG: Record<
  ClassLevel,
  { label: string; description: string }
> = {
  beginner: {
    label: "Principiante",
    description: "Comenzando el camino del bienestar",
  },
  intermediate: {
    label: "Intermedio",
    description: "Con rutina establecida y buenos hábitos",
  },
  advanced: {
    label: "Avanzado",
    description: "Alto rendimiento y comprometido con metas altas",
  },
  all_levels: {
    label: "Todos los niveles",
    description: "Participa en actividades de cualquier nivel",
  },
};

// ═══════════════════════════════════════════════════════════════
// §2  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessFamilyMapProps {
  familyId: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// §3  Sub-components
// ═══════════════════════════════════════════════════════════════

function InfoSection({
  title,
  items,
  icon,
  severity,
  emptyText,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  severity: "warning" | "danger" | "neutral";
  emptyText: string;
}) {
  return (
    <div className="wafm__info-section" data-severity={severity}>
      <span className="wafm__info-label">{title}</span>
      {items.length > 0 ? (
        <div className="wafm__info-tags">
          {items.map((item, i) => (
            <span key={i} className="wafm__info-tag">
              {icon}
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="wafm__info-empty">{emptyText}</p>
      )}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  colorVar,
}: {
  label: string;
  value: string;
  colorVar: string;
}) {
  return (
    <div className="wafm__chip" style={{ "--chip-color": colorVar } as React.CSSProperties}>
      <span className="wafm__chip-dot" />
      <span className="wafm__chip-label">{label}:</span>
      <span className="wafm__chip-value">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessFamilyMap({
  familyId,
  className,
}: WellnessFamilyMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isRevealed, setIsRevealed] = useState(false);

  // ── Queries ──
  const {
    data: profileResp,
    isLoading: loadingProfile,
    error: profileError,
  } = useMCPQuery<WellnessProfileGetResponse>(
    "wellness",
    "wellness_profile_get",
    { family_id: familyId },
    { staleTime: 300_000 },
  );

  const now = new Date();
  const dateTo = now.toISOString().split("T")[0];
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const dateFrom = from.toISOString().split("T")[0];

  const { data: reportResp, isLoading: loadingReport } =
    useMCPQuery<WellnessReportResponse>(
      "wellness",
      "wellness_report",
      { family_id: familyId, date_from: dateFrom, date_to: dateTo },
      { staleTime: 120_000 },
    );

  const isLoading = loadingProfile || loadingReport;
  const profile =
    profileResp?.status === "success" ? profileResp.data : undefined;
  const report = reportResp?.data;

  // ── Reveal ──
  useEffect(() => {
    if (isLoading || prefersReducedMotion) {
      setIsRevealed(!isLoading);
      return;
    }
    const timer = setTimeout(() => setIsRevealed(true), 100);
    return () => clearTimeout(timer);
  }, [isLoading, prefersReducedMotion]);

  // ── Activity breakdown ──
  const activityBreakdown = useMemo(() => {
    if (!report?.activity_breakdown?.length) return [];
    return [...report.activity_breakdown].sort((a, b) => b.count - a.count);
  }, [report?.activity_breakdown]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={cn("glass-wafm", className)}>
        <div className="wafm__loading">
          <Skeleton className="h-48 rounded-xl" />
          <div className="wafm__loading-grid">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (profileError || !profile) {
    return (
      <div className={cn("glass-wafm", className)}>
        <EmptyState
          icon={<Users size={28} />}
          title="Perfil no encontrado"
          description="No se encontró un perfil de bienestar para esta familia."
        />
      </div>
    );
  }

  // ── Derived ──
  const levelConfig = FITNESS_LEVEL_CONFIG[profile.fitness_level];
  const activeIdx = FITNESS_LEVEL_ORDER.indexOf(profile.fitness_level as ClassLevel);
  const hasConditions = profile.health_conditions.length > 0;
  const hasAllergies = profile.allergies.length > 0;

  // ── Render ──
  return (
    <div
      className={cn("glass-wafm", className)}
      data-fitness-level={profile.fitness_level}
      data-revealed={isRevealed ? "" : undefined}
      data-has-conditions={hasConditions ? "" : undefined}
      data-has-allergies={hasAllergies ? "" : undefined}
    >
      {/* ═══ Family Header (P1) ═══ */}
      <div className="wafm__hero">
        <div className="wafm__hero-glow" aria-hidden="true" />
        <div className="wafm__hero-content">
          <span className="wafm__hero-icon">
            <Users className="w-7 h-7" />
          </span>
          <div className="wafm__hero-info">
            <h3 className="wafm__hero-name">{profile.family_name}</h3>
            <div className="wafm__hero-tags">
              <Badge variant="default" size="sm">{levelConfig.label}</Badge>
              {profile.preferred_activities.length > 0 && (
                <span className="wafm__hero-count">
                  {profile.preferred_activities.length} actividades preferidas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Segmented fitness bar (P4) */}
        <div className="wafm__level-bar">
          <div className="wafm__level-header">
            <span className="wafm__level-label">Nivel de Fitness</span>
            <span className="wafm__level-desc">{levelConfig.description}</span>
          </div>
          <div className="wafm__segments">
            {FITNESS_LEVEL_ORDER.map((level, i) => {
              const cfg = FITNESS_LEVEL_CONFIG[level];
              const isActive = i <= activeIdx;
              const isCurrent = i === activeIdx;
              return (
                <div
                  key={level}
                  className={cn("wafm__segment", isActive && "wafm__segment--active", isCurrent && "wafm__segment--current")}
                  data-level={level}
                  title={`${cfg.label}: ${cfg.description}`}
                />
              );
            })}
          </div>
          <div className="wafm__segment-labels">
            {FITNESS_LEVEL_ORDER.map((level) => {
              const cfg = FITNESS_LEVEL_CONFIG[level];
              return (
                <span key={level} className="wafm__segment-label" data-level={level}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Preferred Activities (P5) ═══ */}
      <div className="wafm__activities-card">
        <h4 className="wafm__card-title">
          <Heart size={16} />
          Actividades Preferidas
        </h4>
        {profile.preferred_activities.length > 0 ? (
          <div className="wafm__activities-grid">
            {profile.preferred_activities.map((actType, i) => {
              const config = ACTIVITY_TYPE_CONFIG[actType];
              const Icon = ACTIVITY_ICONS[actType] || Activity;

              return (
                <div
                  key={actType}
                  className="wafm__activity wafm__stagger"
                  data-category={config?.category ?? "fitness"}
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <span className="wafm__activity-icon">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="wafm__activity-info">
                    <p className="wafm__activity-name">{config?.label || actType}</p>
                    {config?.social && <span className="wafm__activity-social">Social</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="wafm__empty-text">Sin actividades preferidas configuradas.</p>
        )}
      </div>

      {/* ═══ Two-column: Activity + Health ═══ */}
      <div className="wafm__duo">

        {/* Activity Breakdown */}
        <div className="wafm__breakdown-card">
          <h4 className="wafm__card-title">
            <Activity size={16} />
            Actividad Reciente
          </h4>
          {activityBreakdown.length > 0 ? (
            <div className="wafm__breakdown-list">
              {activityBreakdown.map((item, i) => {
                const config = ACTIVITY_TYPE_CONFIG[item.activity_type];
                const Icon = ACTIVITY_ICONS[item.activity_type] || Activity;

                return (
                  <div
                    key={item.activity_type}
                    className="wafm__breakdown-row wafm__stagger"
                    data-category={config?.category ?? "fitness"}
                    style={{ "--stagger-i": i + 6 } as React.CSSProperties}
                  >
                    <span className="wafm__breakdown-icon">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <div className="wafm__breakdown-body">
                      <div className="wafm__breakdown-header">
                        <span className="wafm__breakdown-name">{config?.label || item.activity_type}</span>
                        <span className="wafm__breakdown-stats">{item.count}x · {item.total_minutes}min</span>
                      </div>
                      <div className="wafm__breakdown-bar">
                        <div
                          className="wafm__breakdown-fill"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="wafm__empty-text">Sin actividades registradas en el período.</p>
          )}
        </div>

        {/* Health Info (P6) */}
        <div className="wafm__health-card">
          <div className="wafm__health-header">
            <h4 className="wafm__card-title">
              <ShieldAlert size={16} />
              Información de Salud
            </h4>
            {(hasConditions || hasAllergies) && (
              <span className="wafm__health-alert">
                <Zap size={12} />
              </span>
            )}
          </div>

          <div className="wafm__health-body">
            <InfoSection
              title="Condiciones de Salud"
              items={profile.health_conditions}
              icon={<AlertTriangle className="w-3 h-3" aria-hidden="true" />}
              severity="warning"
              emptyText="Ninguna condición registrada"
            />

            <InfoSection
              title="Alergias"
              items={profile.allergies}
              icon={<ShieldAlert className="w-3 h-3" aria-hidden="true" />}
              severity="danger"
              emptyText="Ninguna alergia registrada"
            />

            <InfoSection
              title="Restricciones Dietéticas"
              items={profile.dietary_restrictions}
              icon={<Leaf className="w-3 h-3" aria-hidden="true" />}
              severity="neutral"
              emptyText="Sin restricciones"
            />

            {/* Emergency contact */}
            {(profile.emergency_contact || profile.emergency_phone) && (
              <div className="wafm__emergency">
                <span className="wafm__emergency-label">Contacto de Emergencia</span>
                <div className="wafm__emergency-row">
                  <Phone size={14} aria-hidden="true" />
                  <div>
                    <p className="wafm__emergency-name">{profile.emergency_contact}</p>
                    {profile.emergency_phone && (
                      <p className="wafm__emergency-phone">{profile.emergency_phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {profile.notes && (
              <div className="wafm__notes">
                <span className="wafm__notes-label">Notas</span>
                <p className="wafm__notes-text">{profile.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Summary Footer (P7) ═══ */}
      {report && (
        <div className="wafm__summary">
          <SummaryChip label="Actividades (30d)" value={report.total_activities.toString()} colorVar="var(--color-emerald-400)" />
          <SummaryChip label="Minutos totales" value={report.total_minutes.toLocaleString()} colorVar="var(--color-teal-400)" />
          <SummaryChip label="Calorías" value={report.total_calories.toLocaleString()} colorVar="var(--color-amber-400)" />
          {report.streak_days > 0 && (
            <SummaryChip label="Racha" value={`${report.streak_days}d`} colorVar="var(--color-gold-400)" />
          )}
        </div>
      )}
    </div>
  );
}