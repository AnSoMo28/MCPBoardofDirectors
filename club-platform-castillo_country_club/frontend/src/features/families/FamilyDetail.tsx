// src/features/families/FamilyDetail.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Detail View
// Level 6+ Agency · Production Grade
//
// 8-tab intelligence-first detail view.
//
// PRE-WRITE VERIFICATION:
//   useFamilyDetail      → ./hooks/useFamilyDetail.ts ✅
//   FamilyDetailTab      → ./hooks/useFamilyDetail.ts ✅ (NOT DetailTabId)
//   AdvisorState         → ./hooks/useFamilyDetail.ts ✅
//   FamilyDetailResponse → ./types.ts ✅
//   SocialBond           → ./social-types.ts ✅ (replaces EnrichedSocialConnection)
//   SocialMatch          → ./social-types.ts ✅ (replaces SuggestedConnection)
//   TIER_CONFIG etc      → ./config.ts ✅ (moved from types.ts)
//   formatDate, formatMonthYear → ./config.ts ✅
//   formatCurrency       → @/shared/lib/utils.ts ✅
//   calculateAge, getAgeGroup  → @/shared/lib/utils.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - 5 cn() calls → data-* attributes + CSS
//   - ~200 Tailwind utilities → BEM .fm-familyDetail__*
//   - 12 inline color styles → CSS custom property bridges
//   - glass-family-detail__* namespace → fm-familyDetail__*
//   - advisorInsights (not on return type) → advisor.insights
//   - DetailTabId (doesn't exist) → FamilyDetailTab
//   - EnrichedSocialConnection → SocialBond
//   - SuggestedConnection → SocialMatch
//   - sug.reason → sug.reasons[0]?.detail
//   - (error as Error)?.message → instanceof Error guard
//   - Missing data-testid, role="region" → added
//   - useCallback imported but unused → removed
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { formatCurrency, getAgeGroup, calculateAge } from "@/shared/lib/utils";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { DetailTabs } from "@/shared/components/layout/DetailTabs";
import { showToast } from "@/shared/components/ui";

import {
  Users, DollarSign, Edit, AlertTriangle,
  TrendingUp, CreditCard, ArrowLeft, Settings,
  ChevronUp, ChevronDown, ArrowRight,
  LayoutDashboard, Brain, Share2, Camera, MessageSquare,
  Network, Sparkles,
} from "lucide-react";

/* ── Feature types ── */

import type { FamilyPreferences, PreferredLanguage, PrivacyLevel } from "./types";
/* ── Feature config ── */
import {
  TIER_CONFIG, STATUS_CONFIG, CHURN_CONFIG, ROLE_LABELS,
  formatDate, formatMonthYear,
  INTEREST_PRESETS, CHANNEL_OPTIONS, PRIVACY_OPTIONS,
} from "./config";

/* ── Social types ── */
import type { SocialBond, SocialMatch } from "./social-types";

/* ── Phase 34+ Components ── */
import { AdaptiveCardHero } from "./components/AdaptiveCardHero";
import { FamilyTemperature } from "./components/FamilyTemperature";
import { FamilyIntelligencePanel } from "./components/FamilyIntelligencePanel";
import { FamilyAdvisorBanner } from "./components/FamilyAdvisorBanner";
import { SocialGraph } from "./components/SocialGraph";
import { MemberCard } from "./components/MemberCard";

/* ── Hook ── */
import { useFamilyDetail } from "./hooks/useFamilyDetail";
import type { FamilyDetailTab } from "./hooks/useFamilyDetail";

/* ── CSS ── */
import "./FamilyDetail.css";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

/** Cluster of related families detected in the social graph. */
interface SocialGraphCluster {
  readonly id: string;
  readonly name: string;
  readonly familyIds: readonly string[];
}

/** Self-fetching social graph MCP response shape. */
interface SocialGraphResponse {
  readonly data: {
    readonly connections: readonly SocialBond[];
    readonly totalConnections: number;
    readonly clusters: readonly SocialGraphCluster[];
    readonly suggestedConnections: readonly SocialMatch[];
  };
}

