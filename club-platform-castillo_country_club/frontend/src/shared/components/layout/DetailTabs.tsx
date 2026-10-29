// src/shared/components/layout/DetailTabs.tsx
// ═══════════════════════════════════════════════════════════
// Shared Layout — Detail Tabs
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   dtabs-* (detail tabs)
// @keyframes   2 (dtabsBadgePop, dtabsGlow) — in DetailTabs.css
// @depends     globals.css §1 tokens, shared/hooks/useReducedMotion,
//              shared/lib/utils
//
// Tab navigation for detail pages with:
//   - CSS-only sliding indicator (NO framer-motion)
//   - Count badges with pop animation
//   - Keyboard navigation (arrows, Home, End)
//   - Glass morphism container
//   - Indicator glow aura
//
// ANTI-PATTERNS REMOVED:
// [x] framer-motion (motion.div layoutId) → CSS-only indicator
// [x] spring easing { bounce: 0.15 } → var(--ease-apple)
// [x] ~25 Tailwind utilities → dtabs-* BEM classes
// [x] glass-tab-bar → dtabs-* namespace
// [x] No data-testid → added
// [x] No § markers → §0-§3
// [x] No file header → added
// [x] No light mode → CSS §5
// [x] No print styles → CSS §8
// [x] No responsive → CSS §7
// [x] ARIA ID mismatch (instanceId prefix) → simplified IDs
// [x] font-[ family-name:var(--font-*) ] → CSS font-family
// [x] bg-[ var(--color-*) ]/[0.08] → CSS color-mix
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import {
  useRef,
  useLayoutEffect,
  useState,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import type { LucideIcon } from "lucide-react";

// Shared
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

// Styles
import "./DetailTabs.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/** Configuration for a single tab. */
export interface DetailTab {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly count?: number;
  readonly indicator?: ReactNode;
}

interface DetailTabsProps {
  readonly tabs: readonly DetailTab[];
  readonly active: string;
  readonly onChange: (id: string) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Get the ARIA panel ID for a tab.
 * NOTE: IDs are simple (no instanceId prefix) to match
 * EventDetail's manual id={dpanel-${tabId}} pattern.
 * If multiple DetailTabs exist on the same page, add an
 * idPrefix prop and extend these helpers.
 */
export function getDetailTabPanelId(tabId: string): string {
  return `dpanel-${tabId}`;
}

export function getDetailTabButtonId(tabId: string): string {
  return `dtab-${tabId}`;
}

// ═══════════════════════════════════════════════════════════
// §3 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * DetailTabs — glass tab bar with CSS-only sliding indicator.
 *
 * Features:
 * - CSS-only sliding indicator (measures offsetLeft/offsetWidth)
 * - Indicator glow aura via ::after pseudo-element
 * - Count badges with pop animation
 * - Keyboard navigation (ArrowLeft/Right, Home, End)
 * - Roving tabindex pattern
 * - Reduced motion support
 */
export function DetailTabs({
  tabs,
  active,
  onChange,
  ariaLabel = "Secciones",
  className,
}: DetailTabsProps) {
  useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorReady, setIndicatorReady] = useState(false);

  /* ── §3.1 Indicator positioning (CSS-only) ── */
  useLayoutEffect(() => {
    const activeButton = tabRefs.current.get(active);
    const container = containerRef.current;
    if (!activeButton || !container) return;

    // offsetLeft/offsetWidth relative to container (position: relative)
    container.style.setProperty("--dtabs-ix", `${activeButton.offsetLeft}px`);
    container.style.setProperty("--dtabs-iw", `${activeButton.offsetWidth}px`);

    if (!indicatorReady) setIndicatorReady(true);
  }, [active, tabs, indicatorReady]);

  /* ── §3.2 Keyboard navigation (roving tabindex) ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
      const currentIndex = tabs.findIndex((t) => t.id === tabId);
      let nextIndex = -1;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex >= 0) {
        e.preventDefault();
        const nextId = tabs[nextIndex].id;
        onChange(nextId);
        requestAnimationFrame(() => {
          tabRefs.current.get(nextId)?.focus();
        });
      }
    },
    [tabs, onChange],
  );

  /* ── §3.3 Render ── */
  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn("dtabs", className)}
      data-testid="dtabs"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            id={`dtab-${tab.id}`}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`dpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={cn(
              "dtabs__tab",
              isActive && "dtabs__tab--active",
            )}
            data-testid={`dtabs-tab-${tab.id}`}
          >
            <Icon className="dtabs__icon" aria-hidden="true" />
            <span className="dtabs__label">{tab.label}</span>
            {tab.indicator}
            {tab.count != null && tab.count > 0 && (
              <span
                className="dtabs__badge"
                data-testid={`dtabs-badge-${tab.id}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}

      {/* CSS-only sliding indicator with glow aura */}
      <div
        className={cn(
          "dtabs__indicator",
          indicatorReady && "dtabs__indicator--ready",
        )}
        aria-hidden="true"
      />
    </div>
  );
}