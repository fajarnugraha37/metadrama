import { describe, it, expect, beforeEach } from "vitest";
import { registry } from "../src/core/registry";
import { pointcut } from "../src/core/pointcut";
import { transformWithSwc } from "../src/plugin/swc";

describe("Advice Types", () => {
  beforeEach(() => {
    registry.reset();
  });

  it("should apply before advice to method", async () => {
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;

    registry.registerAdvice(
      "before",
      serviceClasses.name("getStock"),
      () => "before-advice"
    );

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

    const result = await transformWithSwc(source, "test.ts");

    expect(result.code).toContain("// Before advice:");
    expect(result.code).toContain("[before] entering getStock");
    expect(result.code).toContain("performance.now()");
    expect(result.code).toContain("JSON.stringify(arguments)");
    expect(result.code).not.toContain("__originalMethod"); // Should not wrap like around advice
  });

  it("should apply after advice to method", async () => {
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;

    registry.registerAdvice(
      "after",
      serviceClasses.name("getStock"),
      () => "after-advice"
    );

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

    const result = await transformWithSwc(source, "test.ts");

    expect(result.code).toContain("// After advice:");
    expect(result.code).toContain("[after] getStock completed in");
    expect(result.code).toContain("[after] getStock returned:");
    expect(result.code).toContain("__result");
    expect(result.code).toContain("__error");
  });

  it("should handle multiple advice types on same method", async () => {
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;

    registry.registerAdvice(
      "before",
      serviceClasses.name("getStock"),
      () => "before-advice"
    );

    registry.registerAdvice(
      "after",
      serviceClasses.name("updateStock"),
      () => "after-advice"
    );

    registry.registerAdvice(
      "around",
      serviceClasses.name("checkStock"),
      () => "around-advice"
    );

    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async getStock(location) {
    return { location, quantity: 5 };
  }
  
  async updateStock(location, quantity) {
    return { success: true };
  }
  
  async checkStock(location) {
    return { available: true };
  }
}`;

    const result = await transformWithSwc(source, "test.ts");

    // Check that all three advice types are applied
    expect(result.code).toContain("// Before advice:");
    expect(result.code).toContain("// After advice:");
    expect(result.code).toContain("// Around advice:");

    expect(result.code).toContain("[before] entering getStock");
    expect(result.code).toContain("[after] updateStock completed");
    expect(result.code).toContain("[advice] entering checkStock");
  });

  it("should preserve original functionality with advice", async () => {
    // This test verifies the generated code maintains the same behavior
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;

    registry.registerAdvice(
      "before",
      serviceClasses.name("getStock"),
      () => "before-timing"
    );

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

    const result = await transformWithSwc(source, "test.ts");

    // Should contain the original return value logic
    expect(result.code).toContain("location");
    expect(result.code).toContain("quantity: 5");

    // Should not break the basic structure
    expect(result.code).toContain("class InventoryService");
    expect(result.code).toContain("async getStock");
  });
});
