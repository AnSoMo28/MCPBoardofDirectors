// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Signal Bus Tests
//
// Verifies cross-domain signal routing, TTL, auto-pruning.
//
// Run: pnpm test signals.test
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignalBus } from "../signal-bus";
import type { DomainSignal } from "../types";

// ── Helpers ──

function createSignal(
  signalDefId: string,
  sourceDomain: string,
  targetDomains: string[],
  opts?: { ttl?: number; value?: number; timestamp?: number },
): DomainSignal {
  return {
    id: `signal_${signalDefId}_${Date.now()}`,
    signalDefId: signalDefId as DomainSignal["signalDefId"],
    sourceDomain: sourceDomain as DomainSignal["sourceDomain"],
    targetDomains: targetDomains as DomainSignal["targetDomains"],
    severity: "high",
    value: opts?.value ?? 10,
    label: `Test signal ${signalDefId}`,
    timestamp: opts?.timestamp ?? Date.now(),
    ttl: opts?.ttl ?? 300_000,
  };
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe("SignalBus", () => {
  let bus: SignalBus;

  beforeEach(() => {
    bus = new SignalBus();
  });

  describe("emit + getSignalsFor", () => {
    it("emits and retrieves signals for target domain", () => {
      const signal = createSignal("fin_revenue_decline", "financial", ["global"]);
      bus.emit([signal]);

      const signals = bus.getSignalsFor("global" as DomainSignal["targetDomains"][number]);
      expect(signals).toHaveLength(1);
      expect(signals[0].signalDefId).toBe("fin_revenue_decline");
    });

    it("does not return signals for non-target domain", () => {
      const signal = createSignal("fin_revenue_decline", "financial", ["global"]);
      bus.emit([signal]);

      const signals = bus.getSignalsFor("events" as DomainSignal["targetDomains"][number]);
      expect(signals).toHaveLength(0);
    });

    it("emits multiple signals", () => {
      const signals = [
        createSignal("fin_revenue_decline", "financial", ["global"]),
        createSignal("evt_capacity_alert", "events", ["global"]),
      ];
      bus.emit(signals);

      const result = bus.getSignalsFor("global" as DomainSignal["targetDomains"][number]);
      expect(result).toHaveLength(2);
    });

    it("overwrites same signal from same source (dedupe)", () => {
      const signal1 = createSignal("fin_revenue_decline", "financial", ["global"], { value: 10 });
      const signal2 = createSignal("fin_revenue_decline", "financial", ["global"], { value: 20 });

      bus.emit([signal1]);
      bus.emit([signal2]);

      const result = bus.getSignalsFor("global" as DomainSignal["targetDomains"][number]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(20); // Latest value
    });
  });

  describe("getSignal", () => {
    it("finds a specific signal by definition ID", () => {
      bus.emit([
        createSignal("fin_revenue_decline", "financial", ["global"]),
        createSignal("evt_capacity_alert", "events", ["global"]),
      ]);

      const signal = bus.getSignal(
        "global" as DomainSignal["targetDomains"][number],
        "evt_capacity_alert",
      );
      expect(signal).toBeDefined();
      expect(signal!.signalDefId).toBe("evt_capacity_alert");
    });

    it("returns undefined for non-existent signal", () => {
      const signal = bus.getSignal(
        "global" as DomainSignal["targetDomains"][number],
        "non_existent" as DomainSignal["signalDefId"],
      );
      expect(signal).toBeUndefined();
    });
  });

  describe("TTL auto-pruning", () => {
    it("removes expired signals", () => {
      const expired = createSignal("old_signal", "financial", ["global"], {
        ttl: 1000,
        timestamp: Date.now() - 2000, // 2 seconds ago, TTL 1 second
      });
      bus.emit([expired]);

      const result = bus.getSignalsFor("global" as DomainSignal["targetDomains"][number]);
      expect(result).toHaveLength(0);
    });

    it("keeps non-expired signals", () => {
      const fresh = createSignal("fresh_signal", "financial", ["global"], {
        ttl: 300_000, // 5 min
        timestamp: Date.now(),
      });
      bus.emit([fresh]);

      const result = bus.getSignalsFor("global" as DomainSignal["targetDomains"][number]);
      expect(result).toHaveLength(1);
    });
  });

  describe("subscribe", () => {
    it("notifies subscribers when signal is emitted", () => {
      const callback = vi.fn();
      bus.subscribe("global" as DomainSignal["targetDomains"][number], callback);

      const signal = createSignal("fin_revenue_decline", "financial", ["global"]);
      bus.emit([signal]);

      expect(callback).toHaveBeenCalledWith(signal);
    });

    it("unsubscribes correctly", () => {
      const callback = vi.fn();
      const unsub = bus.subscribe(
        "global" as DomainSignal["targetDomains"][number],
        callback,
      );
      unsub();

      const signal = createSignal("fin_revenue_decline", "financial", ["global"]);
      bus.emit([signal]);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("removes all signals", () => {
      bus.emit([
        createSignal("s1", "financial", ["global"]),
        createSignal("s2", "events", ["global"]),
      ]);
      bus.clear();

      expect(bus.activeCount).toBe(0);
    });
  });

  describe("getAllSignals", () => {
    it("returns all signals regardless of target domain", () => {
      bus.emit([
        createSignal("s1", "financial", ["global"]),
        createSignal("s2", "events", ["communication"]),
      ]);

      const all = bus.getAllSignals();
      expect(all).toHaveLength(2);
    });
  });

  describe("activeCount", () => {
    it("counts only non-expired signals", () => {
      bus.emit([
        createSignal("fresh", "financial", ["global"], { ttl: 300_000 }),
        createSignal("expired", "events", ["global"], { ttl: 1000, timestamp: Date.now() - 2000 }),
      ]);

      expect(bus.activeCount).toBe(1);
    });
  });
});