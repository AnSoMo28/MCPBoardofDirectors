/**
 * ProgramFormModal — F31
 *
 * HITL modal for creating cultural programs.
 * Submits to manage_cultural_program action=create → approval request.
 *
 * Pattern: #12 (onSubmit, auto-focus, min-h-[44px]), #15 (showToast)
 */

import { useCallback, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Loader2, Music, Users } from 'lucide-react';

import { useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/components/ui/Toast';

import type { CulturalCategory } from '../types';
import './ProgramFormModal.css';
// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface ProgramFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS: { key: CulturalCategory; label: string; emoji: string }[] = [
  { key: 'music',        label: 'Música',          emoji: '🎵' },
  { key: 'visual_arts',  label: 'Artes Visuales',   emoji: '🎨' },
  { key: 'theater',      label: 'Teatro',           emoji: '🎭' },
  { key: 'dance',        label: 'Danza',            emoji: '💃' },
  { key: 'literature',   label: 'Literatura',       emoji: '📚' },
  { key: 'gastronomy',   label: 'Gastronomía',      emoji: '🍽️' },
  { key: 'heritage',     label: 'Patrimonio',       emoji: '🏛️' },
];

// Common CR seasons
const SEASON_OPTIONS = [
  'Verano 2025', 'Invierno 2025', 'Verano 2026', 'Invierno 2026',
  'Verano 2027', 'Invierno 2027', 'Todo el año',
];

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function ProgramFormModal({ onClose, onSuccess }: ProgramFormModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMCPMutation('cultural_social', 'manage_cultural_program');

  const [form, setForm] = useState({
    name: '',
    category: 'music' as CulturalCategory,
    description: '',
    season: 'Invierno 2026',
    start_date: '',
    end_date: '',
    coordinator_member_id: 'mem-001',
    max_participants: 20,
    budget: 0,
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
        showToast({ type: 'error', message: 'Nombre del programa es obligatorio' });
        nameRef.current?.focus();
        return;
      }
      if (!form.description.trim()) {
        showToast({ type: 'error', message: 'Descripción es obligatoria' });
        return;
      }
      if (!form.start_date || !form.end_date) {
        showToast({ type: 'error', message: 'Fechas de inicio y fin son obligatorias' });
        return;
      }

      setSubmitting(true);
      try {
        await mutation.mutateAsync({
          action: 'create',
          name: form.name,
          category: form.category,
          description: form.description,
          season: form.season,
          start_date: form.start_date,
          end_date: form.end_date,
          coordinator_member_id: form.coordinator_member_id,
          max_participants: form.max_participants,
          budget: form.budget,
          notes: form.notes,
        });
        onSuccess();
      } catch {
        showToast({ type: 'error', message: 'Error al enviar el programa a aprobación' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, mutation, onSuccess],
  );

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.key === form.category);

  return (
    <div className="program-form-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-teal-400)_15%,transparent)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-surface-3)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-teal-400)_12%,transparent)]">
              <Music className="h-5 w-5 text-[var(--color-teal-400)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-silver-100)]">
                Nuevo Programa Cultural
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
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Nombre del Programa *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Serie Jazz en el Jardín"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Category + Season */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Categoría *
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as CulturalCategory)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Temporada *
              </label>
              <select
                value={form.season}
                onChange={(e) => updateField('season', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              >
                {SEASON_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Descripción *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe el programa: concepto, frecuencia, experiencia..."
              rows={3}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)]"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Fecha inicio *
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Fecha fin *
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Participants + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <Users className="mr-1 inline h-3 w-3" />
                Máximo participantes
              </label>
              <input
                type="number"
                value={form.max_participants}
                onChange={(e) => updateField('max_participants', Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
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
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas para el equipo"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-teal-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-400)]"
            />
          </div>

          {/* Risk Preview */}
          {form.name && form.season && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-teal-400)_10%,transparent)] bg-[var(--color-surface-0)] px-4 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-silver-500)]">
                Resumen de aprobación
              </p>
              <p className="text-xs text-[var(--color-silver-300)]">
                🎵 Programa: <strong className="text-[var(--color-silver-100)]">{form.name}</strong>{' '}
                ({selectedCategory?.label}), temporada {form.season}.
                {form.max_participants > 0 && ` Máx. ${form.max_participants} participantes.`}
                {form.budget > 0 && ` Presupuesto: ₡${form.budget.toLocaleString('es-CR')}`}
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
              className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-teal-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-teal-400)_15%,transparent)] text-[var(--color-teal-400)] hover:bg-[color-mix(in_srgb,var(--color-teal-400)_25%,transparent)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
              {submitting ? 'Enviando...' : 'Enviar a aprobación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
