/**
 * @component DocumentCardSkeleton (Fase 25)
 * @namespace .glass-docs__skeleton-*
 * @depends DocumentRepository.css, Skeleton from ui
 * @note Loading skeleton that mirrors DocumentCard structure.
 * @import import '../DocumentRepository.css';
 */

import { Skeleton } from "@/shared/components/ui";
import { Card } from "@/shared/components/ui/Card";

export function DocumentCardSkeleton() {
  return (
    <Card className="glass-docs__skeleton-card">
      <div className="glass-docs__skeleton-body">
        <div className="glass-docs__skeleton-row">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-1 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="w-14 h-5 rounded" />
          <Skeleton className="w-20 h-5 rounded" />
        </div>
        <div className="glass-docs__skeleton-row pt-3 border-t border-white/[0.06]">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}