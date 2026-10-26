/**
 * @component BoardReportSkeleton (Fase 25)
 * @namespace .glass-board (reuses glass classes for skeleton shape)
 * @depends BoardReportViewer.css, Skeleton from ui
 * @note Loading skeleton that mirrors the report structure.
 * @import import '../BoardReportViewer.css';
 */

import { Skeleton } from "@/shared/components/ui";

export function BoardReportSkeleton() {
  return (
    <div className="space-y-8" aria-label="Cargando reporte" role="status">
      {/* Period bar skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="w-16 h-8" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-9 rounded-lg" />
        ))}
      </div>

      {/* Header skeleton */}
      <div className="glass-board__header" style={{ padding: 20 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="w-64 h-7" />
            <Skeleton className="w-80 h-4" />
          </div>
          <Skeleton className="w-44 h-9 rounded-lg" />
        </div>
      </div>

      {/* Summary skeleton */}
      <div className="glass-board__summary" style={{ padding: 20 }}>
        <Skeleton className="w-48 h-6 mb-4" />
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-3/4 h-4" />
      </div>

      {/* KPI grid skeleton */}
      <div className="glass-board__kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-board__kpi" style={{ padding: 16 }}>
            <Skeleton className="w-9 h-9 rounded-lg mb-3" />
            <Skeleton className="w-24 h-3 mb-2" />
            <Skeleton className="w-20 h-7" />
          </div>
        ))}
      </div>

      {/* Section skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-board__section" style={{ padding: 20 }}>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-48 h-5" />
          </div>
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      ))}
    </div>
  );
}