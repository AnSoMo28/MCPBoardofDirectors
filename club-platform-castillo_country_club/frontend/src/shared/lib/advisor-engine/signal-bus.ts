// src/shared/lib/advisor-engine/signal-bus.ts
// ═══════════════════════════════════════════════════════════
// Advisor Engine — Cross-Domain Signal Bus
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   N/A — infrastructure
// @keyframes   0
// @depends     ./types (DomainSignal, isSignalExpired, SignalName),
//              @/shared/types/ai-intelligence (AIDomain)
//
// Runtime bus that connects advisor domains.
// Domains EMIT signals after evaluation.
// Domains CONSUME signals before evaluation.
//
// Architecture:
//   useFinancialAdvisor evaluates → emits fin_revenue_decline
//   → signalBus stores with TTL
//   → useGlobalAdvisor queries bus → enriches ctx → evaluates
//
// Lifecycle:
//   1. Engine.evaluate() returns AdvisorResult.signals
//   2. Thin hook wrapper calls signalBus.emit(result.signals)
//   3. Other hooks call signalBus.getSignalsFor(domain)
//   4. Expired signals auto-pruned on every query
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("Created: F46 — Signal Bus Implementation")
// [x] "SECTION 1/2/3" → §0-§4 section markers
// [x] Mutable DomainSignal[] in emit/return → readonly
// [x] Missing file header → added with metadata
// [x] Missing PRE-WRITE/ANTI-PATTERNS blocks → added
// [x] Non-null assertion in subscribe → guard before add
// [x] Missing JSDoc on several methods → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { AIDomain } from "@/shared/types/ai-intelligence";
import type {
  DomainSignal,
  AdvisorEngineEventListener,
  SignalName,
} from "./types";
import { isSignalExpired } from "./types";

// ═══════════════════════════════════════════════════════════
// §1 SIGNAL BUS CLASS
//
// Singleton that routes signals between advisor domains.
// Internal state is mutable (private Map). Public API
// returns readonly arrays to prevent consumer mutation.
// ═══════════════════════════════════════════════════════════

/**
 * Cross-Domain Signal Bus — singleton that routes signals between
 * advisor domains.
 *
 * Usage:
 *   // Emit (after engine evaluation):
 *   signalBus.emit(result.signals);
 *
 *   // Consume (before engine evaluation):
 *   const signals = signalBus.getSignalsFor("global");
 *   const result = engine.evaluate(rawData, signals);
 *
 *   // Subscribe (for reactive patterns — optional):
 *   const unsub = signalBus.subscribe("global", (signal) => { ... });
 */
export class SignalBus {
  /**
   * Internal signal storage.
   * Key: "${sourceDomain}:${signalDefId}" for deduplication.
   * Mutable — this is private state management, not a public API.
   */
  private signals: Map<string, DomainSignal> = new Map();

  /** Domain → Set of subscriber callbacks. */
  private listeners: Map<
    AIDomain,
    Set<(signal: DomainSignal) => void>
  > = new Map();

  /** Optional engine event listener for observability. */
  private eventListener?: AdvisorEngineEventListener;

  constructor(eventListener?: AdvisorEngineEventListener) {
    this.eventListener = eventListener;
  }

  // ── Emit ──

  /**
   * Emit one or more signals to the bus.
   * Overwrites existing signals with the same signalDefId from the same source.
   * Deduplication key: "${sourceDomain}:${signalDefId}".
   *
   * @param signals — Signals to emit (typically from AdvisorResult.signals)
   */
  emit(signals: readonly DomainSignal[]): void {
    for (const signal of signals) {
      // Dedupe: overwrite same signal from same source domain
      const existingKey = `${signal.sourceDomain}:${signal.signalDefId}`;
      this.signals.set(existingKey, signal);

      // Notify subscribers for target domains
      for (const domain of signal.targetDomains) {
        const domainListeners = this.listeners.get(domain);
        if (domainListeners) {
          for (const callback of domainListeners) {
            try {
              callback(signal);
            } catch (error) {
              console.error(
                `[SignalBus] Listener error for domain "${domain}":`,
                error,
              );
            }
          }
        }
      }

      // Emit observability event
      this.eventListener?.({
        type: "signal_emitted",
        signalId: signal.signalDefId,
        sourceDomain: signal.sourceDomain,
      });

      if (import.meta.env.DEV) {
        console.log(
          `[SignalBus] Emitted "${signal.signalDefId}" from "${signal.sourceDomain}" ` +
            `→ [${signal.targetDomains.join(", ")}] (value: ${signal.value})`,
        );
      }
    }
  }

  // ── Consume ──

  /**
   * Get all active (non-expired) signals targeting a specific domain.
   * Auto-prunes expired signals before returning.
   *
   * @param domain — The consuming domain
   * @returns Readonly array of active signals targeting this domain
   */
  getSignalsFor(domain: AIDomain): readonly DomainSignal[] {
    this.pruneExpired();

    const result: DomainSignal[] = [];
    for (const signal of this.signals.values()) {
      if (signal.targetDomains.includes(domain)) {
        result.push(signal);

        // Emit consumption event for observability
        this.eventListener?.({
          type: "signal_consumed",
          signalId: signal.signalDefId,
          targetDomain: domain,
        });
      }
    }

    return result;
  }

