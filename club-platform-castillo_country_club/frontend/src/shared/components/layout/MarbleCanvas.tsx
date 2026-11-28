// src/shared/components/layout/MarbleCanvas.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — Sidebar marble (Canvas 2D, port exacto de Claude)
//
// Las vetas son curvas Bézier quadráticas cuyos puntos de
// control se desplazan con sin(t*.35+i*.9)*2.6 cada frame.
// t += 0.007 → movimiento orgánico extremadamente lento.
// Ancho oscila con sin(t*.55). Glow ambiental con blur(9px).
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import './MarbleCanvas.css';

interface Vein {
  col: string;
  w: number;
  a: number;
  pts: number[][];
}

const VEINS: Vein[] = [
  { col: "#c9a96e", w: 1.5, a: 0.92, pts: [[.14,0],[.28,.14],[.16,.28],[.38,.43],[.22,.58],[.45,.73],[.30,.88],[.42,1]] },
  { col: "#f0d9a8", w: 0.85, a: 0.68, pts: [[.74,0],[.58,.13],[.80,.27],[.62,.42],[.84,.57],[.66,.71],[.82,.87],[.72,1]] },
  { col: "#b87c4a", w: 0.65, a: 0.52, pts: [[.44,0],[.29,.17],[.52,.33],[.37,.50],[.55,.65],[.39,.81],[.57,.95],[.50,1]] },
  { col: "#e8c882", w: 1.0, a: 0.72, pts: [[.89,0],[.73,.21],[.91,.39],[.71,.55],[.89,.70],[.69,.85],[.86,1]] },
  { col: "#c9a96e", w: 0.45, a: 0.38, pts: [[.06,.08],[.24,.24],[.09,.44],[.27,.61],[.11,.79],[.23,1]] },
  { col: "#f0d9a8", w: 0.40, a: 0.26, pts: [[.60,0],[.76,.19],[.59,.37],[.73,.55],[.56,.72],[.69,.89],[.63,1]] },
];

const GLOWS = [
  { bx: 0.20, by: 0.22, br: 180, ba: 0.065 },
  { bx: 0.82, by: 0.58, br: 160, ba: 0.055 },
  { bx: 0.40, by: 0.82, br: 140, ba: 0.045 },
];

export default function MarbleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const p = cvs.parentElement;
      if (!p) return;
      const r = p.getBoundingClientRect();
      cvs.width = Math.round(r.width) || 280;
      cvs.height = Math.round(r.height) || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    let fid = 0;

    const rgba = (hex: string, a: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    };

    const drawVein = (v: Vein, W: number, H: number) => {
      ctx.beginPath();
      ctx.moveTo(v.pts[0][0] * W + Math.sin(t * 0.38) * 2.8, v.pts[0][1] * H);
      for (let i = 0; i < v.pts.length - 1; i++) {
        const p1x = v.pts[i][0] * W + Math.sin(t * 0.35 + i * 0.9) * 2.6;
        const p1y = v.pts[i][1] * H;
        const p2x = v.pts[i + 1][0] * W + Math.sin(t * 0.35 + (i + 1) * 0.9) * 2.6;
        const p2y = v.pts[i + 1][1] * H;
        ctx.quadraticCurveTo(p1x, p1y, (p1x + p2x) / 2, (p1y + p2y) / 2);
      }
      const last = v.pts[v.pts.length - 1];
      ctx.lineTo(last[0] * W, last[1] * H);

      const gy = ctx.createLinearGradient(0, 0, 0, H);
      gy.addColorStop(0, rgba(v.col, 0));
      gy.addColorStop(0.10, rgba(v.col, v.a));
      gy.addColorStop(0.50, rgba(v.col, v.a * 0.88));
      gy.addColorStop(0.90, rgba(v.col, v.a));
      gy.addColorStop(1, rgba(v.col, 0));
      ctx.strokeStyle = gy;
      ctx.lineWidth = v.w + 0.5 * Math.sin(t * 0.55);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    const render = () => {
      const W = cvs.width;
      const H = cvs.height;
      t += 0.007;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0c1018");
      bg.addColorStop(0.38, "#10161e");
      bg.addColorStop(0.65, "#0d1420");
      bg.addColorStop(1, "#08101a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Radial glows
      GLOWS.forEach((g) => {
        const gr = ctx.createRadialGradient(g.bx * W, g.by * H, 8, g.bx * W, g.by * H, g.br);
        gr.addColorStop(0, `rgba(28,38,56,${(g.ba + 0.02 * Math.sin(t * 0.28)).toFixed(4)})`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      });

      // Gold veins
      VEINS.forEach((v) => drawVein(v, W, H));

      // Ambient glow — blurred golden bezier
      ctx.save();
      ctx.globalAlpha = 0.07 + 0.025 * Math.sin(t * 0.4);
      ctx.filter = "blur(9px)";
      ctx.beginPath();
      ctx.moveTo(0.14 * W, 0);
      ctx.bezierCurveTo(0.32 * W, 0.22 * H, 0.18 * W, 0.48 * H, 0.45 * W, 0.70 * H);
      ctx.bezierCurveTo(0.58 * W, 0.82 * H, 0.42 * W, 0.92 * H, 0.42 * W, H);
      ctx.strokeStyle = "#c9a96e";
      ctx.lineWidth = 24;
      ctx.stroke();
      ctx.restore();

      fid = requestAnimationFrame(render);
    };

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(fid);
      else render();
    };
    document.addEventListener("visibilitychange", onVis);
    render();

    return () => {
      cancelAnimationFrame(fid);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="marble-canvas absolute inset-0 w-full h-full block"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
