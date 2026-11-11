/**
 * @component AgentConstellation (Fase 25)
 * @namespace .glass-landing__constellation
 * @depends MiClubLanding.css
 * @note 8-agent awareness visualization. Each dot pulses if the agent
 *       has active data for this socio. Click navigates to relevant section.
 * @import import '../MiClubLanding.css';
 */

import { useNavigate } from "react-router";
import type { AgentActivityItem } from "../types";
import { Button } from "@/shared/components/ui/Button";

interface AgentConstellationProps {
  agents: AgentActivityItem[];
}

export function AgentConstellation({
  agents,
}: AgentConstellationProps) {
  const navigate = useNavigate();

  return (
    <div
      className="glass-landing__constellation"
      role="list"
      aria-label="Agentes de inteligencia activos"
    >
      {agents.map((agent) => (
        <Button
          variant="unstyled"
          key={agent.id}
          type="button"
          className={`glass-landing__agent glass-landing__agent--${agent.isActive ? "active" : "inactive"}`}
          onClick={() => navigate(agent.route)}
          role="listitem"
          aria-label={`${agent.label}: ${agent.statusText}`}
          title={agent.statusText}
        >
          <span
            className="glass-landing__agent-pip"
            style={{
              backgroundColor: agent.accent,
              color: agent.accent,
            }}
          />
          <span className="glass-landing__agent-label">
            {agent.label}
          </span>
          <span className="glass-landing__agent-status">
            {agent.statusText}
          </span>
        </Button>
      ))}
    </div>
  );
}