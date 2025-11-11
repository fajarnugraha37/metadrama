import { describe, expect, it } from "vitest";

import { transformWithSwc } from "../src/plugin/swc";

const sample = `
export function compute(value: number) {
  return value * 2
}
`;

describe("perf budgets", () => {
  it("cold transform stays under soft budget", async () => {
    const start = performance.now();
    for (let i = 0; i < 10; i += 1) {
      await transformWithSwc(sample, `virtual-${i}.ts`);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});
