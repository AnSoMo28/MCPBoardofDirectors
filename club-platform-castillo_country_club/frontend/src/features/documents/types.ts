// src/features/documents/types.ts
// ═══════════════════════════════════════════════════════════
// Document Intelligence — Types & Config
// Aligned with backend: document_intelligence_agent.py
// Silver Tide tokens: ALL from design system (no phantom tokens)
// ═══════════════════════════════════════════════════════════

export type DocumentType =
  | "bylaw"
  | "regulation"
  | "policy"
  | "minutes"
  | "financial_report"
  | "contract"
  | "newsletter"
  | "memo"
  | "form"
  | "other";

export type DocumentStatus = "draft" | "published" | "archived";

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  category: string;
  description?: string;
  file_url?: string;
  content_preview?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  status: DocumentStatus;
  access_roles: string[];
  file_size_bytes?: number;
  mime_type?: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevance_score: number;
  snippet: string;
  highlighted_terms: string[];
}

export interface DocumentSearchParams {
  query: string;
  document_types?: DocumentType[];
  tags?: string[];
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
}

export interface DocumentSearchResponse {
  status: string;
  results: DocumentSearchResult[];
  total: number;
  query_time_ms: number;
}

// ── Knowledge / RAG ──

export type KnowledgeQueryParams = {
  question: string;
  conversation_id?: string;
  max_sources?: number;
}

export interface KnowledgeSource {
  document_id: string;
  title: string;
  snippet: string;
  relevance: number;
  document_type: DocumentType;
}

export interface KnowledgeResponse {
  status: string;
  answer: string;
  sources: KnowledgeSource[];
  confidence: number;
  conversation_id: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  confidence?: number;
  timestamp: string;
}

// ── Config maps (Silver Tide) ──
// All tokens verified against :root in global.css

export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; color: string; bgColor: string }
> = {
  bylaw: {
    label: "Estatuto",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  regulation: {
    label: "Reglamento",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 15%, transparent)",
  },
  policy: {
    label: "Política",
    color: "var(--color-teal-400)",

    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  minutes: {
    label: "Acta",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  financial_report: {
    label: "Informe Financiero",
    color: "var(--color-emerald-500)",
    bgColor: "color-mix(in srgb, var(--color-emerald-500) 12%, transparent)",
  },
  contract: {
    label: "Contrato",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 15%, transparent)",
  },
  newsletter: {
    label: "Boletín",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  memo: {
    label: "Memorando",
    color: "var(--color-gold-500)",
    bgColor: "color-mix(in srgb, var(--color-gold-500) 12%, transparent)",
  },
  form: {
    label: "Formulario",
    color: "var(--color-teal-500)",
    bgColor: "color-mix(in srgb, var(--color-teal-500) 12%, transparent)",
  },
  other: {
    label: "Otro",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
  },
};

export const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; badgeVariant: "success" | "warning" | "default" }
> = {
  draft: { label: "Borrador", badgeVariant: "warning" },
  published: { label: "Publicado", badgeVariant: "success" },
  archived: { label: "Archivado", badgeVariant: "default" },
};

// ── Helpers ──

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
