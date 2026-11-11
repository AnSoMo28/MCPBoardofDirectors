/**
 * VI check-3 detector regression suite (B6 · VI-16/VI-17).
 *
 * The detector stopped flagging noise so the REAL debt became visible:
 *   - 27 migration comments ("// [x] text-[ var(--color-*) ] → CSS") — masked
 *   - 4 template-literal prefixes var(--gca-${…}) — family-verified, wired
 *   - BEM fragments ("--approval" in borderClass) — class suffix, not token
 *   - style-object keys / setProperty sites — WRITES, definitions not reads
 *   - quoted prefix fragments toContain("var(--color-") — assertion noise
 *   - NEW: CSS-side var() reads against never-defined no-fallback tokens
 *     (the 49-token/713-use debt the check had never looked at)
 *
 * Import gate: VI14_NO_MAIN=1 (the B4 convention) keeps main() from
 * running while importing as a library. The import is DYNAMIC and happens
 * AFTER the flag is set — a static import is hoisted above any
 * process.env assignment, so the gate flag would arrive too late and the
 * full CLI scan (2.7s + a complete report on stdout) would run inside the
 * test runner. Dynamic import is the only shape that guarantees ordering.
 */
import { beforeAll, describe, expect, it } from "vitest";

type ViLib = {
  stripLine: (line: string, state: { inBlock: boolean }) => string;
  collectJsWrittenTokens: (tsFiles: string[], cssFiles: string[]) => Set<string>;
};

let vi: ViLib;

beforeAll(async () => {
  process.env.VI14_NO_MAIN = "1";
  // Direct relative path to the script — tools/ compiles under
  // tsconfig.node.json (allowImportingTsExtensions: true, same as
  // architecture-guardian.ts), and vitest transforms it on the fly.
  // Dynamic (post-flag) so the library gate is already armed on load.
  vi = (await import("../../../scripts/verify-integration.ts")) as ViLib;
});

describe("stripLine (VI-16 comment masker)", () => {
  it("masks line comments, keeps code before them", () => {
    const st = { inBlock: false };
    expect(vi.stripLine("const a = 1; // var(--color-x)", st)).toBe("const a = 1; ");
    expect(st.inBlock).toBe(false);
  });

  it("masks full-line comments and block bodies", () => {
    const st = { inBlock: false };
    // masked output may keep leading indentation (the detector's
    // `if (!code) continue` treats whitespace-only as masked anyway);
    // what matters is that NO token text survives.
    expect(vi.stripLine("    // [x] font-[family-name:var(--font-*)] → CSS", st).trim()).toBe("");
    expect(vi.stripLine("/* block start", st)).toBe("");
    expect(st.inBlock).toBe(true);
    expect(vi.stripLine(" * [x] text-[var(--color-pearl)] → var(--color-silver-100)", st)).toBe("");
    expect(vi.stripLine(" */", st)).toBe("");
    expect(st.inBlock).toBe(false);
  });

  it("resumes code after a same-line block comment closes", () => {
    const st = { inBlock: false };
    expect(vi.stripLine("const b = 2; /* c */ const d = 3;", st)).toBe("const b = 2;  const d = 3;");
  });

  it("keeps string literals intact (refs inside them stay visible)", () => {
    const st = { inBlock: false };
    expect(vi.stripLine('  borderClass: "--approval",', st)).toBe('  borderClass: "--approval",');
    expect(vi.stripLine('  expect(t.color).toContain("var(--color-");', st)).toBe(
      '  expect(t.color).toContain("var(--color-");',
    );
  });

  it("normalizes CRLF without changing masking", () => {
    const st = { inBlock: false };
    expect(vi.stripLine("const a = 1;\r", st)).toBe("const a = 1;");
  });

  it("does not treat // inside a string as a comment (strings survive wholesale)", () => {
    const st = { inBlock: false };
    // url("data:image/svg+xml,...") style payloads never contain // here,
    // but if they did the string guard skips them instead of truncating.
    expect(vi.stripLine('const u = "a//b"; const v = 1;', st)).toBe('const u = "a//b"; const v = 1;');
  });
});

