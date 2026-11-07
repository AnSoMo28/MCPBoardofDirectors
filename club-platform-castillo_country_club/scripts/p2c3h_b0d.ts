// P2-C3h · b0d — diagnóstico tras el aborto de §1 del B0 · READ-ONLY
// Ejecutar desde la RAIZ del repo: npx tsx scripts/p2c3h_b0d.ts
// Reporte: p2c3h_b0d_report.txt (pegar el output completo en el chat)
//
// Responde 5 preguntas:
//   1 · ¿Qué son los "11 cambios previos" que git reportó?
//   2 · ¿Algún run previo del B0 escribió/parcheó archivos?
//   3 · ¿Qué contiene auth/tool_permissions.py (el archivo que hizo abortar §1)?
//   4 · ¿Quién importa tool_permissions en backend/src?
//   5 · ¿El scripts/p2c3h_b0.ts en disco es el que envié, o se corrompió al pegar?
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BE = path.join(ROOT, "backend");
const R: string[] = [];
const say = (s = ""): void => { console.log(s); R.push(s); };
const sh = (args: string[], cwd: string = ROOT): string => {
  const r = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8" });
  return ((r.stdout || "") + (r.stderr || "")).trim();
};
const has = (p: string): boolean => fs.existsSync(p);

if (!has(path.join(BE, "src"))) {
  console.error("✗ Ejecutar desde la raíz del repo (backend/src no encontrado)");
  process.exit(1);
}

say("P2-C3h · b0d — diagnóstico post-aborto §1 (read-only)");
say(sh(["git", "log", "--oneline", "-1"]));
say("");

say("── 1 · los cambios previos del árbol ──");
say(sh(["git", "status", "--short"]) || "· limpio");
say("");
say("  diff tracked:");
say(sh(["git", "diff", "--stat"]) || "· sin cambios tracked");
say("");

say("── 2 · artefactos B0 en disco (¿un run previo aplicó algo?) ──");
for (const f of [
  "backend/src/club_mcp/registry.py",
  "backend/src/club_mcp/bootstrap.py",
  "backend/scripts/smoke_b0.py",
]) {
  say(`  ${has(path.join(ROOT, f)) ? "EXISTE " : "no     "} · ${f}`);
}
const AE = path.join(BE, "src/club_mcp/hitl/approval_engine.py");
if (has(AE)) {
  const ae = fs.readFileSync(AE, "utf8");
  say(`  ${ae.includes("_executors") ? "PARCHEADO" : "original  "} · approval_engine.py (B0.5 executores)`);
}
const FP = path.join(BE, "src/club_mcp/agents/family_profile.py");
if (has(FP)) {
  const fp = fs.readFileSync(FP, "utf8");
  say(`  ${fp.includes("P2-C3h B0 (F-2)") ? "PARCHEADO" : "original  "} · family_profile.py (firma ctor)`);
}
say("");

say("── 3 · auth/tool_permissions.py — el archivo que ninguna corrida forense dumpó ──");
const TP = path.join(BE, "src/club_mcp/auth/tool_permissions.py");
if (has(TP)) {
  const src = fs.readFileSync(TP, "utf8");
  say(`  · ${src.split("\n").length} líneas · dump completo:`);
  say(src.split("\n").map((l) => `  ${l}`).join("\n"));
} else {
  say("  · no existe");
}
say("");

say("── 4 · importers de tool_permissions en backend/src ──");
say(sh(["grep", "-rn", "tool_permissions", "src", "--include=*.py"], BE) || "· sin hits");
say("");

say("── 5 · integridad del scripts/p2c3h_b0.ts que corrí (corrupción del pegado) ──");
const SC = path.join(ROOT, "scripts/p2c3h_b0.ts");
if (has(SC)) {
  const src = fs.readFileSync(SC, "utf8");
  say(`  · ${src.split("\n").length} líneas en disco`);
  const M: [string, string][] = [
    ["guard §1: exclusión rbac/agents", "endsWith(\"auth/rbac.py\")"],
    ["payload registry.py", "PY_REGISTRY = String.raw"],
    ["payload bootstrap.py", "PY_BOOTSTRAP = String.raw"],
    ["payload app.py", "PY_APP = String.raw"],
    ["payload routes/agents.py", "PY_ROUTES = String.raw"],
    ["payload server.py", "PY_SERVER = String.raw"],
    ["payload rbac.py", "PY_RBAC = String.raw"],
    ["payload smoke_b0.py", "PY_SMOKE = String.raw"],
    ["parche family_profile.__init__", "family_profile.__init__"],
    ["parche approval_engine.approve", "approval_engine.approve dispatch"],
    ["sección gates §5", "§5 Gates"],
  ];
  for (const [label, needle] of M) {
    say(`  ${src.includes(needle) ? "OK     " : "PERDIDO"} · ${label}`);
  }
} else {
  say("  · no existe en disco");
}
say("");
fs.writeFileSync(path.join(ROOT, "p2c3h_b0d_report.txt"), R.join("\n") + "\n", "utf8");
console.log("✓ reporte: p2c3h_b0d_report.txt");
