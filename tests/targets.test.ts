import { describe, expect, it } from "vitest";
import path from "node:path";

import { resolveOutDir, resolveRoots } from "../src/cli/targets";

describe("resolveRoots", () => {
  const cwd = path.resolve("/tmp/project").replace(/\\/g, path.sep);

  it("defaults to src when no targets provided", () => {
    const roots = resolveRoots([], cwd);
    expect(roots).toEqual([path.join(cwd, "src")]);
  });

  it("resolves custom targets", () => {
    const roots = resolveRoots(["examples", "packages/api"], cwd);
    expect(roots).toEqual([
      path.join(cwd, "examples"),
      path.join(cwd, "packages", "api"),
    ]);
  });
});

describe("resolveOutDir", () => {
  const cwd = path.resolve("/tmp/project").replace(/\\/g, path.sep);

  it("defaults to dist when missing or boolean", () => {
    expect(resolveOutDir(undefined, cwd)).toEqual(path.join(cwd, "dist"));
    expect(resolveOutDir(true, cwd)).toEqual(path.join(cwd, "dist"));
  });

  it("resolves custom outputs", () => {
    expect(resolveOutDir("build/artifacts", cwd)).toEqual(
      path.join(cwd, "build", "artifacts")
    );
  });
});