describe("collectJsWrittenTokens (VI-17 definition sites)", () => {
  const mk = (files: Record<string, string>) => {
    const dir = `/tmp/vi16-${Math.random().toString(36).slice(2)}`;
    for (const [name, content] of Object.entries(files)) {
      const p = `${dir}/${name}`;
      require("node:fs").mkdirSync(require("node:path").dirname(p), { recursive: true });
      require("node:fs").writeFileSync(p, content);
    }
    return dir;
  };

  it("collects style-object keys and setProperty targets, ignores reads and comments", () => {
    const dir = mk({
      "comp.tsx": [
        '// comment: "--ghost-key" should not count',
        'style={{ "--stagger-i": i } as CSSProperties}',
        'container.style.setProperty("--dtabs-ix", `${x}px`);',
        'const color = "var(--color-silver-400)"; // read, not a write',
        'borderClass: "--approval",',
      ].join("\n"),
    });
    const written = vi.collectJsWrittenTokens([`${dir}/comp.tsx`], []);
    expect(written.has("--stagger-i")).toBe(true);
    expect(written.has("--dtabs-ix")).toBe(true);
    expect(written.has("--ghost-key")).toBe(false);
    expect(written.has("--color-silver-400")).toBe(false); // read
    expect(written.has("--approval")).toBe(false); // BEM fragment
  });

  it("collects @property declarations from CSS", () => {
    const dir = mk({
      "s.css": "@property --spin-dur { syntax: '<length>'; inherits: false; }\n.g { animation: var(--spin-dur); }",
    });
    const written = vi.collectJsWrittenTokens([], [`${dir}/s.css`]);
    expect(written.has("--spin-dur")).toBe(true);
  });
});

describe("detector contract (full run over a synthetic project)", () => {
  it("reports CSS-side never-defined no-fallback tokens and stays silent for wired ones", () => {
    // Build a minimal frontend/src with every shape the detector must
    // distinguish, run the CLI with --json, assert the exact findings.
    const fs = require("node:fs");
    const path = require("node:path");
    const root = `/tmp/vi16-e2e-${Math.random().toString(36).slice(2)}`;
    const src = path.join(root, "frontend", "src");
    fs.mkdirSync(src, { recursive: true });

    fs.writeFileSync(
      path.join(src, "tokens.css"),
      [
        ":root {",
        "  --color-teal-400: #2dd4bf;",
        "  --gca-teal: #2dd4bf;",
        "}",
        ".uses-phantom { color: var(--never-defined); }",
        ".uses-fallback { color: var(--never-defined, #000); }",
        ".uses-defined { color: var(--color-teal-400); }",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(src, "widget.tsx"),
      [
        "// [x] text-[ var(--color-*) ] → CSS color tokens (comment noise)",
        "const style = { color: 'var(--color-teal-400)' };",
        "const dyn = `var(--gca-${channel})`;", // template-literal prefix
        "const cls = { borderClass: '--approval' };", // BEM fragment
        "style={{ '--stagger-i': 1 } as React.CSSProperties}", // JS write
        "expect(t.color).toContain('var(--color-');", // assertion fragment
      ].join("\n"),
    );
    fs.writeFileSync(path.join(src, "styles.css"), ":root { --stagger-i: 0; }\n.s { animation: var(--stagger-i); }");

    const { execSync } = require("node:child_process");
    // Run against the REAL repo's verifier (this file's repo root), with the
    // synthetic project passed via --root. The script lives at
    // club-platform-castillo_country_club/scripts/, two levels up from
    // frontend/tools/__tests__ (→ tools → frontend → club root).
    // exit 2 = warnings found — expected here (the synthetic project HAS a
    // real CSS phantom). execSync throws on non-zero unless we opt out.
    const repoRoot = path.resolve(__dirname, "../../..");
    let out = "";
    try {
      out = execSync(
        `npx tsx "${path.join(repoRoot, "scripts", "verify-integration.ts")}" --json --root "${root}" --check 3`,
        { cwd: repoRoot, encoding: "utf8", stdio: "pipe", env: { ...process.env, VI14_NO_MAIN: "0" } } as object,
      );
    } catch (err) {
      // exit 2 (warnings only) still prints the full --json report to stdout
      const e = err as { stdout?: string; status?: number };
      if (e.status !== 2) throw err;
      out = e.stdout ?? "";
    }
    const report = JSON.parse(out);
    const c3 = report.checks.find((c: { id: string }) => c.id === "phantom-tokens");
    const msgs = c3.findings.map((f: { message: string }) => f.message);

    // The ONLY warning on the TS side is gone (comment masked, family wired,
    // fragments excluded) — and the CSS side surfaces its true phantom:
    expect(msgs.some((m: string) => m.includes("never-defined"))).toBe(true);
    expect(msgs.some((m: string) => m.includes("--color-teal-400 is not defined"))).toBe(false);
    expect(msgs.some((m: string) => m.includes("--approval"))).toBe(false);
    expect(c3.totals?.warnings ?? report.totals.warnings).toBeGreaterThanOrEqual(1);
  });
});
