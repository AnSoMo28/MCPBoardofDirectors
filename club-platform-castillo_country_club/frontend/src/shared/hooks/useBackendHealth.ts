/**
 * @hook useBackendHealth (Fase 25 — EXTRAÍDO)
 * @module shared/hooks
 * @note Reusable backend health check. Polls /api/health every 60s.
 *       Used by SettingsPage, could be used by AISystemPage, Navbar, etc.
 */

import { useState, useEffect } from "react";

export type BackendStatus = "checking" | "connected" | "error";

export function useBackendHealth(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health", {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled) {
          setStatus(res.ok ? "connected" : "error");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    check();
    const interval = setInterval(check, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}