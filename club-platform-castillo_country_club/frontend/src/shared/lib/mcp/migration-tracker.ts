// src/shared/lib/mcp/migration-tracker.ts
// ═══════════════════════════════════════════════════════════
// MCP Migration Tracker — Auto-detect Mock vs Real
//
// Tracks which tools are using backend vs mock data.
// Auto-promotes tools through migration stages based on
// real usage patterns.
//
// Stages:
//   mock-only → backend-available → backend-primary → fully-migrated
//
// Singleton: import { migrationTracker } from "./migration-tracker"
//
// Created: F45 — Architecture Consolidation
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// SECTION 1 — TYPES
// ═══════════════════════════════════════════════════════════

export type MigrationStage =
  | "mock-only"
  | "backend-available"
  | "backend-primary"
  | "fully-migrated";

export interface ToolMigrationStatus {
  server: string;
  tool: string;
  status: MigrationStage;
  backendSuccessCount: number;
  backendFailCount: number;
  mockUseCount: number;
  lastBackendSuccess: number;
  lastBackendFail: number;
  lastMockUse: number;
  firstSeen: number;
  failureRate: number;
}

export interface MigrationReport {
  total: number;
  mockOnly: number;
  backendAvailable: number;
  backendPrimary: number;
  fullyMigrated: number;
  backendCallPercent: number;
  backendToolPercent: number;
  tools: ToolMigrationStatus[];
  generatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — TRACKER CLASS
// ═══════════════════════════════════════════════════════════

class MigrationTracker {
  private tools: Map<string, ToolMigrationStatus> = new Map();

  // ── Recording ──

  recordBackendSuccess(server: string, tool: string): void {
    const s = this.getOrCreate(server, tool);
    s.backendSuccessCount++;
    s.lastBackendSuccess = Date.now();
    s.failureRate = this.calcFailureRate(s);
    this.evaluatePromotion(s);
  }

  recordBackendFail(server: string, tool: string): void {
    const s = this.getOrCreate(server, tool);
    s.backendFailCount++;
    s.lastBackendFail = Date.now();
    s.failureRate = this.calcFailureRate(s);
    this.evaluateDemotion(s);
  }

  recordMockUse(server: string, tool: string): void {
    const s = this.getOrCreate(server, tool);
    s.mockUseCount++;
    s.lastMockUse = Date.now();
  }

  // ── Querying ──

  getStatus(server: string, tool: string): ToolMigrationStatus {
    return this.getOrCreate(server, tool);
  }

  getReport(): MigrationReport {
    const tools = Array.from(this.tools.values());
    const totalBackend = tools.reduce(
      (sum, t) => sum + t.backendSuccessCount + t.backendFailCount,
      0,
    );
    const totalMock = tools.reduce((sum, t) => sum + t.mockUseCount, 0);
    const totalCalls = totalBackend + totalMock;
    const realTools = tools.filter((t) => t.status !== "mock-only");

    return {
      total: tools.length,
      mockOnly: tools.filter((t) => t.status === "mock-only").length,
      backendAvailable: tools.filter((t) => t.status === "backend-available").length,
      backendPrimary: tools.filter((t) => t.status === "backend-primary").length,
      fullyMigrated: tools.filter((t) => t.status === "fully-migrated").length,
      backendCallPercent: totalCalls > 0
        ? Math.round((totalBackend / totalCalls) * 100)
        : 0,
      backendToolPercent: tools.length > 0
        ? Math.round((realTools.length / tools.length) * 100)
        : 0,
      tools: tools.sort((a, b) => {
        const order: Record<MigrationStage, number> = {
          "fully-migrated": 0,
          "backend-primary": 1,
          "backend-available": 2,
          "mock-only": 3,
        };
        return order[a.status] - order[b.status];
      }),
      generatedAt: Date.now(),
    };
  }

  getMockOnlyTools(): ToolMigrationStatus[] {
    return Array.from(this.tools.values())
      .filter((t) => t.status === "mock-only")
      .sort((a, b) => b.mockUseCount - a.mockUseCount);
  }

  reset(): void {
    this.tools.clear();
  }

  // ── Private ──

  private getOrCreate(server: string, tool: string): ToolMigrationStatus {
    const key = `${server}.${tool}`;
    if (!this.tools.has(key)) {
      this.tools.set(key, {
        server,
        tool,
        status: "mock-only",
        backendSuccessCount: 0,
        backendFailCount: 0,
        mockUseCount: 0,
        lastBackendSuccess: 0,
        lastBackendFail: 0,
        lastMockUse: 0,
        firstSeen: Date.now(),
        failureRate: 0,
      });
    }
    return this.tools.get(key)!;
  }

  private calcFailureRate(s: ToolMigrationStatus): number {
    const total = s.backendSuccessCount + s.backendFailCount;
    return total === 0 ? 0 : s.backendFailCount / total;
  }

  /**
   * Auto-promote: mock-only → backend-available (1 success)
   *   → backend-primary (10 successes, <10% failure)
   *   → fully-migrated (50 successes, 0% failure)
   */
  private evaluatePromotion(s: ToolMigrationStatus): void {
    const toolId = `${s.server}.${s.tool}`;
    switch (s.status) {
      case "mock-only":
        if (s.backendSuccessCount >= 1) {
          s.status = "backend-available";
          this.log("↑", toolId, "backend-available");
        }
        break;
      case "backend-available":
        if (s.backendSuccessCount >= 10 && s.failureRate < 0.1) {
          s.status = "backend-primary";
          this.log("↑", toolId, "backend-primary");
        }
        break;
      case "backend-primary":
        if (s.backendSuccessCount >= 50 && s.failureRate === 0) {
          s.status = "fully-migrated";
          this.log("↑", toolId, "fully-migrated");
        }
        break;
    }
  }

  /**
   * Auto-demote: fully-migrated → backend-primary (>5% fail)
   *   → backend-available (>20% fail)
   *   → mock-only (>50% fail, 3+ failures)
   */
  private evaluateDemotion(s: ToolMigrationStatus): void {
    const toolId = `${s.server}.${s.tool}`;
    switch (s.status) {
      case "fully-migrated":
        if (s.failureRate > 0.05) {
          s.status = "backend-primary";
          this.log("↓", toolId, "backend-primary");
        }
        break;
      case "backend-primary":
        if (s.failureRate > 0.2) {
          s.status = "backend-available";
          this.log("↓", toolId, "backend-available");
        }
        break;
      case "backend-available":
        if (s.failureRate > 0.5 && s.backendFailCount >= 3) {
          s.status = "mock-only";
          this.log("↓", toolId, "mock-only");
        }
        break;
    }
  }

  private log(direction: string, toolId: string, stage: string): void {
    if (import.meta.env.DEV) {
      console.log(
        `%c[Migration] ${direction} ${toolId} → ${stage}`,
        "color: #C9A96E; font-weight: bold",
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — SINGLETON
// ═══════════════════════════════════════════════════════════

export const migrationTracker = new MigrationTracker();
