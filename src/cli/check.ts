import fg from "fast-glob";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import { runRules } from "../rules";
import { analyzeProjectImports } from "../transform/arch-analyzer";
import { resolveRoots } from "./targets";

const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });

const collectSources = async (roots: string[]) => {
  if (!roots.length) return [];
  const patterns = roots.map((root) =>
    path.join(root, "**/*.{ts,tsx}").replace(/\\/g, "/")
  );
  const files = await fg(patterns, { absolute: true });
  return Promise.all(
    files.map(async (file) => ({ file, source: await fs.readFile(file, "utf8") }))
  );
};

export const runCheck = async (flags: Record<string, unknown> = {}, targets: string[] = []) => {
  await run("bun", ["x", "tsc", "--noEmit"]);
  const roots = resolveRoots(targets);
  const sources = await collectSources(roots);
  const graph = analyzeProjectImports(sources);
  const violations = runRules(graph);
  if (violations.length) {
    for (const violation of violations) {
      console.error(`[rule:${violation.code}] ${violation.message}`);
    }
    process.exit(1);
  }
  console.log(
    `metadrama check ✔️ (${roots
      .map((root) => path.relative(process.cwd(), root) || path.basename(root))
      .join(", ")})`
  );
};
