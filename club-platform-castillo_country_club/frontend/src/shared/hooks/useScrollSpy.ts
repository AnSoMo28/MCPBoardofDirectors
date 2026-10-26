/**
 * @hook useScrollSpy (Fase 24)
 * @module shared/hooks
 * @exports useScrollSpy
 * @note IntersectionObserver-based scroll spy for document sections.
 *       Accepts a scrollable root element (not viewport) for fixed containers.
 */

import { useState, useEffect, useCallback } from "react";

interface ScrollSpyResult {
  activeId: string | null;
  scrollTo: (id: string) => void;
}

export function useScrollSpy(
  ids: string[],
  root: Element | null,
): ScrollSpyResult {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!root || ids.length === 0) return;

    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = root.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        {
          root,
          rootMargin: "-10% 0px -75% 0px",
          threshold: 0,
        },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids.join(","), root]);

  const scrollTo = useCallback(
    (id: string) => {
      const el = root?.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [root],
  );

  return { activeId, scrollTo };
}