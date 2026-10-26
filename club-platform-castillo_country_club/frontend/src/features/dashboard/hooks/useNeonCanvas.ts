/**
 * @hook useNeonCanvas (Fase 25)
 * @module features/dashboard/hooks
 * @note Canvas neon border engine. Handles:
 *       - 6-layer glow rendering (outer → core → white → tail)
 *       - 3 modes: travel (default), pulse, breathe
 *       - ResizeObserver for dynamic sizing
 *       - IntersectionObserver for off-screen pause (GPU savings)
 *       - FPS budget (configurable maxFps)
 *       - Aggressive sync during first N frames (layout settle)
 *       - Cleanup on unmount
 */

import { useEffect, useRef } from "react";
import {
  traceRoundedRect,
  rectPerimeter,
} from "@/shared/lib/canvas";
import {
  NEON_DEFAULTS,
  NEON_DRAW,
  type NeonConfig,
} from "../config/neon";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface UseNeonCanvasParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  color: string;
  config?: Partial<NeonConfig>;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useNeonCanvas({
  canvasRef,
  containerRef,
  color,
  config: overrides,
}: UseNeonCanvasParams) {
  const isVisible = useRef(true);
  const lastFrameTime = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ── Merge config ── */
    const cfg: NeonConfig = {
      ...NEON_DEFAULTS,
      ...overrides,
    };
    const {
      speed,
      thickness,
      glowSize,
      borderRadius,
      maxFps,
      mode,
    } = cfg;
    const {
      pad,
      baseIncrement,
      linePercent,
      tailLengthFactor,
      tailOffsetFactor,
      whiteCenterFactor,
      syncFrames,
    } = NEON_DRAW;

    const frameInterval = 1000 / maxFps;

    /* ── Resize sync ── */
    let cachedW = 0;
    let cachedH = 0;
    let syncCount = 0;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (
        w > 0 &&
        h > 0 &&
        (w !== cachedW || h !== cachedH)
      ) {
        cachedW = w;
        cachedH = h;
        canvas.width = w;
        canvas.height = h;
      }
    };

    const syncIfNeeded = () => {
      if (syncCount < syncFrames) {
        syncSize();
        syncCount++;
      }
    };

    syncSize();

    /* ── Observers ── */
    const ro = new ResizeObserver(() => syncSize());
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    /* ── Animation state ── */
    let t = 0;
    let fid = 0;

    /* ── Draw loop ── */
    const draw = (now: number) => {
      /* Visibility gate */
      if (!isVisible.current) {
        fid = requestAnimationFrame(draw);
        return;
      }

      /* FPS budget */
      if (now - lastFrameTime.current < frameInterval) {
        fid = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime.current = now;

      syncIfNeeded();

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        fid = requestAnimationFrame(draw);
        return;
      }

      const r = Math.min(borderRadius, w / 2, h / 2);
      const perimeter = rectPerimeter(w, h, r);
      const lineLen = perimeter * linePercent;

      t += baseIncrement * speed;
      const pos = (t * 100) % perimeter;

      /* Pulse factor: 0.3..1.0 sinusoidal */
      const pulseFactor =
        0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.5));

      ctx.clearRect(0, 0, w, h);

      /* Helper: begin rect path */
      const beginRect = (alpha: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        traceRoundedRect(
          ctx,
          pad,
          pad,
          w - pad * 2,
          h - pad * 2,
          r,
        );
      };

      /* ═══════════════════════════════════
         Layer 1: Dim static border
         ═══════════════════════════════════ */

      const layer1Alpha =
        mode === "breathe" ? 0.02 + 0.05 * pulseFactor : 0.05;

      beginRect(layer1Alpha);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      /* ═══════════════════════════════════
         Mode: TRAVEL — line traverses perimeter
         ═══════════════════════════════════ */

      if (mode === "travel") {
        /* Layer 2: Wide outer glow */
        beginRect(0.2);
        ctx.setLineDash([lineLen, perimeter - lineLen]);
        ctx.lineDashOffset = -pos;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness + 10;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 2;
        ctx.stroke();
        ctx.restore();

        /* Layer 3: Medium glow */
        beginRect(0.5);
        ctx.setLineDash([lineLen, perimeter - lineLen]);
        ctx.lineDashOffset = -pos;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness + 4;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize;
        ctx.stroke();
        ctx.restore();

        /* Layer 4: Bright core */
        beginRect(1);
        ctx.setLineDash([lineLen, perimeter - lineLen]);
        ctx.lineDashOffset = -pos;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 0.6;
        ctx.stroke();
        ctx.restore();

        /* Layer 5: Hot white center */
        beginRect(0.7);
        ctx.setLineDash([lineLen, perimeter - lineLen]);
        ctx.lineDashOffset = -pos;
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = thickness * whiteCenterFactor;
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "lighter";
        ctx.stroke();
        ctx.restore();

        /* Layer 6: Fading tail */
        const tailLen = lineLen * tailLengthFactor;
        beginRect(0.2);
        ctx.setLineDash([tailLen, perimeter - tailLen]);
        ctx.lineDashOffset = -(pos - lineLen * tailOffsetFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness * 0.5;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 0.4;
        ctx.stroke();
        ctx.restore();
      }

      /* ═══════════════════════════════════
         Mode: PULSE — full perimeter pulsing glow
         ═══════════════════════════════════ */

      if (mode === "pulse") {
        beginRect(0.15 * pulseFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness + 10;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 2.5;
        ctx.stroke();
        ctx.restore();

        beginRect(0.4 * pulseFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness + 4;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 1.2;
        ctx.stroke();
        ctx.restore();

        beginRect(0.8 * pulseFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 0.8;
        ctx.stroke();
        ctx.restore();

        beginRect(0.5 * pulseFactor);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = thickness * whiteCenterFactor;
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "lighter";
        ctx.stroke();
        ctx.restore();
      }

      /* ═══════════════════════════════════
         Mode: BREATHE — subtle edge breathing
         ═══════════════════════════════════ */

      if (mode === "breathe") {
        beginRect(0.06 + 0.12 * pulseFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness + 6;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 1.5;
        ctx.stroke();
        ctx.restore();

        beginRect(0.15 + 0.35 * pulseFactor);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize * 0.7;
        ctx.stroke();
        ctx.restore();

        beginRect(0.1 + 0.3 * pulseFactor);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = thickness * whiteCenterFactor;
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "lighter";
        ctx.stroke();
        ctx.restore();
      }

      fid = requestAnimationFrame(draw);
    };

    fid = requestAnimationFrame(draw);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(fid);
      ro.disconnect();
      io.disconnect();
    };
  }, [canvasRef, containerRef, color, overrides]);

  return {
    containerRef,
    canvasRef,
  };
}