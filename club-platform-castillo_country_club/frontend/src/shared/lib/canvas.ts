/**
 * @module shared/lib/canvas (Fase 25)
 * @note Shared canvas utilities: rounded rect tracing, perimeter calculation.
 *       Used by NeonBorder, potentially by any future canvas component.
 */

/**
 * Traces a rounded rectangle path on a canvas context.
 * Handles clamping radius to prevent artifacts on small rects.
 */
export function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Calculates the true perimeter of a rounded rectangle,
 * accounting for corner radii (arcs, not chamfers).
 */
export function rectPerimeter(
  w: number,
  h: number,
  r: number,
): number {
  r = Math.min(r, w / 2, h / 2);
  return (
    2 * (w - 2 * r) +
    2 * (h - 2 * r) +
    Math.PI * 2 * r
  );
}