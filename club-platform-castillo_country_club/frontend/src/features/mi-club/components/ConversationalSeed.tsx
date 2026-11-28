/**
 * @component ConversationalSeed (Fase 25)
 * @namespace .glass-landing__seed
 * @depends ConversationalSeed.css
 * @note Minimal chat-like entry point with contextual prompt suggestions.
 *       Clicking a suggestion navigates to the relevant section.
 *       Feels like talking to the club.
 * @import import './ConversationalSeed.css';
 */
import "./ConversationalSeed.css";

import { useState } from "react";
import { useNavigate } from "react-router";
import { MessageSquare, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface ConversationalSeedProps {
  seeds: Array<{ prompt: string; route: string; icon: LucideIcon }>;
}

export function ConversationalSeed({
  seeds,
}: ConversationalSeedProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (seeds.length === 0) return null;

  return (
    <div className="glass-landing__seed">
      <Button
        variant="unstyled"
        type="button"
        className="glass-landing__seed-trigger"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Preguntale al club"
      >
        <span className="glass-landing__seed-trigger-icon">
          <MessageSquare size={16} />
        </span>
        <span className="glass-landing__seed-trigger-text">
          Preguntale al club...
        </span>
        <ArrowRight size={14} style={{ color: "var(--color-silver-500)", flexShrink: 0 }} />
      </Button>

      {expanded && (
        <div className="glass-landing__seed-suggestions">
          {seeds.map((seed, i) => {
            const Icon = seed.icon;
            return (
              <Button
                variant="unstyled"
                key={i}
                type="button"
                className="glass-landing__seed-suggestion"
                onClick={() => navigate(seed.route)}
              >
                <Icon size={14} />
                {seed.prompt}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}