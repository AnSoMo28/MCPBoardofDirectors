/**
 * @hook useApprovalQueue (Fase 25)
 * @module features/approvals/hooks
 * @exports useApprovalQueue, type ViewTab
 * @note Query, mutations, tab/filter/search state, batch selection,
 *       approve/reject handlers, URL sync, Ctrl+K shortcut.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useAuthStore } from "@/stores/auth.store";
import { showToast } from "@/shared/components/ui/Toast";
import { AGENT_LABELS } from "../types";
import type {
  ApprovalRequest,
  ApprovalListResponse,
} from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type ViewTab = "pending" | "all";

export interface UseApprovalQueueReturn {
  /* Data */
  requests: ApprovalRequest[];
  filtered: ApprovalRequest[];
  pendingCount: number;
  dualCount: number;
  /* Loading */
  isLoading: boolean;
  error: Error | null;
  /* Tabs */
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  /* Filters */
  agentFilter: string;
  setAgentFilter: (v: string) => void;
  activeAgents: string[];
  search: string;
  setSearch: (v: string) => void;
  /* Actions */
  processingId: string | null;
  handleApprove: (requestId: string, note: string) => void;
  handleReject: (requestId: string, reason: string) => void;
  refetch: () => void;
  /* Batch */
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  batchApprove: (note: string) => void;
  hasSelection: boolean;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useApprovalQueue(): UseApprovalQueueReturn {
  const user = useAuthStore((s) => s.user);

  /* ── URL sync ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab: ViewTab =
    rawTab === "all" ? "all" : "pending";
  const initialAgent = searchParams.get("agent") || "";

  const [activeTab, setActiveTabRaw] = useState<ViewTab>(initialTab);
  const [agentFilter, setAgentFilterRaw] = useState(initialAgent);
  const [search, setSearch] = useState("");

  const setActiveTab = useCallback(
    (tab: ViewTab) => {
      setActiveTabRaw(tab);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (tab === "pending") p.delete("tab");
          else p.set("tab", tab);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setAgentFilter = useCallback(
    (v: string) => {
      setAgentFilterRaw(v);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (v) p.set("agent", v);
          else p.delete("agent");
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /* ── Ctrl+K shortcut ── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("approval-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── Queries ── */
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useMCPQuery<ApprovalListResponse>(
    "hitl",
    "get_pending_approvals",
    {},
    { refetchInterval: 30_000 },
  );

  /* ── Mutations ── */
  const [processingId, setProcessingId] = useState<string | null>(null);

  const approveMut = useMCPMutation<
    unknown,
    { request_id: string; approved_by: string; note: string }
  >("hitl", "approve_request", {
    onSuccess: () => {
      showToast({
        type: "success",
        message: "Solicitud aprobada correctamente",
      });
      setProcessingId(null);
      refetch();
    },
    onError: (err) => {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al aprobar",
      });
      setProcessingId(null);
    },
  });

  const rejectMut = useMCPMutation<
    unknown,
    { request_id: string; rejected_by: string; reason: string }
  >("hitl", "reject_request", {
    onSuccess: () => {
      showToast({ type: "info", message: "Solicitud rechazada" });
      setProcessingId(null);
      refetch();
    },
    onError: (err) => {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al rechazar",
      });
      setProcessingId(null);
    },
  });

  /* ── Data ── */
  const requests = data?.requests ?? [];
  const pendingCount = requests.filter(
    (r) => r.status === "pending",
  ).length;
  const dualCount = requests.filter(
    (r) => r.status === "pending" && r.approval_level === "always_human",
  ).length;

  /* ── Active agents ── */
  const activeAgents = useMemo(() => {
    const set = new Set(requests.map((r) => r.agent));
    return Array.from(set).sort();
  }, [requests]);

  /* ── Filtered data ── */
  const filtered = useMemo(() => {
    let list = requests;
    if (activeTab === "pending")
      list = list.filter((r) => r.status === "pending");
    if (agentFilter)
      list = list.filter((r) => r.agent === agentFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.tool.toLowerCase().includes(q) ||
          r.risk_summary?.toLowerCase().includes(q) ||
          (AGENT_LABELS[r.agent] ?? r.agent)
            .toLowerCase()
            .includes(q),
      );
    }
    return list;
  }, [requests, activeTab, agentFilter, search]);

  /* ── Batch selection ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const pendingIds = filtered
      .filter((r) => r.status === "pending")
      .map((r) => r.request_id);
    setSelectedIds(new Set(pendingIds));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const hasSelection = selectedIds.size > 0;

  const batchApprove = useCallback(
    (note: string) => {
      for (const id of selectedIds) {
        approveMut.mutate({
          request_id: id,
          approved_by: user?.name ?? "unknown",
          note,
        });
      }
      setSelectedIds(new Set());
    },
    [selectedIds, approveMut, user],
  );

  /* ── Handlers ── */
  const handleApprove = useCallback(
    (requestId: string, note: string) => {
      setProcessingId(requestId);
      approveMut.mutate({
        request_id: requestId,
        approved_by: user?.name ?? "unknown",
        note,
      });
    },
    [approveMut, user],
  );

  const handleReject = useCallback(
    (requestId: string, reason: string) => {
      setProcessingId(requestId);
      rejectMut.mutate({
        request_id: requestId,
        rejected_by: user?.name ?? "unknown",
        reason,
      });
    },
    [rejectMut, user],
  );

  return {
    requests,
    filtered,
    pendingCount,
    dualCount,
    isLoading,
    error: error as Error | null,
    activeTab,
    setActiveTab,
    agentFilter,
    setAgentFilter,
    activeAgents,
    search,
    setSearch,
    processingId,
    handleApprove,
    handleReject,
    refetch,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    batchApprove,
    hasSelection,
  };
}