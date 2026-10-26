/**
 * CulturalDashboard — The Root Organism
 *
 * The single composition root for the entire Cultural Intelligence system.
 * NOT a page with panels. It's a living organism with 5 visual layers:
 *
 * Layer 1: AMBIENT — gradient mesh + grain noise (background)
 * Layer 2: PULSE — heartbeat indicator (top-right)
 * Layer 3: DECISION + STREAM — what needs attention NOW
 * Layer 4: PANELS — 6 intelligence panels in asymmetric grid
 * Layer 5: ACTION — floating buttons to create events
 *
 * Data flows through useCulturalDashboard which runs ALL engines
 * client-side. This component is purely presentational.
 *
 * @module cultural/components/CulturalDashboard
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

import { useCulturalDashboard } from './hooks/useCulturalDashboard';

import type { DesignerEventType } from './lib/eventDesigner';
import type { EnrichedProposal } from './lib/proposalEnricher';
// ── Infrastructure ──
import { CulturalAmbientCanvas } from './components/CulturalAmbientCanvas';
import { CulturalDecisionStage } from './components/CulturalDecisionStage';
import { CulturalIntelligenceStream } from './components/CulturalIntelligenceStream';
import { CulturalPulse } from './components/CulturalPulse';

// ── Signature panels ──
import { CulturalTasteGenome } from './components/CulturalTasteGenome';
import { CulturalJourneyComposer } from './components/CulturalJourneyComposer';
import { CulturalResonanceMap } from './components/CulturalResonanceMap';
import { CulturalMutationTracker } from './components/CulturalMutationTracker';
import { CulturalSocialGraph } from './components/CulturalSocialGraph';
import { VenueBrain } from './components/VenueBrain';

// ── AI Creation Modals ──
import { AIEntertainmentDesigner } from './components/AIEntertainmentDesigner';
import { AIExhibitionCurator } from './components/AIExhibitionCurator';
import { AIGalaArchitect } from './components/AIGalaArchitect';
import { AIProgramDesigner } from './components/AIProgramDesigner';
import { AISocialArchitect } from './components/AISocialArchitect';

import './CulturalDashboard.css';

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════

const ACTION_CONFIGS: Array<{
  type: DesignerEventType;
  icon: string;
  label: string;
  color: string;
}> = [
  { type: 'entertainment', icon: '🎵', label: 'Entertainment', color: '#60a5fa' },
  { type: 'exhibition', icon: '🎨', label: 'Exhibition', color: '#a78bfa' },
  { type: 'gala', icon: '✦', label: 'Gala', color: '#fbbf24' },
  { type: 'program', icon: '📚', label: 'Program', color: '#06b6d4' },
  { type: 'social', icon: '🤝', label: 'Social', color: '#4ade80' },
];

/** Mode display labels. */
const MODE_LABELS: Record<string, string> = {
  pulse: 'Pulso activo',
  flowing: 'Flujo estable',
  deep: 'Análisis profundo',
  critical: 'Atención requerida',
  dormant: 'Inactivo',
};

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalDashboardProps {
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalDashboard({ memberId }: CulturalDashboardProps) {
  // ── Data from the neural hub hook ──
  const dashboard = useCulturalDashboard(memberId);

  // ── Modal state ──
  const [activeModal, setActiveModal] = useState<DesignerEventType | null>(null);

  // ── Derived values ──
  const criticalCount = useMemo(
    () => dashboard.advisorInsights.filter((i) => (i.severity as string) === 'critical').length,
    [dashboard.advisorInsights],
  );

  const highCount = useMemo(
    () => dashboard.advisorInsights.filter((i) => i.severity === 'high').length,
    [dashboard.advisorInsights],
  );

  const healthScore = useMemo(() => {
    let score = 100;
    score -= criticalCount * 25;
    score -= highCount * 10;
    score -= dashboard.advisorInsights.filter((i) => i.severity === 'medium').length * 5;
    return Math.max(0, Math.min(100, score));
  }, [dashboard.advisorInsights, criticalCount, highCount]);

  useMemo(() => {
        if (!dashboard.events || dashboard.events.length === 0) return undefined;
        const today = new Date().toISOString().split('T')[0];
        const upcoming = [...dashboard.events]
          .filter((e) => e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        return upcoming[0] ?? dashboard.events[0];
      }, [dashboard.events]);

  const hasCritical = criticalCount > 0;

  // ── Handlers ──
  const handleOpenModal = useCallback((type: DesignerEventType) => {
    setActiveModal(type);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleModalConfirm = useCallback(
    (_proposal: EnrichedProposal) => {
      setActiveModal(null);
      dashboard.refetchAll();
    },
    [dashboard.refetchAll],
  );

  // ── Escape key closes modals ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  // ════════════════════════════════════════════════════════
  //  LOADING STATE
  // ════════════════════════════════════════════════════════

  if (dashboard.isLoading) {
    return <SkeletonDashboard />;
  }

  // ════════════════════════════════════════════════════════
  //  ERROR STATE
  // ════════════════════════════════════════════════════════

  if (dashboard.error) {
    return (
      <div className="cultural-dashboard cultural-dashboard--error">
        <div className="cultural-dashboard__noise" />
        <div className="cultural-dashboard__error-card">
          <span className="cultural-dashboard__error-icon">⚠</span>
          <h2 className="cultural-dashboard__error-title">
            Error cargando Cultural Intelligence
          </h2>
          <p className="cultural-dashboard__error-message">
            {dashboard.error.message}
          </p>
          <button
            className="cultural-dashboard__error-retry"
            onClick={dashboard.refetchAll}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  MAIN DASHBOARD
  // ════════════════════════════════════════════════════════

  return (
    <div
      className="cultural-dashboard"
      data-mode={dashboard.dashboardMode}
      data-critical={hasCritical ? 'true' : undefined}
    >
      {/* ── Noise overlay ── */}
      <div className="cultural-dashboard__noise" />

      {/* ── Layer 1: Ambient canvas ── */}
      <div className="cultural-dashboard__ambient">
        <CulturalAmbientCanvas ambientState={dashboard.ambientState} />
      </div>

      {/* ── Layer 2: Pulse (top-right, fixed) ── */}
      <div className="cultural-dashboard__pulse">
        <CulturalPulse
          ambientState={dashboard.ambientState}
          advisorInsights={dashboard.advisorInsights}
        />
      </div>

      {/* ── Header ── */}
      <header className="cultural-dashboard__header">
        <div className="cultural-dashboard__header-left">
          <h1 className="cultural-dashboard__title">Cultural Intelligence</h1>
          <span className="cultural-dashboard__subtitle">
            {memberId ? `Socio: ${memberId}` : 'Vista global del club'}
          </span>
        </div>
        <div className="cultural-dashboard__header-right">
          <div className="cultural-dashboard__health">
            <span className="cultural-dashboard__health-label">Health</span>
            <span
              className="cultural-dashboard__health-score"
              data-level={
                healthScore >= 80
                  ? 'good'
                  : healthScore >= 50
                    ? 'warning'
                    : 'critical'
              }
            >
              {healthScore}
            </span>
          </div>
          <div className="cultural-dashboard__mode-indicator">
            <span className="cultural-dashboard__mode-dot" />
            <span className="cultural-dashboard__mode-text">
              {MODE_LABELS[dashboard.dashboardMode] ?? dashboard.dashboardMode}
            </span>
          </div>
        </div>
      </header>

      {/* ── Critical alert banner ── */}
      {hasCritical && (
        <div className="cultural-dashboard__critical-banner">
          <span className="critical-banner__icon">⚡</span>
          <span className="critical-banner__text">
            {criticalCount}{' '}
            {criticalCount === 1 ? 'alerta crítica' : 'alertas críticas'}{' '}
            requieren atención inmediata
          </span>
          <button
            className="critical-banner__action"
            onClick={() => {
              const el = document.querySelector('.cultural-dashboard__decision');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Ver detalles
          </button>
        </div>
      )}

      {/* ── Layer 3: Decision Stage + Intelligence Stream ── */}
      <div className="cultural-dashboard__main" role="main">
        <div className="cultural-dashboard__decision">
          <CulturalDecisionStage
            insights={dashboard.advisorInsights}
            summary={dashboard.summary}
            dashboardMode={dashboard.dashboardMode}
          />
        </div>
        <aside className="cultural-dashboard__stream" aria-live="polite">
          <CulturalIntelligenceStream
            signals={dashboard.crossDomainSignals}
            advisorInsights={dashboard.advisorInsights}
          />
        </aside>
      </div>

      {/* ── Layer 4: Intelligence Panels ── */}
      <section className="cultural-dashboard__panels" aria-label="Paneles de inteligencia">
        {dashboard.tasteProfile && (
          <div className="cultural-dashboard__panel cultural-dashboard__panel--genome">
            <CulturalTasteGenome
              tasteProfile={dashboard.tasteProfile}
              culturalDNA={dashboard.culturalDNA ?? undefined}
            />
          </div>
        )}
        {dashboard.culturalJourney && (
          <div className="cultural-dashboard__panel cultural-dashboard__panel--journey">
            <CulturalJourneyComposer journey={dashboard.culturalJourney} />
          </div>
        )}
        <div className="cultural-dashboard__panel cultural-dashboard__panel--resonance">
          <CulturalResonanceMap scores={dashboard.resonanceScores} />
        </div>
        <div className="cultural-dashboard__panel cultural-dashboard__panel--mutations">
          <CulturalMutationTracker mutations={dashboard.tasteMutations} />
        </div>
        {dashboard.socialGraph && (
          <div className="cultural-dashboard__panel cultural-dashboard__panel--social">
            <CulturalSocialGraph socialGraph={dashboard.socialGraph} />
          </div>
        )}
        {dashboard.venuePersonalities.length > 0 && (
          <div className="cultural-dashboard__panel cultural-dashboard__panel--venue">
            <VenueBrain personality={dashboard.venuePersonalities[0]} />
          </div>
        )}
      </section>

      {/* ── Layer 5: Action Buttons (floating) ── */}
      <div className="cultural-dashboard__actions" aria-label="Crear evento">
        {ACTION_CONFIGS.map((config) => (
          <button
            key={config.type}
            className="cultural-dashboard__action-btn"
            style={{ '--action-color': config.color } as React.CSSProperties}
            onClick={() => handleOpenModal(config.type)}
            aria-label={`Crear ${config.label}`}
          >
            <span className="cultural-dashboard__action-icon">
              {config.icon}
            </span>
            <span className="cultural-dashboard__action-label">
              {config.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── AI Creation Modals ── */}
      <AIEntertainmentDesigner
        isOpen={activeModal === 'entertainment'}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        memberId={memberId}
      />
      <AIExhibitionCurator
        isOpen={activeModal === 'exhibition'}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        memberId={memberId}
      />
      <AIGalaArchitect
        isOpen={activeModal === 'gala'}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        memberId={memberId}
      />
      <AIProgramDesigner
        isOpen={activeModal === 'program'}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        memberId={memberId}
      />
      <AISocialArchitect
        isOpen={activeModal === 'social'}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        memberId={memberId}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SKELETON DASHBOARD
// ══════════════════════════════════════════════════════════

function SkeletonDashboard() {
  return (
    <div className="cultural-dashboard cultural-dashboard--loading">
      <div className="cultural-dashboard__noise" />

      {/* Skeleton header */}
      <header className="cultural-dashboard__header">
        <div className="cultural-dashboard__header-left">
          <div className="cd-skeleton cd-skeleton--title" />
          <div className="cd-skeleton cd-skeleton--subtitle" />
        </div>
        <div className="cultural-dashboard__header-right">
          <div className="cd-skeleton cd-skeleton--badge" />
          <div className="cd-skeleton cd-skeleton--badge" />
        </div>
      </header>

      {/* Skeleton main */}
      <div className="cultural-dashboard__main">
        <div className="cultural-dashboard__decision">
          <div className="cd-skeleton cd-skeleton--block cd-skeleton--decision" />
        </div>
        <div className="cultural-dashboard__stream">
          <div className="cd-skeleton cd-skeleton--block cd-skeleton--stream" />
        </div>
      </div>

      {/* Skeleton panels */}
      <div className="cultural-dashboard__panels">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="cultural-dashboard__panel"
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            <div className="cd-skeleton cd-skeleton--block cd-skeleton--panel" />
          </div>
        ))}
      </div>
    </div>
  );
}