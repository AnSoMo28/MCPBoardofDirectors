/**
 * ExhibitionFormModal — F31
 *
 * AUTO modal for creating art exhibitions.
 * No approval needed — creates immediately.
 *
 * Pattern: #12 (onSubmit, auto-focus, min-h-[44px]), #15 (showToast)
 */

import { useCallback, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Frame, Image, Loader2, MapPin, Sparkles } from 'lucide-react';

import { useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/components/ui/Toast';

import type { CulturalCategory, VenueType } from '../types';
import { VENUE_CONFIG } from '../types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface ExhibitionFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS: { key: CulturalCategory; label: string; emoji: string }[] = [
  { key: 'visual_arts',  label: 'Artes Visuales', emoji: '🎨' },
  { key: 'music',        label: 'Música',         emoji: '🎵' },
  { key: 'theater',      label: 'Teatro',          emoji: '🎭' },
  { key: 'dance',        label: 'Danza',           emoji: '💃' },
  { key: 'literature',   label: 'Literatura',      emoji: '📚' },
  { key: 'gastronomy',   label: 'Gastronomía',     emoji: '🍽️' },
  { key: 'heritage',     label: 'Patrimonio',      emoji: '🏛️' },
];

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function ExhibitionFormModal({ onClose, onSuccess }: ExhibitionFormModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMCPMutation('cultural_social', 'manage_art_exhibitions');

  const [form, setForm] = useState({
    title: '',
    artist_name: '',
    category: 'visual_arts' as CulturalCategory,
    description: '',
    venue: 'Lounge del Club',
    venue_type: 'lounge' as VenueType,
    start_date: '',
    end_date: '',
    num_pieces: 0,
    curator_member_id: '',
    opening_reception: false,
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

      if (!form.title.trim()) {
        showToast({ type: 'error', message: 'Título de la exposición es obligatorio' });
        titleRef.current?.focus();
        return;
      }
      if (!form.artist_name.trim()) {
        showToast({ type: 'error', message: 'Nombre del artista es obligatorio' });
        return;
      }
      if (!form.start_date || !form.end_date) {
        showToast({ type: 'error', message: 'Fechas son obligatorias' });
        return;
      }

      setSubmitting(true);
      try {
        await mutation.mutateAsync({
          action: 'create',
          title: form.title,
          artist_name: form.artist_name,
          category: form.category,
          description: form.description,
          venue: form.venue,
          venue_type: form.venue_type,
          start_date: form.start_date,
          end_date: form.end_date,
          num_pieces: form.num_pieces,
          curator_member_id: form.curator_member_id,
          opening_reception: form.opening_reception,
          notes: form.notes,
        });
        onSuccess();
      } catch {
        showToast({ type: 'error', message: 'Error creando la exposición' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, mutation, onSuccess],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-sage-400)_15%,transparent)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-surface-3)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-sage-400)_12%,transparent)]">
              <Sparkles className="h-5 w-5 text-[var(--color-sage-400)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-silver-100)]">
                Nueva Exposición
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
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Título de la Exposición *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ej: Colores de Costa Rica"
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Artist + Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Artista *
              </label>
              <input
                type="text"
                value={form.artist_name}
                onChange={(e) => updateField('artist_name', e.target.value)}
                placeholder="Nombre del artista"
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as CulturalCategory)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
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
              placeholder="Describe la exposición: tema, técnica, inspiración..."
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)]"
            />
          </div>

          {/* Venue + Pieces */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <MapPin className="mr-1 inline h-3 w-3" />
                Lugar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => updateField('venue', e.target.value)}
                  placeholder="Lugar"
                  className="rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
                />
                <select
                  value={form.venue_type}
                  onChange={(e) => updateField('venue_type', e.target.value as VenueType)}
                  className="rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
                >
                  {Object.entries(VENUE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <Frame className="mr-1 inline h-3 w-3" />
                Número de piezas
              </label>
              <input
                type="number"
                value={form.num_pieces}
                onChange={(e) => updateField('num_pieces', Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Inicio *
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
                <CalendarIcon className="mr-1 inline h-3 w-3" />
                Fin *
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)] min-h-[44px]"
              />
            </div>
          </div>

          {/* Opening Reception Toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-4 py-3 transition-all hover:bg-[var(--color-surface-3)]">
            <input
              type="checkbox"
              checked={form.opening_reception}
              onChange={(e) => updateField('opening_reception', e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-sage-400)]"
            />
            <div>
              <p className="text-sm text-[var(--color-silver-200)]">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[var(--color-gold-400)]" />
                Recepción de apertura
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)]">
                Evento inaugural con invitación a socios
              </p>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-silver-300)]">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Logística, requerimientos especiales..."
              rows={2}
              className="w-full rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-silver-100)] placeholder:text-[var(--color-silver-500)] focus:border-[var(--color-sage-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-400)]"
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
              className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-sage-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-sage-400)_15%,transparent)] text-[var(--color-sage-400)] hover:bg-[color-mix(in_srgb,var(--color-sage-400)_25%,transparent)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {submitting ? 'Creando...' : 'Crear Exposición'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
