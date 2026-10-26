/**
 * GalaFormModal — F31
 *
 * HITL modal for organizing formal galas.
 * Submits to organize_formal_gala → approval request created.
 * All fields from the backend tool signature.
 *
 * Pattern: #12 (onSubmit, auto-focus, min-h-[44px]), #15 (showToast)
 */

import { useCallback, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Crown,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';

import { useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/components/ui/Toast';

import type { FormalityLevel, VenueType } from '../types';
import { FORMALITY_CONFIG, VENUE_CONFIG } from '../types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface GalaFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function GalaFormModal({ onClose, onSuccess }: GalaFormModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMCPMutation('cultural_social', 'organize_formal_gala');

  const [form, setForm] = useState({
    name: '',
    venue: 'Salón Principal',
    venue_type: 'ballroom' as VenueType,
    date: '',
    start_time: '19:00',
    end_time: '23:00',
    formality: 'black_tie' as FormalityLevel,
    organizer_member_id: 'mem-001',
    guest_count: 100,
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
        showToast({ type: 'error', message: 'Nombre de la gala es obligatorio' });
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
          name: form.name,
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
        showToast({ type: 'error', message: 'Error al enviar la gala a aprobación' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, mutation, onSuccess],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-gold-400)_15%,transparent)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-surface-3)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-gold-400)_12%,transparent)]">
              <Crown className="h-5 w-5 text-[var(--color-gold-400)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-silver-100)]">
                Organizar Gala Formal
              </h2>
              <p className="text-xs text-[var(--color-silver-500)]">
                Requiere aprobación del administrador
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="min-h-[44px]">
            ✕
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Nombre de la Gala *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Noche de Gala Invernal"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Venue + Venue Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <MapPin className="mr-1 inline h-3 w-3" />
                Lugar *
              </label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => updateField('venue', e.target.value)}
                placeholder="Ej: Salón Principal"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Tipo de Venue
              </label>
              <select
                value={form.venue_type}
                onChange={(e) => updateField('venue_type', e.target.value as VenueType)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              >
                {Object.entries(VENUE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Fecha *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Hora inicio
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Hora fin
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Formality + Guests + Budget */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Formalidad
              </label>
              <select
                value={form.formality}
                onChange={(e) => updateField('formality', e.target.value as FormalityLevel)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              >
                {Object.entries(FORMALITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
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
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
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
                step={100000}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Menu Theme + Dress Code */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Temática del menú
              </label>
              <input
                type="text"
                value={form.menu_theme}
                onChange={(e) => updateField('menu_theme', e.target.value)}
                placeholder="Ej: Cocina europea contemporánea"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Código de vestimenta
              </label>
              <input
                type="text"
                value={form.dress_code}
                onChange={(e) => updateField('dress_code', e.target.value)}
                placeholder="Ej: Etiqueta rigurosa — smoking o vestido largo"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)] min-h-[44px]"
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
              placeholder="Describe la gala: concepto, experiencia, highlights..."
              rows={3}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas para el equipo (no visibles para socios)"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-gold-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-400)]"
            />
          </div>

          {/* Risk Summary Preview */}
          {form.name && form.date && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-gold-400)_10%,transparent)] bg-[var(--color-surface-0)] px-4 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-silver-500)]">
                Resumen de aprobación
              </p>
              <p className="text-xs text-[var(--color-silver-300)]">
                🎭 Gala formal: <strong className="text-[var(--color-silver-100)]">{form.name}</strong>{' '}
                ({FORMALITY_CONFIG[form.formality]?.label}) en {form.venue} para {form.guest_count} invitados.
                Presupuesto: ₡{form.budget.toLocaleString('es-CR')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-[var(--color-surface-3)] pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px]"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="sage"
              size="sm"
              className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-gold-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-gold-400)_15%,transparent)] text-[var(--color-gold-400)] hover:bg-[color-mix(in_srgb,var(--color-gold-400)_25%,transparent)]"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              {submitting ? 'Enviando...' : 'Enviar a aprobación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
