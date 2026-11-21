/**
 * apply-unstyled.ts — B5: añade variant="unstyled" al Button primitivo.
 * Design-cut del codemod: passthrough puro para los 633 sites migrados.
 * Idempotente (re-run no duplica).
 */
import { Project } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.app.json" });
const sf = project.getSourceFile("src/shared/components/ui/Button.tsx")!;
const text = sf.getText();

if (!text.includes('"unstyled"')) {
  // 1) tipo
  sf.replaceWithText(
    text.replace(
      'export type ButtonVariant = "primary" | "sage" | "secondary" | "ghost" | "danger" | "success";',
      'export type ButtonVariant =\n  | "primary"\n  | "sage"\n  | "secondary"\n  | "ghost"\n  | "danger"\n  | "success"\n  | "unstyled";',
    ),
  );
}

project.saveSync();
console.log("ButtonVariant:", sf.getText().includes('"unstyled"') ? "unstyled añadido" : "ya estaba");
