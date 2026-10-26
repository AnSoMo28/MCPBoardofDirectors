/**
 * @component ApprovalQueue (Fase 25 — REWRITE)
 * @namespace .glass-approval
 * @depends useApprovalQueue, ApprovalCard, ApprovalStats, DetailTabs,
 *          ApprovalQueue.css
 * @note Full rewrite from 450-line monolith to orchestrator with hook + 2 sub-components.
 *       URL sync, batch approve, Ctrl+K shortcut, CSS co-locado.
 *       Backward-compatible: same default export, same route.
 * @import import './ApprovalQueue.css';
 */

import { Shield, Clock, Search, Check } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import {
  DetailTabs,
  type DetailTab,
} from "@/shared/components/layout/DetailTabs";
import { Skeleton } from "@/shared/components/ui";
import { AGENT_LABELS } from "./types";
import { useApprovalQueue } from "./hooks/useApprovalQueue";
import { ApprovalCard } from "./ApprovalCard";
import { ApprovalStats } from "./ApprovalStats";
import "./ApprovalQueue.css";

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ApprovalQueue() {
  const q = useApprovalQueue();

  const tabs: DetailTab[] = [
    {
      id: "pending",
      label: "Pendientes",
      icon: Clock,
      count: q.pendingCount,
    },
    {
      id: "all",
      label: "Todas",
      icon: Shield,
      count: q.requests.length,
    },
  ];

  return (
    <PageContainer
      title="Cola de Aprobaciones"
      subtitle={
        q.pendingCount > 0
          ? `${q.pendingCount} pendiente${q.pendingCount !== 1 ? "s" : ""}${q.dualCount > 0 ? ` · ${q.dualCount} doble confirmación` : ""}`
          : "Sin solicitudes pendientes"
      }
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Aprobaciones" },
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ── Stats ── */}
        {!q.isLoading && <ApprovalStats requests={q.requests} />}

        {/* ── Tabs ── */}
        <DetailTabs
          tabs={tabs}
          active={q.activeTab}
          onChange={(id) => q.setActiveTab(id as "pending" | "all")}
          ariaLabel="Filtro de aprobaciones"
        />

        {/* ── Filters ── */}
        <div className="glass-approval__filters">
          <div className="glass-approval__search">
            <Search className="glass-approval__search-icon" />
            <input
              id="approval-search"
              type="text"
              value={q.search}
              onChange={(e) => q.setSearch(e.target.value)}
              placeholder="Buscar aprobaciones..."
              className="glass-approval__search-input"
              aria-label="Buscar aprobaciones"
            />
          </div>

          {q.activeAgents.length > 1 && (
            <select
              value={q.agentFilter}
              onChange={(e) => q.setAgentFilter(e.target.value)}
              className="glass-approval__agent-select"
              aria-label="Filtrar por agente"
            >
              <option value="">Todos los agentes</option>
              {q.activeAgents.map((a) => (
                <option key={a} value={a}>
                  {AGENT_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Batch bar ── */}
        {q.hasSelection && (
          <div className="glass-approval__batch">
            <span className="glass-approval__batch-count">
              {q.selectedIds.size} seleccionada
              {q.selectedIds.size > 1 ? "s" : ""}
            </span>
            <div className="glass-approval__batch-actions">
              <button
                type="button"
                className="glass-approval__batch-btn glass-approval__batch-btn--approve"
                onClick={() => q.batchApprove("Aprobación en lote")}
              >
                <Check size={14} />
                Aprobar seleccionadas
              </button>
              <button
                type="button"
                className="glass-approval__batch-btn glass-approval__batch-btn--clear"
                onClick={q.clearSelection}
              >
                Deseleccionar
              </button>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {q.isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="glass-approval__skeleton" />
            ))}
          </div>
        ) : q.filtered.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-12 h-12" />}
            title={
              q.activeTab === "pending"
                ? "Sin aprobaciones pendientes"
                : "Sin solicitudes de aprobación"
            }
            description={
              q.activeTab === "pending"
                ? "Todas las solicitudes fueron procesadas."
                : "No hay solicitudes registradas."
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {q.filtered.map((request) => (
              <ApprovalCard
                key={request.request_id}
                request={request}
                onApprove={q.handleApprove}
                onReject={q.handleReject}
                isProcessing={q.processingId === request.request_id}
                isSelected={q.selectedIds.has(request.request_id)}
                onToggleSelect={() => q.toggleSelect(request.request_id)}
                showCheckbox={
                  q.activeTab === "pending" &&
                  q.filtered.filter((r) => r.status === "pending").length > 1
                }
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default ApprovalQueue;