/**
 * @component StatPill (Fase 25)
 * @namespace .glass-landing__stat
 * @depends MiClubLanding.css
 * @note Compact stat with icon, value, and label.
 * @import import '../MiClubLanding.css';
 */

interface StatPillProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}

export function StatPill({
  icon,
  value,
  label,
  color,
}: StatPillProps) {
  return (
    <div className="glass-landing__stat">
      <div
        className="glass-landing__stat-icon"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <p className="glass-landing__stat-value">{value}</p>
        <p className="glass-landing__stat-label">{label}</p>
      </div>
    </div>
  );
}