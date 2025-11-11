import fg from "fast-glob";
import path from "node:path";

import { runRules } from "../rules";
import { transformFile } from "../plugin/swc";
import { analyzeProjectImports } from "../transform/arch-analyzer";
import { changeExtension, writeFile } from "../transform/utils";
import { resolveOutDir, resolveRoots } from "./targets";
import { loadConfig } from "../core/config";

interface BuildFlags {
  watch?: boolean | string;
  outDir?: string | boolean;
  config?: string;
}

const collectFiles = async (roots: string[]) => {
  if (!roots.length) return [];
  const patterns = roots.map((root) =>
    path.join(root, "**/*.{ts,tsx}").replace(/\\/g, "/")
  );
  return fg(patterns, { absolute: true });
};

export const runBuild = async (
  flags: BuildFlags = {},
  targets: string[] = []
): Promise<void> => {
  const cwd = process.cwd();

  // Load aspect configuration first
  await loadConfig({ configPath: flags.config });

  const roots = resolveRoots(targets, cwd);
  const outDir = resolveOutDir(flags.outDir, cwd);
  const files = await collectFiles(roots);
  const sources: Array<{ file: string; source: string }> = [];

  for (const file of files) {
    const result = await transformFile(file);
    const owningRoot = roots.find((root) => file.startsWith(root)) ?? roots[0]!;
    const rootLabel =
      path.relative(cwd, owningRoot) || path.basename(owningRoot);
    const relative = path.relative(owningRoot, file);
    const outFile = changeExtension(
      path.join(outDir, rootLabel, relative),
      "js"
    );
    await writeFile(outFile, result.code);
    sources.push({ file, source: result.source });
  }

  const graph = analyzeProjectImports(sources);
  const violations = runRules(graph);
  if (violations.length) {
    for (const violation of violations) {
      console.error(`[rule:${violation.code}] ${violation.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `metadrama build ✔️ -> ${path.relative(cwd, outDir) || outDir} (${
        files.length
      } files from ${roots
        .map((root) => path.relative(cwd, root) || path.basename(root))
        .join(", ")})`
    );
  }

  if (flags.watch) {
    console.warn(
      "watch mode is not yet implemented; rerun `metadrama build` after changes."
    );
  }
};
