import { create } from "zustand";

interface ChatStore {
  isOpen: boolean;
  advisorContext: AdvisorChatContext | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setAdvisorContext: (ctx: AdvisorChatContext | null) => void;
  /** Bridge F24: handler de acciones de chat registrado por el ExecutiveDashboard. */
  executeAction: ((action: ChatBridgeAction) => Promise<void>) | null;
  setExecuteAction: (fn: ((action: ChatBridgeAction) => Promise<void>) | null) => void;
}
export interface AdvisorChatContext {
  insights: Array<{
    id: string;
    title: string;
    reasoning: string;
    impact: string;
    layer: string;
  }>;
  period: string;               // ← el tipo exacto del `period` del ExecutiveDashboard
  systemicRiskScore?: number;
}
/** Acción ejecutable del chat (forma estructural, isomorfa a AdvisorSuggestedAction). */
export interface ChatBridgeAction {
  label: string;
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approval_level: string;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  advisorContext: null,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setAdvisorContext: (ctx) => set({ advisorContext: ctx }),
  executeAction: null,
  setExecuteAction: (fn) => set({ executeAction: fn }),
}));
