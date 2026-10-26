/**
 * @component RiskHeatmap (Fase 25 — REWRITE)
 * @namespace .glass-risk
 * @depends RiskHeatmap.css, risk/ sub-components, riskTheme
 * @note Full rewrite from 380-line monolith to orchestrator with 3 sub-components.
 *       Heat gradient background, keyboard grid navigation (WAI-ARIA),
 *       popover scroll close, mobile bottom sheet, stagger animation.
 *       Backward-compatible: same default export, same props interface.
 * @import import './RiskHeatmap.css';
 */

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type { RiskItem, RiskSummary } from "@/features/reports/types";
import {
  RISK_LEVEL_CONFIG,
  RISK_CATEGORY_CONFIG,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
} from "@/shared/lib/riskTheme";
import { RiskSummaryBar } from "./risk/RiskSummaryBar";
import { MatrixCell } from "./risk/MatrixCell";
import { RiskPopoverContent } from "./risk/RiskPopoverContent";
import "./RiskHeatmap.css";

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 400;
const POPOVER_OFFSET = 8;
const PROBABILITIES = [4, 3, 2, 1];
const IMPACTS = [1, 2, 3, 4];
const STAGGER_BASE = 40; // ms per cell

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function buildCellMap(items: RiskItem[]): Map<string, RiskItem[]> {
  const map = new Map<string, RiskItem[]>();
  for (const risk of items) {
    const key = `${risk.probability}-${risk.impact}`;
    const existing = map.get(key);
    if (existing) existing.push(risk);
    else map.set(key, [risk]);
  }
  return map;
}

