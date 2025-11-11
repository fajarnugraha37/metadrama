import path from "node:path";

export const resolveRoots = (
  targets: string[],
  cwd = process.cwd()
): string[] => {
  const picked = targets.length ? targets : ["src"];
  const resolved = picked.map((target) => path.resolve(cwd, target));
  return Array.from(new Set(resolved.map((entry) => path.normalize(entry))));
};

export const resolveOutDir = (
  outDir: boolean | string | undefined,
  cwd = process.cwd()
): string => {
  const dir =
    typeof outDir === "string" && outDir.trim().length > 0 ? outDir : "dist";
  return path.resolve(cwd, dir);
};
