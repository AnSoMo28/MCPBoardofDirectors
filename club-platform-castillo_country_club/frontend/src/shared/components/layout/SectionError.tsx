// src/shared/components/layout/SectionError.tsx
// Fase 21 — Silver Tide Section Error
// Glass · Entrance animation · Rose ambient glow
// ═══════════════════════════════════════════════════════════════════

import { AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui";
import './SectionError.css';

interface SectionErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export function SectionError({
  title = "Error al cargar",
  description = "No se pudieron obtener los datos. Intentá de nuevo.",
  onRetry,
  retryLabel = "Reintentar",
  compact = false,
}: SectionErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
      className={`glass-section-error ${compact ? "glass-section-error--compact" : ""}`}
    >
      <div className="glass-section-error__icon">
        <AlertCircle
          className={compact ? "w-5 h-5" : "w-7 h-7"}
        />
      </div>

      <h3 className="glass-section-error__title">
        {title}
      </h3>

      <p className="glass-section-error__desc">
        {description}
      </p>

      {onRetry && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: [0.95, 1.05, 1] }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            onClick={onRetry}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {retryLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}