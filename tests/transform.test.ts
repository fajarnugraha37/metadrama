import path from "node:path";
import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { transformWithSwc } from "../src/plugin/swc";

const fixture = async (name: string) => {
  const base = path.join(process.cwd(), "tests/fixtures");
  const input = await fs.readFile(path.join(base, `input-${name}.ts`), "utf8");
  const output = await fs.readFile(
    path.join(base, `output-${name}.ts`),
    "utf8"
  );
  return { input, output, file: path.join(base, `input-${name}.ts`) };
};

describe("transform", () => {
  it("emits identical output for basic fixture", async () => {
    const { input, output, file } = await fixture("basic");
    const result = await transformWithSwc(input, file);
    expect(result.code.trim()).toEqual(output.trim());
  });
});
