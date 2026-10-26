/**
 * @hook useExportDropdown (Fase 24)
 * @module shared/hooks
 * @exports useExportDropdown, type ExportOption, type ExportHistoryEntry,
 *          type ExportProgress, type ExportResult, type UseExportDropdownReturn
 * @note Export state, keyboard navigation, progress tracking, history.
 *       Toast feedback lives here (showToast is a utility, not a UI component).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { showToast } from "@/shared/components/ui";
import {
  generateFilename,
  downloadBlob,
  formatNarrativeAsText,
  formatNarrativeAsCSV,
} from "@/shared/services/exportService";
import type { NarrativeExportData } from "@/shared/services/exportService";
import type { LucideIcon } from "lucide-react";
import {
  FileDown,
  FileText,
  Printer,
  Clipboard,
  Table,
} from "lucide-react";

/* ═══════════════════════════════════════
   History Storage
   ═══════════════════════════════════════ */

const HISTORY_KEY = "ccc-export-history";
const MAX_HISTORY = 5;

export interface ExportHistoryEntry {
  format: string;
  module: string;
  timestamp: number;
  filename: string | null;
  meta?: Record<string, string | number>;
}

function getHistory(): ExportHistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addHistoryEntry(entry: ExportHistoryEntry): void {
  try {
    const history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* sessionStorage unavailable */
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "ahora mismo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

/* ═══════════════════════════════════════
   Options Config
   ═══════════════════════════════════════ */

export interface ExportOption {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  requiresData?: boolean;
  isAI?: boolean;
}

const ALL_OPTIONS: ExportOption[] = [
  {
    id: "print",
    label: "Imprimir / PDF",
    icon: Printer,
    description: "Vista previa → Guardar como PDF",
  },
  {
    id: "text",
    label: "Copiar texto",
    icon: Clipboard,
    description: "Al portapapeles",
    requiresData: true,
  },
  {
    id: "csv",
    label: "Descargar CSV",
    icon: Table,
    description: "Hoja de cálculo",
    requiresData: true,
  },
  {
    id: "excel",
    label: "Descargar Excel",
    icon: FileDown,
    description: "Formato .xlsx",
    requiresData: true,
  },
  {
    id: "decision",
    label: "Documento de Decisión",
    icon: FileText,
    description: "Informe combinado con simulaciones",
    isAI: true,
  },
];

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface ExportProgress {
  format: string | null;
  state: "idle" | "exporting" | "done";
}

export interface ExportResult {
  success: boolean;
  format: string;
  meta?: Record<string, string | number>;
}

interface UseExportDropdownOptions {
  module: string;
  data?: NarrativeExportData;
  onPrint?: () => void;
  onDecisionDocument?: () => void;
}

export interface UseExportDropdownReturn {
  /* State */
  isOpen: boolean;
  isExporting: boolean;
  progress: ExportProgress;
  activeIndex: number;
  availableOptions: readonly ExportOption[];
  lastExport: ExportHistoryEntry | null;
  /* Refs */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /* Actions */
  open: () => void;
  close: () => void;
  toggle: () => void;
  handleOption: (id: string) => Promise<ExportResult>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  /* Keyboard */
  handleTriggerKeyDown: (e: React.KeyboardEvent) => void;
  handleMenuKeyDown: (e: React.KeyboardEvent) => void;
  /* Helpers */
  setOptionRef: (index: number, el: HTMLButtonElement | null) => void;
  getTimeAgo: (timestamp: number) => string;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useExportDropdown({
  module,
  data,
  onPrint,
  onDecisionDocument,
}: UseExportDropdownOptions): UseExportDropdownReturn {
  /* ── Refs ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isExportingRef = useRef(false);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ── State ── */
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [progress, setProgress] = useState<ExportProgress>({
    format: null,
    state: "idle",
  });
  const [lastExport, setLastExport] = useState<ExportHistoryEntry | null>(
    () => getHistory()[0] ?? null,
  );

  /* ── Derived: filtered options ── */
  const availableOptions: readonly ExportOption[] = ALL_OPTIONS.filter(
    (opt) => {
      if (opt.requiresData && !data) return false;
      if (opt.id === "decision" && !onDecisionDocument) return false;
      if (opt.id === "print" && !onPrint) return false;
      return true;
    },
  );

  /* ── Close (returns focus to trigger) ── */
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    requestAnimationFrame(() => {
      const trigger = containerRef.current?.querySelector(
        '[aria-haspopup="menu"]',
      ) as HTMLElement | null;
      trigger?.focus();
    });
  }, []);

  /* ── Open (focus first option) ── */
  const open = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(0);
  }, []);

  /* ── Toggle ── */
  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  /* ── Click outside ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);

  /* ── Focus active option when index changes ── */
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [isOpen, activeIndex]);

  /* ── Reset progress after "done" state ── */
  useEffect(() => {
    if (progress.state === "done") {
      doneTimerRef.current = setTimeout(() => {
        setProgress({ format: null, state: "idle" });
      }, 2000);
      return () => clearTimeout(doneTimerRef.current);
    }
  }, [progress.state]);

  /* ── Option ref setter ── */
  const setOptionRef = useCallback(
    (index: number, el: HTMLButtonElement | null) => {
      optionRefs.current[index] = el;
    },
    [],
  );

  /* ── Handle export ── */
  const handleOption = useCallback(
    async (id: string): Promise<ExportResult> => {
      setIsOpen(false);
      setActiveIndex(-1);

      /* Print — callback handles its own UX */
      if (id === "print") {
        onPrint?.();
        return { success: true, format: "print" };
      }

      /* Decision document — callback handles its own UX */
      if (id === "decision") {
        onDecisionDocument?.();
        addHistoryEntry({
          format: "decision",
          module,
          timestamp: Date.now(),
          filename: null,
        });
        setLastExport(getHistory()[0] ?? null);
        return { success: true, format: "decision" };
      }

      /* Data-dependent exports */
      if (!data) {
        return { success: false, format: id };
      }

      /* Guard: prevent double-fire */
      if (isExportingRef.current) {
        return { success: false, format: id };
      }
      isExportingRef.current = true;
      setProgress({ format: id, state: "exporting" });

      try {
        let meta: Record<string, string | number> = {};

        switch (id) {
          case "text": {
            const text = formatNarrativeAsText(data);
            await navigator.clipboard.writeText(text);
            meta = { chars: text.length };
            showToast({
              type: "success",
              message: `Texto copiado · ${text.length.toLocaleString()} caracteres`,
            });
            break;
          }

          case "csv": {
            const csv = formatNarrativeAsCSV(data);
            const rows = csv.split("\n").filter((l) => l.trim()).length - 1;
            const filename = generateFilename(module, "csv");
            const blob = new Blob(["\uFEFF" + csv], {
              type: "text/csv;charset=utf-8;",
            });
            downloadBlob(blob, filename);
            const kb = Math.round(blob.size / 1024);
            meta = { rows, kb, filename };
            showToast({
              type: "success",
              message: `CSV descargado · ${filename} · ${rows} filas · ${kb} KB`,
            });
            break;
          }

          case "excel": {
            const csv = formatNarrativeAsCSV(data);
            const rows = csv.split("\n").filter((l) => l.trim()).length - 1;
            const filename = generateFilename(module, "xlsx");
            const blob = new Blob(["\uFEFF" + csv], {
              type: "application/vnd.ms-excel;charset=utf-8;",
            });
            downloadBlob(blob, filename);
            const kb = Math.round(blob.size / 1024);
            meta = { rows, kb, filename };
            showToast({
              type: "success",
              message: `Excel descargado · ${filename} · ${rows} filas · ${kb} KB`,
            });
            break;
          }
        }

        addHistoryEntry({
          format: id,
          module,
          timestamp: Date.now(),
          filename: (meta.filename as string) ?? null,
          meta,
        });
        setProgress({ format: id, state: "done" });
        setLastExport(getHistory()[0] ?? null);
        return { success: true, format: id, meta };
      } catch {
        setProgress({ format: null, state: "idle" });
        showToast({
          type: "error",
          message: "Error al exportar. Intentá de nuevo.",
        });
        return { success: false, format: id };
      } finally {
        isExportingRef.current = false;
      }
    },
    [data, module, onPrint, onDecisionDocument],
  );

  /* ── Trigger keyboard handler ── */
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          open();
          break;
        case "ArrowUp":
          e.preventDefault();
          open();
          /* Focus last option on ArrowUp from trigger */
          setActiveIndex(availableOptions.length - 1);
          break;
      }
    },
    [open, setActiveIndex, availableOptions.length],
  );

  /* ── Menu keyboard handler ── */
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = availableOptions.length;
      if (len === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % len);
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + len) % len);
          break;

        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          break;

        case "End":
          e.preventDefault();
          setActiveIndex(len - 1);
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < len) {
            handleOption(availableOptions[activeIndex].id);
          }
          break;

        case "Escape":
          e.preventDefault();
          close();
          break;

        default: {
          /* Type-ahead: jump to first option starting with typed char */
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const char = e.key.toLowerCase();
            const matchIdx = availableOptions.findIndex((opt) =>
              opt.label.toLowerCase().startsWith(char),
            );
            if (matchIdx >= 0) {
              setActiveIndex(matchIdx);
            }
          }
          break;
        }
      }
    },
    [availableOptions, activeIndex, close, handleOption],
  );

  /* ── Return ── */
  return {
    isOpen,
    isExporting: progress.state === "exporting",
    progress,
    activeIndex,
    availableOptions,
    lastExport,
    containerRef,
    open,
    close,
    toggle,
    handleOption,
    setActiveIndex,
    handleTriggerKeyDown,
    handleMenuKeyDown,
    setOptionRef,
    getTimeAgo: formatTimeAgo,
  };
}