/**
 * @component ApprovalStats (Fase 25)
 * @namespace .glass-approval__stat
 * @depends ApprovalQueue.css
 * @note Stats grid with counts by status.
 * @import import './ApprovalQueue.css';
 */

import { useMemo } from "react";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ApprovalRequest } from "./types";

interface ApprovalStatsProps {
  requests: ApprovalRequest[];
}

export function ApprovalStats({ requests }: ApprovalStatsProps) {
  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      dual: requests.filter(
        (r) =>
          r.status === "pending" && r.approval_level === "always_human",
      ).length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  if (requests.length === 0) return null;

  const items = [
    {
      label: "Pendientes",
      value: stats.pending,
      color: "var(--color-amber-400, #fbbf24)",
      icon: Clock,
    },
    {
      label: "Doble Aprob.",
      value: stats.dual,
      color: "var(--color-rose-400, #fb7185)",
      icon: ShieldAlert,
    },
    {
      label: "Aprobados",
      value: stats.approved,
      color: "var(--color-emerald-400, #34d399)",
      icon: CheckCircle2,
    },
    {
      label: "Rechazados",
      value: stats.rejected,
      color: "var(--color-rose-400, #fb7185)",
      icon: XCircle,
    },
  ];

  return (
    <div className="glass-approval__stats">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="glass-approval__stat">
            <div
              className="glass-approval__stat-glow"
              style={{ backgroundColor: item.color }}
            />
            <div className="glass-approval__stat-content">
              <div
                className="glass-approval__stat-icon"
                style={{
                  backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                  color: item.color,
                }}
              >
                <Icon />
              </div>
              <div>
                <p className="glass-approval__stat-label">{item.label}</p>
                <p className="glass-approval__stat-value">{item.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}