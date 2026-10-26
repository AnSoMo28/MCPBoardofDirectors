/**
 * @component EventCard (Fase 25)
 * @namespace .glass-landing__event-card
 * @depends MiClubLanding.css
 * @note Event card with emoji icon, title, time, location.
 *       Click navigates to event detail.
 * @import import '../MiClubLanding.css';
 */

import { Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { EVENT_CATEGORY_CONFIG } from "@/features/events/types";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date_start: string;
    location?: string;
    category: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const typeConfig = EVENT_CATEGORY_CONFIG[event.category as keyof typeof EVENT_CATEGORY_CONFIG] ?? {
    icon: "📅",
    color: "var(--color-silver-400)",
  };

  const datePart = event.date_start.split("T")[0];
  const timePart =
    event.date_start.split("T")[1]?.slice(0, 5) ?? "";

  return (
    <button
      type="button"
      className="glass-landing__event-card"
      onClick={() => navigate(`/mi-club/eventos/${event.id}`)}
      aria-label={`Evento: ${event.title}`}
    >
      <div className="glass-landing__event-card-inner">
        <span className="glass-landing__event-card-emoji" aria-hidden="true">
          {typeConfig.icon}
        </span>
        <div className="glass-landing__event-card-info">
          <h4 className="glass-landing__event-card-title">
            {event.title}
          </h4>
          <div className="glass-landing__event-card-time">
            <Clock size={11} />
            <span>
              {datePart} · {timePart}
            </span>
          </div>
          {event.location && (
            <div className="glass-landing__event-card-location">
              <MapPin size={11} />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}