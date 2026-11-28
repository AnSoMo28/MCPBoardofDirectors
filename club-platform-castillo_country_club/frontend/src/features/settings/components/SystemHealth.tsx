/**
 * @component SystemHealth (Fase 25)
 * @namespace .glass-settings__agents
 * @depends SystemHealth.css
 * @note Backend status + 8-agent awareness + app info footer.
 *       Shows the system is alive with pulsing agent dots.
 * @import import './SystemHealth.css';
 */
import "./SystemHealth.css";

import { Server, Database, Clock } from "lucide-react";
import type { BackendStatus } from "@/shared/hooks/useBackendHealth";
import { BACKEND_STATUS_CONFIG, APP_INFO } from "../config";
import type { SettingAgentStatus } from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface SystemHealthProps {
  backendStatus: BackendStatus;
  sessionElapsed: string;
  agentStatuses: SettingAgentStatus[];
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function SystemHealth({
  backendStatus,
  sessionElapsed,
  agentStatuses,
}: SystemHealthProps) {
  const statusCfg = BACKEND_STATUS_CONFIG[backendStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div>
      {/* Info rows */}
      <div className="glass-settings__info-row">
        <span className="glass-settings__info-row-label">
          Aplicación
        </span>
        <span className="glass-settings__info-row-value">
          {APP_INFO.name}
        </span>
      </div>
      <div className="glass-settings__info-row">
        <span className="glass-settings__info-row-label">
          Versión
        </span>
        <span className="glass-settings__info-row-value">
          {APP_INFO.version}
        </span>
      </div>
      <div className="glass-settings__info-row">
        <span className="glass-settings__info-row-label">
          Framework
        </span>
        <span className="glass-settings__info-row-value">
          {APP_INFO.framework}
        </span>
      </div>
      <div className="glass-settings__info-row">
        <span className="glass-settings__info-row-label">
          Design System
        </span>
        <span className="glass-settings__info-row-value">
          {APP_INFO.designSystem}
        </span>
      </div>
      <div className="glass-settings__info-row">
        <span className="glass-settings__info-row-label">
          Estado del backend
        </span>
        <span
          className="glass-settings__backend-status"
          style={{
            color: statusCfg.color,
            backgroundColor: statusCfg.bgColor,
          }}
        >
          <StatusIcon size={11} />
          {statusCfg.label}
        </span>
      </div>

      {/* Agent awareness */}
      <div className="glass-settings__agents">
        <span className="glass-settings__agents-title">
          Agentes activos
        </span>
        <div className="glass-settings__agents-list">
          {agentStatuses.map((agent) => (
            <div
              key={agent.id}
              className="glass-settings__agent-row"
            >
              <span
                className={`glass-settings__agent-dot${agent.isActive ? " glass-settings__agent-dot--active" : ""}`}
                style={{
                  backgroundColor: agent.accent,
                  color: agent.accent,
                }}
              />
              <span className="glass-settings__agent-label">
                {agent.label}
              </span>
              <span className="glass-settings__agent-status">
                {agent.statusText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="glass-settings__footer">
        <div className="glass-settings__footer-item">
          <Server size={12} />
          <span>Backend: MCP Tools Architecture</span>
        </div>
        <div className="glass-settings__footer-item">
          <Database size={12} />
          <span>Datos en tiempo real via Model Context Protocol</span>
        </div>
        <div className="glass-settings__footer-item">
          <Clock size={12} />
          <span>Sesión activa: {sessionElapsed}</span>
        </div>
      </div>
    </div>
  );
}