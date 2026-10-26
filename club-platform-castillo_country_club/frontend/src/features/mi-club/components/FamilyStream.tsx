/**
 * @component FamilyStream (Fase 25)
 * @namespace .glass-landing__stream
 * @depends MiClubLanding.css
 * @note Mini activity timeline showing recent family actions.
 *       Replaces the old LastActivityBar with richer context.
 * @import import '../MiClubLanding.css';
 */

import { timeAgo } from "@/shared/lib/utils";
import type { FamilyStreamItem } from "../types";

interface FamilyStreamProps {
  items: FamilyStreamItem[];
}

export function FamilyStream({ items }: FamilyStreamProps) {
  if (items.length === 0) return null;

  return (
    <div className="glass-landing__stream">
      <span className="glass-landing__stream-title">
        Actividad de tu familia
      </span>
      <div className="glass-landing__stream-list">
        {items.map((item) => (
          <div key={item.id} className="glass-landing__stream-item">
            <span
              className="glass-landing__stream-item-dot"
              style={{ backgroundColor: item.color }}
            />
            <span className="glass-landing__stream-item-text">
              {item.description}
            </span>
            <span className="glass-landing__stream-item-time">
              {timeAgo(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}