/** Tab icon map — unique icon per tab. */
const TAB_ICONS: Record<FamilyDetailTab, typeof Users> = {
  overview: LayoutDashboard,
  members: Users,
  intelligence: Brain,
  social: Share2,
  memories: Camera,
  finances: DollarSign,
  communication: MessageSquare,
  preferences: Settings,
};

// ═══════════════════════════════════════════════════════════
// §2  DetailSkeleton
// ═══════════════════════════════════════════════════════════

function DetailSkeleton() {
  return (
    <div className="fm-familyDetail__skeleton" aria-hidden="true">
      <div className="fm-familyDetail__skeleton-header">
        <div className="fm-familyDetail__skeleton-avatar" />
        <div className="fm-familyDetail__skeleton-info">
          <div className="fm-familyDetail__skeleton-line fm-familyDetail__skeleton-line--name" />
          <div className="fm-familyDetail__skeleton-line fm-familyDetail__skeleton-line--subtitle" />
          <div className="fm-familyDetail__skeleton-badges">
            <div className="fm-familyDetail__skeleton-badge" />
            <div className="fm-familyDetail__skeleton-badge fm-familyDetail__skeleton-badge--wide" />
          </div>
        </div>
      </div>
      <div className="fm-familyDetail__skeleton-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`skel-stat-${i}`} className="fm-familyDetail__skeleton-stat" />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §3  SocialTabContent — Self-fetching enriched connections
// ═══════════════════════════════════════════════════════════

function SocialTabContent({
  familyId,
  familyName,
}: {
  readonly familyId: string;
  readonly familyName: string;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useMCPQuery<SocialGraphResponse>(
    "family_profile",
    "family_social_graph_enriched",
    { familyId },
    { staleTime: 60_000 },
  );

  if (isLoading) {
    return (
      <div className="fm-familyDetail__social-loading">
        <Skeleton className="fm-familyDetail__social-skeleton-graph" />
        <Skeleton className="fm-familyDetail__social-skeleton-list" />
      </div>
    );
  }

  const payload = data?.data;
  const connections = payload?.connections ?? [];
  const clusters = payload?.clusters ?? [];
  const suggestedConnections = payload?.suggestedConnections ?? [];

  if (isError) {
    return (
      <div className="fm-familyDetail__social-loading">
        <EmptyState
          icon={<AlertTriangle />}
          title="Error al cargar conexiones"
          description={
            error instanceof Error
              ? error.message
              : "No se pudo cargar el grafo social."
          }
        />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="fm-familyDetail__social-loading">
        <EmptyState
          icon={<Network />}
          title="Sin conexiones"
          description="Esta familia no tiene conexiones registradas con otras familias del club."
        />
      </div>
    );
  }

  return (
    <div className="fm-familyDetail__social">
      {/* Clusters */}
      {clusters.length > 0 && (
        <div className="fm-familyDetail__cluster-bar">
          <span className="fm-familyDetail__cluster-label">
            Clusters detectados:
          </span>
          {clusters.map((cl) => (
            <Badge key={cl.id} variant="neutral" size="sm">
              {cl.name} ({cl.familyIds.length} familias)
            </Badge>
          ))}
        </div>
      )}

      {/* Graph */}
      <SocialGraph
        familyId={familyId}
        familyName={familyName}
        connections={connections}
        suggestedConnections={suggestedConnections}
        onNodeClick={(id) => navigate(`/admin/families/${id}`)}
      />

      {/* Connection details */}
      <Card padding={false} hover={false} className="fm-familyDetail__connections-card" tone="silver">
        <h4 className="fm-familyDetail__section-title">Detalle de conexiones</h4>
        <div className="fm-familyDetail__connections-list">
          {connections.map((conn) => {
            const pct = Math.round(conn.strength * 100);
            const strengthLevel =
              conn.strength > 0.7 ? "strong"
              : conn.strength > 0.4 ? "medium"
              : "weak";
            const isOpen = expanded === conn.connectedFamilyId;

            return (
              <div key={conn.connectedFamilyId} className="fm-familyDetail__connection-item">
                <div
                  className="fm-familyDetail__connection-row"
                  tabIndex={0}
                  role="link"
                  aria-label={`Ver ${conn.connectedFamilyName}`}
                  onClick={() => navigate(`/admin/families/${conn.connectedFamilyId}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/admin/families/${conn.connectedFamilyId}`);
                    }
                  }}
                >
                  <div
                    className="fm-familyDetail__connection-avatar"
                    style={{ "--detail-conn-initial": `"${conn.connectedFamilyName.charAt(0)}"` } as CSSProperties}
                  >
                    <span aria-hidden="true">{conn.connectedFamilyName.charAt(0)}</span>
                  </div>

                  <div className="fm-familyDetail__connection-info">
                    <div className="fm-familyDetail__connection-name-row">
                      <span className="fm-familyDetail__connection-name">
                        {conn.connectedFamilyName}
                      </span>
                      <Badge
                        variant={
                          conn.connectedTier === "platino" ? "neutral"
                          : conn.connectedTier === "oro" ? "gold"
                          : conn.connectedTier === "plata" ? "info"
                          : "warning"
                        }
                        size="sm"
                      >
                        {conn.connectedTier}
                      </Badge>
                    </div>
                    <span className="fm-familyDetail__connection-relationship">
                      {conn.relationship}
                    </span>
                  </div>

                  <div className="fm-familyDetail__connection-metrics">
                    <div className="fm-familyDetail__strength-bar">
                      <div
                        className="fm-familyDetail__strength-fill"
                        data-strength={strengthLevel}
                        style={{ "--detail-strength-pct": `${pct}%` } as CSSProperties}
                      />
                    </div>
                    <span className="fm-familyDetail__strength-pct">
                      {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(isOpen ? null : conn.connectedFamilyId);
                      }}
                      className="fm-familyDetail__expand-btn"
                      aria-label={isOpen ? "Colapsar" : "Expandir"}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expandable detail */}
                <div className="fm-familyDetail__expand-content" data-open={isOpen || undefined}>
                  {conn.sharedActivities && conn.sharedActivities.length > 0 && (
                    <div className="fm-familyDetail__expand-section">
                      <span className="fm-familyDetail__expand-label">
                        Actividades compartidas:
                      </span>
                      <div className="fm-familyDetail__expand-tags">
                        {conn.sharedActivities.map((a) => (
                          <Badge key={a} variant="neutral" size="sm">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="fm-familyDetail__expand-meta">
                    {conn.sharedEvents !== undefined && (
                      <span>{conn.sharedEvents} eventos juntos</span>
                    )}
                    {conn.lastInteraction && (
                      <span>Última: {formatDate(conn.lastInteraction)}</span>
                    )}
                  </div>
                  {conn.aiInsight && (
                    <p className="fm-familyDetail__expand-insight">
                      AI: {conn.aiInsight}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Suggested connections */}
      {suggestedConnections.length > 0 && (
        <Card padding={false} hover={false} className="fm-familyDetail__matches-card" tone="teal">
          <div className="fm-familyDetail__matches-header">
            <Sparkles className="fm-familyDetail__matches-icon" />
            <h4 className="fm-familyDetail__section-title fm-familyDetail__section-title--inline">
              Conexiones sugeridas (AI)
            </h4>
          </div>
          <div className="fm-familyDetail__matches-list">
            {suggestedConnections.map((sug) => (
              <div key={sug.familyId} className="fm-familyDetail__match-card">
                <div className="fm-familyDetail__match-avatar">
                  <span aria-hidden="true">{sug.familyName.charAt(0)}</span>
                </div>
                <div className="fm-familyDetail__match-info">
                  <div className="fm-familyDetail__match-name-row">
                    <span className="fm-familyDetail__match-name">
                      {sug.familyName}
                    </span>
                    <Badge variant="neutral" size="sm">{sug.tier}</Badge>
                    <span className="fm-familyDetail__match-score">
                      {sug.matchScore}%
                    </span>
                  </div>
                  <p className="fm-familyDetail__match-reason">
                    {sug.reasons[0]?.detail ?? "Compatibilidad detectada por el sistema"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/admin/families/${sug.familyId}`)}
                  icon={<ArrowRight className="fm-familyDetail__btn-icon" />}
                >
                  Ver
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  PreferencesTabContent — Self-contained form
// ═══════════════════════════════════════════════════════════

function PreferencesTabContent({
  familyId,
  preferences,
}: {
  readonly familyId: string;
  readonly preferences?: FamilyPreferences;
}) {
  const [language, setLanguage] = useState<PreferredLanguage>(
    preferences?.preferred_language ?? "es"
  );
  const [channels, setChannels] = useState<string[]>(
    [...(preferences?.notification_channels ?? ["email", "push"])],
  );
  const [interests, setInterests] = useState<string[]>(
    [...(preferences?.interests ?? ["Pádel", "Gastronomía"])],
  );
  const [privacy, setPrivacy] = useState<PrivacyLevel>(
    preferences?.privacy_level ?? "normal"
  );
  const [dietary, setDietary] = useState(preferences?.dietary_notes ?? "");

  const toggleChannel = (ch: string) => {
    setChannels((p) => (p.includes(ch) ? p.filter((c) => c !== ch) : [...p, ch]));
  };

  const toggleInterest = (interest: string) => {
    setInterests((p) => (p.includes(interest) ? p.filter((i) => i !== interest) : [...p, interest]));
  };

  const saveMutation = useMCPMutation("family_profile", "family_set_preferences", {
    onSuccess: () => showToast({ type: "success", message: "Preferencias actualizadas correctamente" }),
    onError: (err: Error) => showToast({ type: "error", message: err.message || "Error al guardar preferencias" }),
  });

  const handleSave = () => {
    saveMutation.mutate({
      family_id: familyId,
      preferred_language: language,
      notification_channels: channels.join(","),
      interests: interests.join(","),
      privacy_level: privacy,
      dietary_notes: dietary,
    });
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="fm-familyDetail__prefs"
    >
      {/* Language + Privacy */}
      <div className="fm-familyDetail__prefs-row">
        <Card className="fm-familyDetail__prefs-card" hover={false} tone="silver">
          <h4 className="fm-familyDetail__section-title">Idioma preferido</h4>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as PreferredLanguage)}
            className="fm-familyDetail__pref-select"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </Card>

        <Card className="fm-familyDetail__prefs-card" hover={false} tone="silver">
          <h4 className="fm-familyDetail__section-title">Nivel de privacidad</h4>
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
            className="fm-familyDetail__pref-select"
          >
            {PRIVACY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </Card>
      </div>

      {/* Channels */}
      <Card className="fm-familyDetail__prefs-card" hover={false}>
        <h4 className="fm-familyDetail__section-title">Canales de notificación</h4>
        <div className="fm-familyDetail__pref-toggles">
          {CHANNEL_OPTIONS.map((ch) => (
            <Button
              key={ch.id}
              variant={channels.includes(ch.id) ? "primary" : "ghost"}
              size="sm"
              onClick={() => toggleChannel(ch.id)}
            >
              {ch.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Interests */}
      <Card className="fm-familyDetail__prefs-card" hover={false}>
        <h4 className="fm-familyDetail__section-title">Intereses</h4>
        <div className="fm-familyDetail__pref-toggles">
          {INTEREST_PRESETS.map((interest) => (
            <button
              key={interest}
              type="button"
              className="fm-familyDetail__pref-toggle"
              data-active={interests.includes(interest) || undefined}
              onClick={() => toggleInterest(interest)}
            >
              {interest}
            </button>
          ))}
        </div>
      </Card>

      {/* Dietary notes */}
      <Card className="fm-familyDetail__prefs-card" hover={false}>
        <h4 className="fm-familyDetail__section-title">Notas dietéticas</h4>
        <textarea
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          placeholder="Alergias, restricciones, preferencias alimentarias..."
          rows={3}
          className="fm-familyDetail__pref-textarea"
        />
      </Card>

      {/* Submit */}
      <div className="fm-familyDetail__prefs-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={saveMutation.isPending}
          icon={
            saveMutation.isPending
              ? <div className="fm-familyDetail__spinner" />
              : <Settings className="fm-familyDetail__btn-icon" />
          }
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar preferencias"}
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// §5  FamilyDetail — Main Component
// ═══════════════════════════════════════════════════════════

interface FamilyDetailProps {
  readonly familyIdOverride?: string;
}

export default function FamilyDetail({ familyIdOverride }: FamilyDetailProps = {}) {
  const navigate = useNavigate();
  const {
    id, data, isLoading, isError, error,
    activeTab, setActiveTab,
    advisor, temperature, priority, insight,
    tabCounts,
  } = useFamilyDetail(familyIdOverride);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <PageContainer title="Familia" subtitle="Cargando...">
        <DetailSkeleton />
      </PageContainer>
    );
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <PageContainer title="Familia">
        <EmptyState
          icon={<AlertTriangle />}
          title="Error al cargar"
          description={
            error instanceof Error
              ? error.message
              : "No se pudo cargar la información de la familia."
          }
          action={<Button onClick={() => navigate("/admin/families")}>Volver a familias</Button>}
        />
      </PageContainer>
    );
  }

  if (!data.family) {
    return (
      <PageContainer title="Familia">
        <EmptyState
          icon={<AlertTriangle />}
          title="Datos no disponibles"
          description="La respuesta del servidor no contiene datos válidos."
          action={<Button onClick={() => navigate("/admin/families")}>Volver a familias</Button>}
        />
      </PageContainer>
    );
  }

  const { family, financialSummary } = data;
  const tier = TIER_CONFIG[family.tier];
  const status = STATUS_CONFIG[family.status];
  const churn = CHURN_CONFIG[family.churnRisk];
  const age = calculateAge(family.primaryContact.dateOfBirth);
  const ageGroup = getAgeGroup(age);

  /* ── Stats ── */
  const stats = [
    { label: "Miembros", value: `${family.memberCount}`, color: "var(--color-gold-400)" },
    {
      label: "Engagement",
      value: `${family.engagementScore}/100`,
      color: family.engagementScore >= 70
        ? "var(--color-emerald-400)"
        : family.engagementScore >= 40
          ? "var(--color-amber-400)"
          : "var(--color-rose-400)",
    },
    {
      label: "Saldo actual",
      value: formatCurrency(financialSummary.currentBalance),
      color: financialSummary.currentBalance < 0
        ? "var(--color-rose-400)"
        : "var(--color-silver-200)",
    },
    { label: "Gasto YTD", value: formatCurrency(financialSummary.ytdCharges), color: "var(--color-silver-200)" },
  ];

  /* ── Tabs ── */
  const tabs: Array<{ id: FamilyDetailTab; label: string; icon: typeof Users }> = [
    { id: "overview", label: "Resumen", icon: TAB_ICONS.overview },
    { id: "members", label: `Miembros (${tabCounts.members})`, icon: TAB_ICONS.members },
    { id: "intelligence", label: "Inteligencia", icon: TAB_ICONS.intelligence },
    { id: "social", label: `Social (${tabCounts.social})`, icon: TAB_ICONS.social },
    { id: "memories", label: "Momentos", icon: TAB_ICONS.memories },
    { id: "finances", label: "Finanzas", icon: TAB_ICONS.finances },
    { id: "communication", label: "Comunicación", icon: TAB_ICONS.communication },
    { id: "preferences", label: "Preferencias", icon: TAB_ICONS.preferences },
  ];

  /* ── Credit utilization ── */
  const utilization =
    financialSummary.creditLimit > 0
      ? (Math.abs(financialSummary.currentBalance) / financialSummary.creditLimit) * 100
      : 0;
  const utilLevel =
    utilization > 80 ? "critical" : utilization > 50 ? "warning" : "safe";

  /* ── Render ── */
  return (
    <PageContainer
      title={family.familyName}
      subtitle={`Miembro desde ${formatMonthYear(family.since)}`}
      breadcrumbs={[
        { label: "Familias", href: "/admin/families" },
        { label: family.familyName },
      ]}
      actions={
        <div className="fm-familyDetail__page-actions">
          <Button
            variant="ghost"
            icon={<ArrowLeft className="fm-familyDetail__btn-icon" />}
            onClick={() => navigate("/admin/families")}
          >
            Volver
          </Button>
          <PermissionGate roles={["ADMIN", "STAFF"]}>
            <Button
              variant="primary"
              icon={<Edit className="fm-familyDetail__btn-icon" />}
              onClick={() => navigate(`/admin/families/${id}/edit`)}
            >
              Editar
            </Button>
          </PermissionGate>
        </div>
      }
    >
      <div
        className="fm-familyDetail"
        data-testid="family-detail"
        role="region"
        aria-label={`Detalle de ${family.familyName}`}
      >
        {/* ══════ HERO ══════ */}
        <div className="fm-familyDetail__hero">
          <Card className="fm-familyDetail__hero-card" tone="gold">
            {priority && (
              <div className="fm-familyDetail__hero-priority">
                <AdaptiveCardHero
                  priority={priority}
                  onAction={() => {
                    if (priority.suggestedAction) {
                      showToast({ type: "info", message: priority.suggestedAction });
                    }
                  }}
                />
              </div>
            )}

            <div className="fm-familyDetail__hero-contact">
              <div
                className="fm-familyDetail__hero-avatar"
                style={{ "--detail-tier-color": tier.color } as CSSProperties}
              >
                <span aria-hidden="true">{family.familyName.charAt(0)}</span>
              </div>

              <div className="fm-familyDetail__hero-info">
                <h2 className="fm-familyDetail__hero-name">{family.familyName}</h2>
                <p className="fm-familyDetail__hero-subtitle">
                  {family.primaryContact.firstName}{" "}
                  {family.primaryContact.lastName} —{" "}
                  {ROLE_LABELS[family.primaryContact.role]}
                </p>
                <div className="fm-familyDetail__hero-badges">
                  <Badge
                    variant={
                      family.tier === "platino" ? "neutral"
                      : family.tier === "oro" ? "gold"
                      : family.tier === "plata" ? "info"
                      : "warning"
                    }
                    size="md"
                  >
                    {tier.label}
                  </Badge>
                  <span
                    className="fm-familyDetail__status-badge"
                    style={{ "--detail-status-color": status.color } as CSSProperties}
                  >
                    <span className="fm-familyDetail__status-dot" aria-hidden="true" />
                    {status.label}
                  </span>
                  {family.churnRisk !== "low" && (
                    <span
                      className="fm-familyDetail__churn-badge"
                      style={{ "--detail-churn-color": churn.color } as CSSProperties}
                    >
                      <AlertTriangle className="fm-familyDetail__churn-icon" />
                      Riesgo {churn.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ══════ ADVISOR BANNER ══════ */}
        <FamilyAdvisorBanner
          insights={advisor.insights}
          onTabChange={(tabId) => setActiveTab(tabId as FamilyDetailTab)}
        />

        {/* ══════ TABS ══════ */}
        <DetailTabs
          tabs={tabs}
          active={activeTab}
          onChange={(tabId) => setActiveTab(tabId as FamilyDetailTab)}
          ariaLabel="Secciones de la familia"
        />

        {/* ══════ TAB CONTENT ══════ */}
        <div
          key={activeTab}
          className="fm-familyDetail__tab-panel"
          role="tabpanel"
          aria-labelledby={`dtab-${activeTab}`}
        >
          {/* ── 1. OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="fm-familyDetail__tab-content">
              {/* Temperature */}
              {temperature && <FamilyTemperature temperature={temperature} />}

              {/* Stats grid */}
              <div className="fm-familyDetail__stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="fm-familyDetail__stat">
                    <p className="fm-familyDetail__stat-label">{stat.label}</p>
                    <p
                      className="fm-familyDetail__stat-value"
                      style={{ "--detail-stat-color": stat.color } as CSSProperties}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Primary contact */}
              <Card className="fm-familyDetail__info-card" hover={false} tone="silver">
                <h4 className="fm-familyDetail__section-title">Contacto principal</h4>
                <div className="fm-familyDetail__contact">
                  <div
                    className="fm-familyDetail__contact-avatar"
                    style={{ "--detail-age-color": ageGroup.color } as CSSProperties}
                  >
                    <span aria-hidden="true">
                      {family.primaryContact.firstName.charAt(0)}
                      {family.primaryContact.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="fm-familyDetail__contact-info">
                    <h5 className="fm-familyDetail__contact-name">
                      {family.primaryContact.firstName} {family.primaryContact.lastName}
                    </h5>
                    <p className="fm-familyDetail__contact-role">
                      {ROLE_LABELS[family.primaryContact.role]} — {age} años
                    </p>
                    <div className="fm-familyDetail__contact-details">
                      {family.primaryContact.email && (
                        <span>{family.primaryContact.email}</span>
                      )}
                      {family.primaryContact.phone && (
                        <span>{family.primaryContact.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Membership + Financial */}
              <div className="fm-familyDetail__duo-cards">
                <Card className="fm-familyDetail__info-card" hover={false} tone="gold">
                  <h4 className="fm-familyDetail__section-title">Membresía</h4>
                  <div className="fm-familyDetail__info-rows">
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Nivel</span>
                      <Badge
                        variant={
                          family.tier === "platino" ? "neutral"
                          : family.tier === "oro" ? "gold"
                          : family.tier === "plata" ? "info"
                          : "warning"
                        }
                        size="md"
                      >
                        {tier.label}
                      </Badge>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Estado</span>
                      <span
                        className="fm-familyDetail__info-status"
                        style={{ "--detail-status-color": status.color } as CSSProperties}
                      >
                        <span className="fm-familyDetail__status-dot" aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Miembro desde</span>
                      <span className="fm-familyDetail__info-value">{formatMonthYear(family.since)}</span>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Riesgo de cancelación</span>
                      <span
                        className="fm-familyDetail__info-churn"
                        style={{ "--detail-churn-color": churn.color } as CSSProperties}
                      >
                        {family.churnRisk !== "low" && <AlertTriangle className="fm-familyDetail__churn-icon" />}
                        {churn.label}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="fm-familyDetail__info-card" hover={false} tone="teal">
                  <h4 className="fm-familyDetail__section-title">Financiero</h4>
                  <div className="fm-familyDetail__info-rows">
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Saldo</span>
                      <span className="fm-familyDetail__info-value" data-negative={financialSummary.currentBalance < 0 || undefined}>
                        {formatCurrency(financialSummary.currentBalance)}
                      </span>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Límite de crédito</span>
                      <span className="fm-familyDetail__info-value">{formatCurrency(financialSummary.creditLimit)}</span>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Último pago</span>
                      <span className="fm-familyDetail__info-value">{formatCurrency(financialSummary.lastPaymentAmount)}</span>
                    </div>
                    <div className="fm-familyDetail__info-row">
                      <span className="fm-familyDetail__info-label">Gastos YTD</span>
                      <span className="fm-familyDetail__info-value">{formatCurrency(financialSummary.ytdCharges)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* AI Insight */}
              {insight && (
                <div className="fm-familyDetail__insight" data-type={insight.type}>
                  {insight.text}
                </div>
              )}

              {/* Notes */}
              {family.notes && (
                <Card className="fm-familyDetail__info-card" hover={false}>
                  <h4 className="fm-familyDetail__section-title">Notas</h4>
                  <p className="fm-familyDetail__notes-text">
                    {family.notes}
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* ── 2. MEMBERS ── */}
          {activeTab === "members" && (
            <div className="fm-familyDetail__tab-content">
              {family.members.length > 0 ? (
                <div className="fm-familyDetail__members-grid">
                  {family.members.map((member) => (
                    <MemberCard key={member.id} member={member} onClick={() => {}} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Users />}
                  title="Sin miembros registrados"
                  description="Esta familia aún no tiene miembros agregados."
                />
              )}
            </div>
          )}

          {/* ── 3. INTELLIGENCE ── */}
          {activeTab === "intelligence" && (
            <div className="fm-familyDetail__tab-content">
              <FamilyIntelligencePanel familyId={family.id} />
            </div>
          )}

          {/* ── 4. SOCIAL ── */}
          {activeTab === "social" && (
            <SocialTabContent familyId={family.id} familyName={family.familyName} />
          )}

          {/* ── 5. MEMORIES ── */}
          {activeTab === "memories" && (
            <div className="fm-familyDetail__tab-content">
              <EmptyState
                icon={<Camera />}
                title="Momentos familiares"
                description="Los momentos significativos se generarán automáticamente a partir de la actividad y engagement de la familia."
              />
            </div>
          )}

          {/* ── 6. FINANCES ── */}
          {activeTab === "finances" && (
            <div className="fm-familyDetail__tab-content">
              {/* Credit utilization */}
              <Card className="fm-familyDetail__info-card" hover={false} tone="teal">
                <div className="fm-familyDetail__util-header">
                  <h4 className="fm-familyDetail__section-title fm-familyDetail__section-title--inline">
                    Utilización de crédito
                  </h4>
                  <span className="fm-familyDetail__util-pct" data-level={utilLevel}>
                    {utilization.toFixed(0)}%
                  </span>
                </div>
                <div className="fm-familyDetail__util-bar">
                  <div
                    className="fm-familyDetail__util-fill"
                    data-level={utilLevel}
                    style={{ "--detail-util-pct": `${Math.min(utilization, 100)}%` } as CSSProperties}
                  />
                </div>
                <div className="fm-familyDetail__util-labels">
                  <span>{formatCurrency(financialSummary.currentBalance)}</span>
                  <span>{formatCurrency(financialSummary.creditLimit)}</span>
                </div>
              </Card>

              {/* YTD Summary */}
              <div className="fm-familyDetail__duo-cards">
                <Card padding={false} hover={false} className="fm-familyDetail__ytd-card" tone="emerald">
                  <div className="fm-familyDetail__ytd-header">
                    <TrendingUp className="fm-familyDetail__ytd-icon" />
                    <span className="fm-familyDetail__section-title fm-familyDetail__section-title--inline">
                      Pagos YTD
                    </span>
                  </div>
                  <p className="fm-familyDetail__ytd-amount">
                    {formatCurrency(financialSummary.ytdPayments)}
                  </p>
                  <p className="fm-familyDetail__ytd-detail">
                    Último: {formatCurrency(financialSummary.lastPaymentAmount)} —{" "}
                    {formatDate(financialSummary.lastPaymentDate)}
                  </p>
                </Card>

                <Card padding={false} hover={false} className="fm-familyDetail__ytd-card" tone="emerald">
                  <div className="fm-familyDetail__ytd-header">
                    <CreditCard className="fm-familyDetail__ytd-icon fm-familyDetail__ytd-icon--amber" />
                    <span className="fm-familyDetail__section-title fm-familyDetail__section-title--inline">
                      Cargos YTD
                    </span>
                  </div>
                  <p className="fm-familyDetail__ytd-amount">
                    {formatCurrency(financialSummary.ytdCharges)}
                  </p>
                  <p className="fm-familyDetail__ytd-detail">
                    Neto:{" "}
                    <span
                      className="fm-familyDetail__ytd-net"
                      data-positive={financialSummary.ytdPayments - financialSummary.ytdCharges >= 0 || undefined}
                    >
                      {formatCurrency(financialSummary.ytdPayments - financialSummary.ytdCharges)}
                    </span>
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* ── 7. COMMUNICATION ── */}
          {activeTab === "communication" && (
            <div className="fm-familyDetail__tab-content">
              <EmptyState
                icon={<MessageSquare />}
                title="Seeds de conversación"
                description="Las sugerencias de comunicación personalizadas se generarán automáticamente según el perfil e intereses de la familia."
              />
            </div>
          )}

          {/* ── 8. PREFERENCES ── */}
          {activeTab === "preferences" && (
            <PreferencesTabContent familyId={family.id} preferences={data.preferences} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}