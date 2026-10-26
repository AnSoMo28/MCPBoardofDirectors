/**
 * @component SettingSection (Fase 25)
 * @namespace .glass-settings__section
 * @depends SettingsPage.css
 * @note Reusable section card with icon header.
 * @import import '../SettingsPage.css';
 */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

interface SettingSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingSectionProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35 }}
      className="glass-settings__section"
      aria-label={title}
    >
      <div className="glass-settings__section-header">
        <div className="glass-settings__section-icon">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="glass-settings__section-title">{title}</h3>
          {description && (
            <p className="glass-settings__section-description">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="glass-settings__section-body">{children}</div>
    </motion.section>
  );
}