/* ═══════════════════════════════════════
   EASE constant
   ═══════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function RiskHeatmap({
  risks,
  className,
}: {
  risks: RiskSummary;
  className?: string;
}) {
  /* ── State ── */
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [, setPopoverPlacement] = useState<"below" | "above">(
    "below",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const reducedMotion = useReducedMotion();

  /* ── Data ── */
  const cellMap = useMemo(
    () => buildCellMap(risks.items),
    [risks.items],
  );

  /* ── Cell ref factory ── */
  const setCellRef = useCallback(
    (probability: number, impact: number) =>
      (el: HTMLDivElement | null) => {
        const key = `${probability}-${impact}`;
        if (el) cellRefs.current.set(key, el);
        else cellRefs.current.delete(key);
      },
    [],
  );

  /* ── Select cell + calculate popover position ── */
  const handleSelect = useCallback(
    (key: string) => {
      if (activeCell === key) {
        setActiveCell(null);
        return;
      }

      const cellEl = cellRefs.current.get(key);
      const containerEl = containerRef.current;
      if (!cellEl || !containerEl) return;

      const cellRect = cellEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      const spaceBelow = window.innerHeight - cellRect.bottom;
      const placeAbove =
        spaceBelow < POPOVER_MAX_HEIGHT + POPOVER_OFFSET * 2;

      const top = placeAbove
        ? cellRect.top -
          containerRect.top -
          POPOVER_MAX_HEIGHT -
          POPOVER_OFFSET
        : cellRect.bottom - containerRect.top + POPOVER_OFFSET;

      const left = Math.max(
        POPOVER_OFFSET,
        Math.min(
          cellRect.left - containerRect.left,
          containerRect.width - POPOVER_WIDTH - POPOVER_OFFSET,
        ),
      );

      setPopoverPos({ top: Math.max(0, top), left });
      setPopoverPlacement(placeAbove ? "above" : "below");
      setActiveCell(key);
    },
    [activeCell],
  );

  /* ── Close popover ── */
  const handleClose = useCallback(() => {
    if (activeCell) cellRefs.current.get(activeCell)?.focus();
    setActiveCell(null);
  }, [activeCell]);

  /* ── Grid keyboard navigation ── */
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focusedCell) return;

      const [pStr, iStr] = focusedCell.split("-");
      const pVal = Number(pStr);
      const iVal = Number(iStr);
      const pIdx = PROBABILITIES.indexOf(pVal);
      const iIdx = IMPACTS.indexOf(iVal);

      if (pIdx === -1 || iIdx === -1) return;

      let np = pIdx;
      let ni = iIdx;

      switch (e.key) {
        case "ArrowRight":
          ni = Math.min(iIdx + 1, IMPACTS.length - 1);
          break;
        case "ArrowLeft":
          ni = Math.max(iIdx - 1, 0);
          break;
        case "ArrowDown":
          np = Math.min(pIdx + 1, PROBABILITIES.length - 1);
          break;
        case "ArrowUp":
          np = Math.max(pIdx - 1, 0);
          break;
        case "Home":
          ni = 0;
          break;
        case "End":
          ni = IMPACTS.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();

      // Close popover if open (arrow navigation shouldn't keep it)
      if (activeCell) setActiveCell(null);

      const newKey = `${PROBABILITIES[np]}-${IMPACTS[ni]}`;
      cellRefs.current.get(newKey)?.focus();
    },
    [focusedCell, activeCell],
  );

  /* ── Popover side effects: click-outside, Escape, scroll close ── */
  useEffect(() => {
    if (!activeCell) return;

    popoverRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      for (const cell of cellRefs.current.values()) {
        if (cell.contains(target)) return;
      }
      setActiveCell(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cellRefs.current.get(activeCell)?.focus();
        setActiveCell(null);
      }
    };

    const handleScroll = () => {
      setActiveCell(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [activeCell]);

  /* ── Derived ── */
  const selectedRisks = activeCell ? cellMap.get(activeCell) ?? [] : [];

  /* ── Category items ── */
  const categoryEntries = useMemo(() => {
    return (
      Object.entries(RISK_CATEGORY_CONFIG) as [
        string,
        (typeof RISK_CATEGORY_CONFIG)[keyof typeof RISK_CATEGORY_CONFIG],
      ][]
    ).filter(
      ([key]) => risks.items.filter((r) => r.category === key).length > 0,
    );
  }, [risks.items]);

  return (
    <Card className={cn("overflow-visible", className)}>
      <div className="glass-risk__body">
        {/* ── Header ── */}
        <div className="glass-risk__header">
          <Shield className="glass-risk__header-icon" />
          <div>
            <h3 className="glass-risk__header-title">Mapa de Riesgos</h3>
            <p className="glass-risk__header-sub">
              Matriz 4×4 de Probabilidad vs Impacto
            </p>
          </div>
        </div>

        {/* ── Summary ── */}
        <RiskSummaryBar risks={risks} />

        {/* ── Matrix container ── */}
        <div ref={containerRef} className="glass-risk__matrix-wrap">
          <div className="glass-risk__matrix-layout">
            {/* Y-axis */}
            <div className="glass-risk__axis-y" aria-hidden="true">
              <span className="glass-risk__axis-label">
                Probabilidad →
              </span>
            </div>

            {/* Grid area */}
            <div className="glass-risk__grid-area">
              {/* Column headers */}
              <div className="glass-risk__col-headers" role="row">
                {IMPACTS.map((imp) => (
                  <div
                    key={imp}
                    className="glass-risk__col-header"
                    role="columnheader"
                  >
                    <span className="glass-risk__col-header-text">
                      {IMPACT_LABELS[imp]}
                    </span>
                    <span className="glass-risk__col-header-num">{imp}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div
                className="glass-risk__grid"
                role="grid"
                aria-label="Matriz de riesgos 4 por 4"
                onKeyDown={handleGridKeyDown}
              >
                {PROBABILITIES.map((prob, rowIdx) => (
                  <div key={prob} className="glass-risk__row" role="row">
                    {/* Row label */}
                    <div className="glass-risk__row-label" role="rowheader">
                      <span className="glass-risk__row-label-text">
                        {PROBABILITY_LABELS[prob]}
                      </span>
                      <span className="glass-risk__row-label-num">{prob}</span>
                    </div>

                    {/* Cells */}
                    <div className="glass-risk__cells">
                      {IMPACTS.map((imp, colIdx) => {
                        const key = `${prob}-${imp}`;
                        return (
                          <MatrixCell
                            key={key}
                            probability={prob}
                            impact={imp}
                            risks={cellMap.get(key) ?? []}
                            isActive={activeCell === key}
                            onSelect={() => handleSelect(key)}
                            onFocus={() => setFocusedCell(key)}
                            cellRef={setCellRef(prob, imp)}
                            staggerDelay={
                              reducedMotion
                                ? 0
                                : (rowIdx * 4 + colIdx) * STAGGER_BASE
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* X-axis */}
              <div className="glass-risk__axis-x" aria-hidden="true">
                <span className="glass-risk__axis-label">
                  Impacto →
                </span>
              </div>
            </div>
          </div>

          {/* ── Mobile backdrop ── */}
          {activeCell && selectedRisks.length > 0 && (
            <div
              className="glass-risk__backdrop"
              onClick={handleClose}
              aria-hidden="true"
            />
          )}

          {/* ── Popover ── */}
          <AnimatePresence>
            {activeCell && selectedRisks.length > 0 && (
              <motion.div
                ref={popoverRef}
                className="glass-risk__popover"
                style={{
                  top: popoverPos.top,
                  left: popoverPos.left,
                }}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 8, scale: 0.96 }
                }
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.96 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.15, ease: EASE }}
                role="dialog"
                aria-label={`Detalle de riesgo: ${selectedRisks[0]?.title}`}
                tabIndex={-1}
              >
                <RiskPopoverContent
                  risks={selectedRisks}
                  onClose={handleClose}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Legend ── */}
        <div className="glass-risk__legend">
          {(
            Object.entries(RISK_LEVEL_CONFIG) as [
              string,
              (typeof RISK_LEVEL_CONFIG)[keyof typeof RISK_LEVEL_CONFIG],
            ][]
          ).map(([key, config]) => (
            <div key={key} className="glass-risk__legend-item">
              <div
                className="glass-risk__legend-dot"
                style={{ backgroundColor: config.color }}
              />
              <span className="glass-risk__legend-label">
                {config.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Categories ── */}
        {categoryEntries.length > 0 && (
          <div className="glass-risk__categories">
            <span className="glass-risk__categories-label">
              Por categoría
            </span>
            <div className="glass-risk__categories-grid">
              {categoryEntries.map(([key, config]) => {
                const count = risks.items.filter(
                  (r) => r.category === key,
                ).length;
                const CatIcon = config.icon;
                return (
                  <span key={key} className="glass-risk__cat-chip">
                    <CatIcon
                      className="glass-risk__cat-icon"
                      style={{ color: config.color }}
                    />
                    <span className="glass-risk__cat-label">
                      {config.label}
                    </span>
                    <span
                      className="glass-risk__cat-count"
                      style={{ color: config.color }}
                    >
                      {count}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default RiskHeatmap;