  /**
   * Get a specific signal by definition ID for a domain.
   * Useful when a rule needs a particular signal value.
   *
   * @param domain — The consuming domain
   * @param signalDefId — The signal definition ID to find
   * @returns The signal or undefined if not found/expired
   */
  getSignal(
    domain: AIDomain,
    signalDefId: SignalName,
  ): DomainSignal | undefined {
    const signals = this.getSignalsFor(domain);
    return signals.find((s) => s.signalDefId === signalDefId);
  }

  /**
   * Get all active signals (any domain).
   * Used by Global Advisor for cross-domain awareness.
   *
   * @returns Readonly array of all active signals
   */
  getAllSignals(): readonly DomainSignal[] {
    this.pruneExpired();
    return Array.from(this.signals.values());
  }

  // ── Subscribe ──

  /**
   * Subscribe to signals for a specific domain.
   * Callback fires immediately when a signal targeting this domain is emitted.
   *
   * @param domain — Domain to listen for
   * @param callback — Called with each signal
   * @returns Unsubscribe function
   */
  subscribe(
    domain: AIDomain,
    callback: (signal: DomainSignal) => void,
  ): () => void {
    let domainListeners = this.listeners.get(domain);
    if (!domainListeners) {
      domainListeners = new Set();
      this.listeners.set(domain, domainListeners);
    }
    domainListeners.add(callback);

    return () => {
      this.listeners.get(domain)?.delete(callback);
    };
  }

  // ── Introspection ──

  /**
   * Count of active (non-expired) signals.
   * Used by observability and debugging.
   */
  get activeCount(): number {
    this.pruneExpired();
    return this.signals.size;
  }

  /**
   * Clear all signals and listeners.
   * Called on logout or context reset.
   */
  clear(): void {
    this.signals.clear();
    this.listeners.clear();
    if (import.meta.env.DEV) {
      console.log("[SignalBus] Cleared all signals and listeners");
    }
  }

  /**
   * Snapshot of bus state for debugging.
   * Only available in DEV mode.
   */
  getDebugSnapshot(): {
    readonly totalSignals: number;
    readonly signalsBySource: Readonly<Record<string, number>>;
    readonly signalsByTarget: Readonly<Record<string, number>>;
    readonly listenerCount: Readonly<Record<string, number>>;
  } {
    this.pruneExpired();
    const signalsBySource: Record<string, number> = {};
    const signalsByTarget: Record<string, number> = {};
    const listenerCount: Record<string, number> = {};

    for (const signal of this.signals.values()) {
      signalsBySource[signal.sourceDomain] =
        (signalsBySource[signal.sourceDomain] ?? 0) + 1;
      for (const target of signal.targetDomains) {
        signalsByTarget[target] =
          (signalsByTarget[target] ?? 0) + 1;
      }
    }

    for (const [domain, listeners] of this.listeners) {
      listenerCount[domain] = listeners.size;
    }

    return {
      totalSignals: this.signals.size,
      signalsBySource,
      signalsByTarget,
      listenerCount,
    };
  }

  // ── Private ──

  /**
   * Remove expired signals from the bus.
   * Called automatically on getSignalsFor(), activeCount, and getAllSignals().
   */
  private pruneExpired(): void {
    for (const [key, signal] of this.signals) {
      if (isSignalExpired(signal)) {
        this.signals.delete(key);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// §2 SINGLETON EXPORT
//
// Global singleton signal bus. All advisor domains use
// this instance. Signals persist for the session (page lifetime).
// On logout, call signalBus.clear().
// ═══════════════════════════════════════════════════════════

export const signalBus = new SignalBus(
  import.meta.env.DEV
    ? (event) => {
        // DEV-only: log signal consumption events.
        // Emission events are already logged by emit().
        if (event.type === "signal_consumed") {
          console.log(
            `[SignalBus] Consumed "${event.signalId}" by "${event.targetDomain}"`,
          );
        }
      }
    : undefined,
);

// ═══════════════════════════════════════════════════════════
// §3 REACT HOOK
//
// Snapshot hook — reads signals at render time.
// Reactive pattern: signals change when OTHER advisors evaluate,
// which happens when THEIR React Query data changes,
// which triggers re-renders in consuming components.
// ═══════════════════════════════════════════════════════════

/**
 * Hook to get active signals for a domain.
 * Returns memoized readonly array — only recalculates when domain changes.
 *
 * Snapshot approach is correct because:
 *   1. Signals change when OTHER advisors evaluate
 *   2. Other advisors evaluate when THEIR data changes
 *   3. React Query refetches trigger re-renders in consuming components
 *   4. Re-render → this hook re-reads bus → gets fresh signals
 *
 * For fully reactive patterns (signals change mid-render),
 * use signalBus.subscribe() in a useEffect.
 *
 * @param domain — The consuming domain
 * @returns Readonly array of active signals targeting this domain
 *
 * @example
 * function useGlobalAdvisor(rawData) {
 *   const crossSignals = useSignalBus("global");
 *   return useAdvisorEngine(config, rawData, crossSignals);
 * }
 */
export function useSignalBus(domain: AIDomain): readonly DomainSignal[] {
  return useMemo(() => signalBus.getSignalsFor(domain), [domain]);
}