import { beforeEach, describe, expect, it } from "vitest";

import { around, before, pointcut } from "../src";
import { registry } from "../src/core/registry";
import type { Signature } from "../src/core/types";
import { weaveFunction } from "../src/runtime/dispatcher";

describe("usage example", () => {
  beforeEach(() => {
    registry.reset();
  });

  it("wraps service-like function with advice", () => {
    const calls: string[] = [];
    const services = pointcut.functions.name("fetchUser");

    before(services)((ctx) => {
      calls.push(`before:${ctx.args[0]}`);
    });

    around(services)((ctx) => {
      calls.push("around:start");
      const result = ctx.proceed(...ctx.args);
      return ctx.wrap(result, (value) => {
        calls.push(`around:end:${value.name}`);
        return value;
      });
    });

    const fetchUser = (id: string) => ({ id, name: "Ada" });
    const signature: Signature = {
      kind: "function",
      name: "fetchUser",
      decorators: [],
      file: "usage.ts",
      async: false,
      generator: false,
      parameters: ["id"],
    };

    const wrapped = weaveFunction(fetchUser, signature);
    const result = wrapped("42");

    expect(result).toEqual({ id: "42", name: "Ada" });
    expect(calls).toEqual(["before:42", "around:start", "around:end:Ada"]);
  });
});
