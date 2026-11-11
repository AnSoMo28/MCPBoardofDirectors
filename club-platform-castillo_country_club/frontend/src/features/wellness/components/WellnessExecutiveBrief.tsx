/* ═══════════════════════════════════════════════════════════════
   Wellness Executive Brief — "The Brief" (P6)
   Typing-effect narrative from the advisor.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WellnessInsights, WellnessMode } from "../types";
import { WELLNESS_LEVEL_CONFIG } from "../types";
import "./WellnessExecutiveBrief.css";
import { Button } from "@/shared/components/ui/Button";

interface Props {
  insights: WellnessInsights | null;
  mode: WellnessMode;
  className?: string;
}

export function WellnessExecutiveBrief({
  insights,
  mode,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);

  const summary = insights?.executive_summary ?? "";
  const totalChars = summary.length;

  // Typing effect (P6)
  useEffect(() => {
    if (!summary || mode === "critical") {
      setVisibleChars(totalChars);
      return;
    }

    setVisibleChars(0);
    const speed = 18; // ms per char
    const interval = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= totalChars) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [summary, totalChars, mode]);

  const displayedText = summary.slice(0, visibleChars);
  const isTyping = visibleChars < totalChars;

  const levelConfig = useMemo(() => {
    if (!insights) return null;
    const score = insights.health_score;
    if (score >= 85) return WELLNESS_LEVEL_CONFIG.excellent;
    if (score >= 70) return WELLNESS_LEVEL_CONFIG.good;
    if (score >= 50) return WELLNESS_LEVEL_CONFIG.moderate;
    if (score >= 30) return WELLNESS_LEVEL_CONFIG.low;
    return WELLNESS_LEVEL_CONFIG.critical;
  }, [insights]);

  const criticalInsights = insights?.critical_insights ?? [];
  const keyFindings = insights?.key_findings ?? [];

  if (!insights) return null;

  return (
    <div
      className={cn("glass-wb", className)}
      data-mode={mode}
    >
      {/* ── Header ── */}
      <div className="wb__header">
        <Brain size={16} />
        <span className="wb__title">Briefing del Advisor</span>
        {levelConfig && (
          <span
            className="wb__score"
            style={{ color: levelConfig.color }}
          >
            {insights.health_score}/100
          </span>
        )}
      </div>

      {/* ── Narrative ── */}
      <p className="wb__narrative">
        {displayedText}
        {isTyping && <span className="wb__cursor">|</span>}
      </p>

      {/* ── Critical Insights ── */}
      {criticalInsights.length > 0 && (
        <div className="wb__critical">
          {criticalInsights.slice(0, expanded ? undefined : 2).map(
            (ci, i) => (
              <div key={i} className="wb__ci">
                <span className="wb__ci-text">{ci.insight}</span>
                <span className="wb__ci-action">
                  {ci.recommended_action}
                </span>
                {ci.deadline && (
                  <span className="wb__ci-deadline">
                    Deadline: {ci.deadline}
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {/* ── Key Findings (expandable) ── */}
      {keyFindings.length > 0 && (
        <>
          <Button
            variant="unstyled"
            className="wb__toggle"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Menos" : `${keyFindings.length} hallazgos`}
          </Button>
          {expanded && (
            <div className="wb__findings">
              {keyFindings.map((kf, i) => (
                <div key={i} className="wb__finding">
                  <span
                    className="wb__finding-cat"
                    data-category={kf.category}
                  >
                    {kf.category}
                  </span>
                  <span className="wb__finding-text">{kf.finding}</span>
                  <span className="wb__finding-action">{kf.action}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}