import { describe, expect, it, beforeEach } from "vitest";

import { before, after } from "../src/core/advice";
import { pointcut } from "../src/core/pointcut";
import { registry } from "../src/core/registry";
import { weaveFunction } from "../src/runtime/dispatcher";
import type { Signature } from "../src/core/types";

const signature: Signature = {
  kind: "function",
  name: "target",
  decorators: [],
  file: "test.ts",
  async: false,
  generator: false,
  parameters: [],
};

const anyFunctionPointcut = pointcut.functions.where(() => true);

beforeEach(() => {
  registry.reset();
});

describe("runtime dispatcher", () => {
  it("runs before and after advice", async () => {
    const events: string[] = [];
    before(anyFunctionPointcut)((ctx) => {
      events.push(`before:${ctx.targetName}`);
    });
    after(anyFunctionPointcut)((ctx) => {
      events.push(`after:${ctx.targetName}:${ctx.result}`);
    });

    const fn = () => "value";
    const wrapped = weaveFunction(fn, signature);
    const value = wrapped();
    expect(value).toBe("value");
    expect(events).toEqual(["before:target", "after:target:value"]);
  });
});
