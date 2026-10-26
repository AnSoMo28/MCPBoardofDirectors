/**
 * SocialEventFormModal — F31
 *
 * AUTO modal for creating regular social events (non-gala).
 * Submits to manage_social_events action=create → immediate creation.
 *
 * Pattern: #12 (onSubmit, auto-focus, min-h-[44px]), #15 (showToast)
 */

import { useCallback, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Loader2, MapPin, Plus, Users } from 'lucide-react';

import { useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/components/ui/Toast';

import type { CulturalEventType, FormalityLevel, VenueType } from '../types';
import { EVENT_TYPE_CONFIG, FORMALITY_CONFIG, VENUE_CONFIG } from '../types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface SocialEventFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Non-gala event types
const SOCIAL_EVENT_TYPES: CulturalEventType[] = [
  'dinner', 'mixer', 'cocktail', 'brunch', 'themed_party', 'reception',
];

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function SocialEventFormModal({ onClose, onSuccess }: SocialEventFormModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMCPMutation('cultural_social', 'manage_social_events');

  const [form, setForm] = useState({
    name: '',
    event_type: 'dinner' as CulturalEventType,
    venue: 'Lounge del Club',
    venue_type: 'lounge' as VenueType,
    date: '',
    start_time: '19:00',
    end_time: '22:00',
    formality: 'semi_formal' as FormalityLevel,
    organizer_member_id: 'mem-001',
    guest_count: 50,
    budget: 0,
    menu_theme: '',
    dress_code: '',
    description: '',
    notes: '',
  });

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!form.name.trim()) {
        showToast({ type: 'error', message: 'Nombre del evento es obligatorio' });
        nameRef.current?.focus();
        return;
      }
      if (!form.date) {
        showToast({ type: 'error', message: 'Fecha es obligatoria' });
        return;
      }

      setSubmitting(true);
      try {
        await mutation.mutateAsync({
          action: 'create',
          name: form.name,
          event_type: form.event_type,
          venue: form.venue,
          venue_type: form.venue_type,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          formality: form.formality,
          organizer_member_id: form.organizer_member_id,
          guest_count: form.guest_count,
          budget: form.budget,
          menu_theme: form.menu_theme,
          dress_code: form.dress_code,
          description: form.description,
          notes: form.notes,
        });
        onSuccess();
      } catch {
        showToast({ type: 'error', message: 'Error creando el evento social' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, mutation, onSuccess],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-terracotta-400)_15%,transparent)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-surface-3)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-terracotta-400)_12%,transparent)]">
              <Plus className="h-5 w-5 text-[var(--color-terracotta-400)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-silver-100)]">
                Crear Evento Social
              </h2>
              <p className="text-xs text-[var(--color-silver-500)]">
                Se crea directamente — sin aprobación
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="min-h-[44px]">
            ✕
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Nombre del Evento *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Wine Tasting Friday"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Event Type + Formality */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Tipo
              </label>
              <select
                value={form.event_type}
                onChange={(e) => updateField('event_type', e.target.value as CulturalEventType)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              >
                {SOCIAL_EVENT_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {EVENT_TYPE_CONFIG[key]?.label ?? key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Formalidad
              </label>
              <select
                value={form.formality}
                onChange={(e) => updateField('formality', e.target.value as FormalityLevel)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              >
                {Object.entries(FORMALITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              <MapPin className="mr-1 inline h-3 w-3" />
              Lugar *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.venue}
                onChange={(e) => updateField('venue', e.target.value)}
                placeholder="Nombre del lugar"
                className="rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
              <select
                value={form.venue_type}
                onChange={(e) => updateField('venue_type', e.target.value as VenueType)}
                className="rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              >
                {Object.entries(VENUE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Fecha *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">Inicio</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">Fin</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Guests + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <Users className="mr-1 inline h-3 w-3" />
                Invitados
              </label>
              <input
                type="number"
                value={form.guest_count}
                onChange={(e) => updateField('guest_count', Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Presupuesto (₡)
              </label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => updateField('budget', Number(e.target.value))}
                min={0}
                step={50000}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe el evento..."
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-terracotta-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-terracotta-400)]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-[var(--color-surface-3)] pt-4">
            <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="sage"
              size="sm"
              className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-terracotta-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-terracotta-400)_15%,transparent)] text-[var(--color-terracotta-400)] hover:bg-[color-mix(in_srgb,var(--color-terracotta-400)_25%,transparent)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? 'Creando...' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
