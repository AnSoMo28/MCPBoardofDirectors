/**
 * @component RebookSuggestion (Fase 25)
 * @namespace .glass-reservations__suggestion
 * @depends MyReservations.css
 * @note Smart suggestion based on reservation patterns.
 *       Detects repeated facility bookings and suggests rebooking.
 * @import import './MyReservations.css';
 */

import { useNavigate } from "react-router";
import { Lightbulb, ArrowRight } from "lucide-react";
import type { RebookSuggestion as RebookSuggestionType } from "./types";
import { Button } from "@/shared/components/ui/Button";

interface RebookSuggestionProps {
  suggestion: RebookSuggestionType;
}

export function RebookSuggestion({
  suggestion,
}: RebookSuggestionProps) {
  const navigate = useNavigate();

  const dateObj = new Date(suggestion.date + "T12:00:00");
  const dayName = dateObj.toLocaleDateString("es-CR", {
    weekday: "long",
  });

  return (
    <Button
      variant="unstyled"
      type="button"
      className="glass-reservations__suggestion"
      onClick={() =>
        navigate(
          `/mi-club/reservas/nueva?facility=${encodeURIComponent(suggestion.facility)}&date=${suggestion.date}&time=${suggestion.startTime}`,
        )
      }
      aria-label={`Sugerencia: reservar ${suggestion.facility} el ${dayName}`}
    >
      <div className="glass-reservations__suggestion-inner">
        <div className="glass-reservations__suggestion-icon">
          <Lightbulb size={16} />
        </div>
        <div className="glass-reservations__suggestion-text">
          <p className="glass-reservations__suggestion-label">
            ¿Reservamos {suggestion.facility}?
          </p>
          <p className="glass-reservations__suggestion-desc">
            Reservaste {suggestion.facility} {suggestion.count} veces.
            Próximo {dayName} de {suggestion.startTime} a{" "}
            {suggestion.endTime}.
          </p>
        </div>
        <ArrowRight
          size={16}
          className="glass-reservations__suggestion-arrow"
        />
      </div>
    </Button>
  );
}