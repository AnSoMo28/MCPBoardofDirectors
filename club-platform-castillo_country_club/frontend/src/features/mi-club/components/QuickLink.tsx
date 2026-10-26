/**
 * @component QuickLink (Fase 25)
 * @namespace .glass-landing__link
 * @depends MiClubLanding.css
 * @note Navigation card with icon, label, description, and arrow.
 * @import import '../MiClubLanding.css';
 */

import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";

interface QuickLinkProps {
  icon: LucideIcon;
  label: string;
  description: string;
  route: string;
  color: string;
}

export function QuickLink({
  icon: Icon,
  label,
  description,
  route,
  color,
}: QuickLinkProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="glass-landing__link"
      onClick={() => navigate(route)}
    >
      <div className="glass-landing__link-header">
        <div
          className="glass-landing__link-icon"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            color,
          }}
        >
          <Icon size={16} />
        </div>
        <ArrowRight
          size={14}
          className="glass-landing__link-arrow"
        />
      </div>
      <p className="glass-landing__link-label">{label}</p>
      <p className="glass-landing__link-desc">{description}</p>
    </button>
  );
}