// src/shared/components/error/NotFoundPage.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — 404 Not Found
// ═══════════════════════════════════════════════════════════

import { useNavigate } from "react-router";
import { MapPin, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-[var(--color-abyss)] px-6">
      {/* Decorative number */}
      <div className="relative mb-8">
        <span className="font-[family-name:var(--font-display)] text-[120px] md:text-[160px] font-bold leading-none text-[var(--color-surface-3)] select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-12 h-12 text-[var(--color-gold-400)]" />
        </div>
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--color-silver-100)] mb-3">
        Página no encontrada
      </h2>

      <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] max-w-md mb-8 leading-relaxed">
        La página que buscás no existe o fue movida. Verificá la URL o navegá de vuelta al inicio.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border border-white/[0.08] text-sm font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-300)] hover:border-white/[0.14] hover:text-[var(--color-silver-200)] transition-all min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <button
          onClick={() => navigate("/admin/dashboard")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-gold-400)] text-[var(--color-abyss)] text-sm font-bold font-[family-name:var(--font-ui)] hover:brightness-110 active:scale-[0.98] transition-all min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
