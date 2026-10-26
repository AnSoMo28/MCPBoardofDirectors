const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createFocusTrap(container: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const els = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (els.length === 0) {
      e.preventDefault();
      return;
    }

    const first = els[0];
    const last = els[els.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener("keydown", onKey);

  const raf = requestAnimationFrame(() => {
    const first = container.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  });

  return () => {
    cancelAnimationFrame(raf);
    container.removeEventListener("keydown", onKey);
  };
}
