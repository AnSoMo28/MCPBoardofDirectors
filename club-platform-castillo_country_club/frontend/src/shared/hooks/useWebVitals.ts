// src/shared/hooks/useWebVitals.ts
// ═══════════════════════════════════════════════════════════
// Web Vitals Monitoring — LCP, FID, CLS, TTFB
//
// Measures Core Web Vitals using PerformanceObserver.
// Logs to console in dev mode. Prepared for analytics
// endpoint in production.
//
// Mount once in App.tsx (inside the authenticated shell).
//
// Metrics:
//   LCP  (Largest Contentful Paint)  — < 2.5s good
//   FID  (First Input Delay)         — < 100ms good
//   CLS  (Cumulative Layout Shift)   — < 0.1 good
//   TTFB (Time to First Byte)        — < 800ms good
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

interface VitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP:  { good: 2500, poor: 4000 },
  FID:  { good: 100,  poor: 300 },
  CLS:  { good: 0.1,  poor: 0.25 },
  TTFB: { good: 800,  poor: 1800 },
};

function rateMetric(name: string, value: number): VitalMetric["rating"] {
  const t = THRESHOLDS[name];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function logVital(metric: VitalMetric) {
  const emoji = metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "❌";
  const unit = metric.name === "CLS" ? "" : "ms";
  console.info(
    `[Web Vitals] ${emoji} ${metric.name}: ${metric.value.toFixed(metric.name === "CLS" ? 3 : 0)}${unit} (${metric.rating})`,
  );
}

// Prepare for production analytics endpoint
function reportVital(_metric: VitalMetric) {
  // TODO: Send to analytics endpoint in production
  // fetch("/api/analytics/vitals", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(metric),
  // }).catch(() => {});
}

export function useWebVitals() {
  const reportedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // ── LCP ──
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (!lastEntry) return;
        const metric: VitalMetric = {
          name: "LCP",
          value: lastEntry.startTime,
          rating: rateMetric("LCP", lastEntry.startTime),
        };
        if (!reportedRef.current.has("LCP")) {
          reportedRef.current.add("LCP");
          logVital(metric);
          reportVital(metric);
        }
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // PerformanceObserver not supported for this entry type
    }

    // ── FID ──
    try {
      const fidObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const fidEntry = entry as PerformanceEntry & { processingStart: number };
          const value = fidEntry.processingStart - fidEntry.startTime;
          const metric: VitalMetric = {
            name: "FID",
            value,
            rating: rateMetric("FID", value),
          };
          if (!reportedRef.current.has("FID")) {
            reportedRef.current.add("FID");
            logVital(metric);
            reportVital(metric);
          }
        }
      });
      fidObs.observe({ type: "first-input", buffered: true });
    } catch {
      // Not supported
    }

    // ── CLS ──
    let clsValue = 0;
    try {
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shiftEntry.hadRecentInput && shiftEntry.value != null) {
            clsValue += shiftEntry.value;
          }
        }
      });
      clsObs.observe({ type: "layout-shift", buffered: true });

      // Report CLS on page hide (unload/visibility change)
      const reportCls = () => {
        if (!reportedRef.current.has("CLS")) {
          reportedRef.current.add("CLS");
          const metric: VitalMetric = {
            name: "CLS",
            value: clsValue,
            rating: rateMetric("CLS", clsValue),
          };
          logVital(metric);
          reportVital(metric);
        }
      };

      document.addEventListener("visibilitychange", reportCls, { once: true });
      window.addEventListener("beforeunload", reportCls, { once: true });

      return () => {
        document.removeEventListener("visibilitychange", reportCls);
        window.removeEventListener("beforeunload", reportCls);
      };
    } catch {
      // Not supported
    }

    // ── TTFB ──
    try {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0]!;
        const value = nav.responseStart - nav.requestStart;
        const metric: VitalMetric = {
          name: "TTFB",
          value,
          rating: rateMetric("TTFB", value),
        };
        logVital(metric);
        reportVital(metric);
      }
    } catch {
      // Not supported
    }
  }, []);
}
