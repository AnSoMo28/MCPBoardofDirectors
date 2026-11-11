/**
 * @component SectionCard (Fase 25)
 * @namespace .glass-ai__section
 * @depends AISystemPage.css
 * @note Collapsible section wrapper with per-section ErrorBoundary.
 *       Collapse state controlled externally (persisted in localStorage).
 *       Error boundary resets on retry via key change.
 * @import import './AISystemPage.css';
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   Error Boundary (class component)
   ═══════════════════════════════════════ */

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionTitle: string;
  onRetry: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[SectionCard] Error in "${this.props.sectionTitle}":`,
      error,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-ai__section-error">
          <AlertTriangle
            size={20}
            style={{ color: "var(--color-rose-400)" }}
          />
          <p className="glass-ai__section-error-text">
            Error en {this.props.sectionTitle}
          </p>
          <Button
            variant="unstyled"
            type="button"
            className="glass-ai__section-error-retry"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          >
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════
   Props
   ═══════════════════════════════════════ */

interface SectionCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  accentColor,
  isCollapsed,
  onToggle,
  children,
}: SectionCardProps) {
  const [errorKey, setErrorKey] = useState(0);
  const reduced = useReducedMotion();

  return (
    <section
      className="glass-ai__section"
      id={`ai-section-${id}`}
      tabIndex={-1}
    >
      {/* Header */}
      <Button
        variant="unstyled"
        type="button"
        className="glass-ai__section-header"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-controls={`ai-section-body-${id}`}
      >
        <div
          className="glass-ai__section-icon"
          style={{ color: accentColor }}
        >
          <Icon size={18} />
        </div>
        <div className="glass-ai__section-header-text">
          <h3 className="glass-ai__section-title">{title}</h3>
          <p className="glass-ai__section-description">
            {description}
          </p>
        </div>
        <span className="glass-ai__section-toggle">
          {isCollapsed ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronUp size={16} />
          )}
        </span>
      </Button>

      {/* Body (animated) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id={`ai-section-body-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="glass-ai__section-body"
          >
            <SectionErrorBoundary
              key={`${id}-${errorKey}`}
              sectionTitle={title}
              onRetry={() => setErrorKey((k) => k + 1)}
            >
              {children}
            </SectionErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}