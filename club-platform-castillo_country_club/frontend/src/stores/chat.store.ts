import { create } from "zustand";

interface ChatStore {
  isOpen: boolean;
  advisorContext: AdvisorChatContext | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setAdvisorContext: (ctx: AdvisorChatContext | null) => void;
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
export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  advisorContext: null,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setAdvisorContext: (ctx) => set({ advisorContext: ctx }),
}));
