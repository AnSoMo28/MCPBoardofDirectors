/**
 * @component TypeChip (Fase 25)
 * @namespace .glass-docs__chip
 * @depends DocumentRepository.css
 * @note Animated filter chip with type icon and remove button.
 * @import import '../DocumentRepository.css';
 */

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { DOCUMENT_TYPE_CONFIG } from "@/features/documents/types";
import type { DocumentType } from "@/features/documents/types";

/* ═══════════════════════════════════════
   Icon map (mirrors DOCUMENT_TYPE_CONFIG)
   ═══════════════════════════════════════ */

import {
  Scale,
  Shield,
  FileCheck,
  BookOpen,
  Receipt,
  FileText,
  Newspaper,
  File,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

const TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  bylaw: Scale,
  regulation: Shield,
  policy: FileCheck,
  minutes: BookOpen,
  financial_report: Receipt,
  contract: FileText,
  newsletter: Newspaper,
  memo: File,
  form: ClipboardList,
  other: File,
};

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface TypeChipProps {
  type: DocumentType;
  onRemove: () => void;
  reducedMotion: boolean;
}

export function TypeChip({ type, onRemove, reducedMotion }: TypeChipProps) {
  const config = DOCUMENT_TYPE_CONFIG[type];
  const Icon = TYPE_ICONS[type] ?? File;

  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="glass-docs__chip"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid color-mix(in srgb, ${config.color} 25%, transparent)`,
      }}
    >
      <Icon size={12} />
      {config.label}
      <Button
        variant="unstyled"
        type="button"
        onClick={onRemove}
        className="glass-docs__chip-remove"
        aria-label={`Quitar filtro ${config.label}`}
      >
        <X size={12} />
      </Button>
    </motion.span>
  );
}

export { TYPE_ICONS };