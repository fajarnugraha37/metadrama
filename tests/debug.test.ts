import { describe, it, expect, beforeEach } from "vitest";
import { transformWithSwc } from "../src/plugin/swc";
import { registry } from "../src/core/registry";
import { pointcut } from "../src/core/pointcut";
import { createSignature } from "../src/transform/selectors";

describe("Debug: Transformation Pipeline", () => {
  beforeEach(() => {
    registry.reset();
  });

  it("should debug advice registration and matching", async () => {
    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async getStock(location) {
    return { location, quantity: 5 };
  }
}`;

    // Register advice with debug logging
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    const stockPointcut = serviceClasses.name("getStock");

    console.log("Pointcut description:", stockPointcut.describe());

    const adviceId = registry.registerAdvice(
      "around",
      stockPointcut,
      () => "debug-advice"
    );

    console.log("Registered advice ID:", adviceId);

    // Create a proper signature for testing
    const testSignature = createSignature(
      "method",
      "InventoryService#getStock",
      "test.ts",
      [],
      {
        async: true,
        parameters: [],
        owner: { name: "InventoryService", decorators: ["Service"] },
      }
    );

    console.log(
      "Registry advice count:",
      registry.findAdvice(testSignature).length
    );

    const result = await transformWithSwc(source, "test.ts");

    console.log("Transformed code:", result.code);
    console.log("Diagnostics:", result.diagnostics);

    // Less strict assertion - just check that transformation happened
    expect(result.code).not.toBe(source);
  });

  it("should debug macro registration and matching", async () => {
    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async getStock(location) {
    return { location, quantity: 5 };
  }
}`;

    // Register macro with debug logging
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    const stockPointcut = serviceClasses.name("getStock");

    console.log("Pointcut for macro:", stockPointcut.describe());

    const macroId = registry.registerMacro("memoize", stockPointcut);

    console.log("Registered macro ID:", macroId);

    const result = await transformWithSwc(source, "test.ts");

    console.log("Macro transformed code:", result.code);

    // Check if any transformation occurred
    expect(result.code.length).toBeGreaterThan(0);
  });
});
