/**
 * EntertainmentFormModal — F31
 *
 * HITL modal for hiring entertainment acts (artists, DJs, bands).
 * Submits to manage_entertainment_acts action=create → approval request.
 *
 * Pattern: #12 (onSubmit, auto-focus, min-h-[44px]), #15 (showToast)
 */

import { useCallback, useRef, useState } from 'react';
import { Loader2, Mic, Music, Phone, User } from 'lucide-react';

import { useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/components/ui/Toast';

import type { EntertainmentType } from '../types';
import './EntertainmentFormModal.css';
// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface EntertainmentFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ENTERTAINMENT_OPTIONS: { key: EntertainmentType; label: string; emoji: string }[] = [
  { key: 'live_band',            label: 'Banda en Vivo',           emoji: '🎸' },
  { key: 'dj',                   label: 'DJ',                      emoji: '🎧' },
  { key: 'comedian',             label: 'Comediante',              emoji: '😂' },
  { key: 'magician',             label: 'Mago',                    emoji: '🎩' },
  { key: 'speaker',              label: 'Orador',                  emoji: '🎤' },
  { key: 'cultural_performance', label: 'Performance Cultural',    emoji: '🎭' },
  { key: 'dance_performance',    label: 'Performance de Danza',    emoji: '💃' },
];

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function EntertainmentFormModal({ onClose, onSuccess }: EntertainmentFormModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMCPMutation('cultural_social', 'manage_entertainment_acts');

  const [form, setForm] = useState({
    artist_name: '',
    entertainment_type: 'live_band' as EntertainmentType,
    genre: '',
    description: '',
    duration_minutes: 120,
    cost: 0,
    contact_person: '',
    contact_phone: '',
    requirements: '',
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

      if (!form.artist_name.trim()) {
        showToast({ type: 'error', message: 'Nombre del artista es obligatorio' });
        nameRef.current?.focus();
        return;
      }
      if (!form.contact_person.trim()) {
        showToast({ type: 'error', message: 'Persona de contacto es obligatoria' });
        return;
      }

      setSubmitting(true);
      try {
        await mutation.mutateAsync({
          action: 'create',
          artist_name: form.artist_name,
          entertainment_type: form.entertainment_type,
          genre: form.genre,
          description: form.description,
          duration_minutes: form.duration_minutes,
          cost: form.cost,
          contact_person: form.contact_person,
          contact_phone: form.contact_phone,
          requirements: form.requirements
            ? form.requirements.split(',').map((r) => r.trim()).filter(Boolean)
            : [],
          notes: form.notes,
        });
        onSuccess();
      } catch {
        showToast({ type: 'error', message: 'Error al registrar el artista' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, mutation, onSuccess],
  );

  const selectedType = ENTERTAINMENT_OPTIONS.find((t) => t.key === form.entertainment_type);

  return (
    <div className="entertainment-form-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-emerald-400)_15%,transparent)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-surface-3)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-emerald-400)_12%,transparent)]">
              <Mic className="h-5 w-5 text-[var(--color-emerald-400)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-silver-100)]">
                Contratar Artista
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
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Artist Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              <User className="mr-1 inline h-3 w-3" />
              Nombre del Artista / Grupo *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.artist_name}
              onChange={(e) => updateField('artist_name', e.target.value)}
              placeholder="Ej: Los Soneros de Pacífico"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Type + Genre */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <Music className="mr-1 inline h-3 w-3" />
                Tipo *
              </label>
              <select
                value={form.entertainment_type}
                onChange={(e) => updateField('entertainment_type', e.target.value as EntertainmentType)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              >
                {ENTERTAINMENT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Género / Estilo
              </label>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => updateField('genre', e.target.value)}
                placeholder="Ej: Salsa, Jazz, Electronic"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
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
              placeholder="Describe al artista o grupo: experiencia, estilo, eventos previos..."
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)]"
            />
          </div>

          {/* Duration + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Duración (minutos)
              </label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => updateField('duration_minutes', Number(e.target.value))}
                min={15}
                step={15}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Costo (₡)
              </label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => updateField('cost', Number(e.target.value))}
                min={0}
                step={50000}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <User className="mr-1 inline h-3 w-3" />
                Persona de contacto *
              </label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => updateField('contact_person', e.target.value)}
                placeholder="Nombre del contacto"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <Phone className="mr-1 inline h-3 w-3" />
                Teléfono
              </label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                placeholder="8888-1234"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Requerimientos técnicos
            </label>
            <input
              type="text"
              value={form.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
              placeholder="Separados por coma: Escenario 4x3m, Sonido propio, Iluminación LED"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)] min-h-[44px]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas internas sobre el artista o la contratación"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-emerald-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-emerald-400)]"
            />
          </div>

          {/* Risk Preview */}
          {form.artist_name && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-emerald-400)_10%,transparent)] bg-[var(--color-surface-0)] px-4 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-silver-500)]">
                Resumen de aprobación
              </p>
              <p className="text-xs text-[var(--color-silver-300)]">
                🎸 Contratación de artista: <strong className="text-[var(--color-silver-100)]">{form.artist_name}</strong>{' '}
                ({selectedType?.label}).{form.cost > 0 && ` Costo: ₡${form.cost.toLocaleString('es-CR')}`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-[var(--color-surface-3)] pt-4">
            <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="sage"
              size="sm"
              className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-emerald-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-emerald-400)_15%,transparent)] text-[var(--color-emerald-400)] hover:bg-[color-mix(in_srgb,var(--color-emerald-400)_25%,transparent)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {submitting ? 'Enviando...' : 'Enviar a aprobación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
