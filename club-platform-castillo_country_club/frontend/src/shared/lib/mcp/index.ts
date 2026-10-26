// src/shared/lib/mcp/index.ts
// ═══════════════════════════════════════════════════════════
// MCP Layer — Public API
// ═══════════════════════════════════════════════════════════

export { routeMCPCall } from "./mcp-router";
export type {
  MCPSource,
  MCPRouteResult,
  MCPRouterConfig,
} from "./mcp-router";

export { migrationTracker } from "./migration-tracker";
export type {
  MigrationStage,
  ToolMigrationStatus,
  MigrationReport,
} from "./migration-tracker";
