import { describe, it, expect, beforeEach } from "vitest";
import { transformWithSwc } from "../src/plugin/swc";
import { registry } from "../src/core/registry";
import { pointcut } from "../src/core/pointcut";

describe("Integration: Compile-time Transformations", () => {
  beforeEach(() => {
    registry.reset();
  });

  it("should transform @Service class with around advice", async () => {
    // Setup: Register around advice for Service classes
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerAdvice(
      "around",
      serviceClasses.name("getStock"),
      () => "enhanced-timing-advice"
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

    expect(result.code).toContain("// Around advice:");
    expect(result.code).toContain("performance.now()");
    expect(result.code).toContain("[advice] entering getStock");
    expect(result.code).toContain("const __originalMethod = async ()");
  });

  it("should transform method with memoize macro", async () => {
    // Setup: Register memoize macro
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerMacro("memoize", serviceClasses.name("getStock"));

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

    expect(result.code).toContain("[memoize]");
    expect(result.code).toContain("cache");
    expect(result.code).toContain("JSON.stringify(arguments)");
    expect(result.code).toContain("cache hit");
    expect(result.code).toContain("cache miss");
  });

  it("should transform method with retry macro", async () => {
    // Setup: Register retry macro
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerMacro("retry", serviceClasses.name("updateStock"));

    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async updateStock(location, quantity) {
    return { success: true };
  }
}`;

    const result = await transformWithSwc(source, "test.ts");

    expect(result.code).toContain("[retry]");
    expect(result.code).toContain("__maxRetries");
    expect(result.code).toContain("exponential backoff");
    expect(result.code).toContain("attempt");
    expect(result.code).toContain("setTimeout");
  });

  it("should transform method with trace macro", async () => {
    // Setup: Register trace macro
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerMacro("trace", serviceClasses.name("checkAvailability"));

    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async checkAvailability(location, quantity) {
    return { available: true };
  }
}`;

    const result = await transformWithSwc(source, "test.ts");

    expect(result.code).toContain("[trace]");
    expect(result.code).toContain("console.group");
    expect(result.code).toContain("console.time");
    expect(result.code).toContain("traceId");
    expect(result.code).toContain("Arguments:");
    expect(result.code).toContain("Execution time:");
  });

  it("should transform method with validate macro", async () => {
    // Setup: Register validate macro
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerMacro("validate", serviceClasses.name("processOrder"));

    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async processOrder(location, quantity, customerId) {
    return { success: true };
  }
}`;

    const result = await transformWithSwc(source, "test.ts");

    expect(result.code).toContain("[validate]");
    expect(result.code).toContain("__validateParam");
    expect(result.code).toContain("__validateReturnValue");
    expect(result.code).toContain("Parameter");
    expect(result.code).toContain("must be");
  });

  it("should handle multiple transformations on same class", async () => {
    // Setup: Register multiple advice and macros
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;

    registry.registerAdvice(
      "around",
      serviceClasses.name("getStock"),
      () => "timing-advice"
    );
    registry.registerMacro("memoize", serviceClasses.name("getStock"));
    registry.registerMacro("trace", serviceClasses.name("updateStock"));

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
}`;

    const result = await transformWithSwc(source, "test.ts");

    // Check that both advice and macro were applied
    expect(result.code).toContain("[advice]");
    expect(result.code).toContain("[memoize]");
    expect(result.code).toContain("[trace]");
  });

  it("should preserve original functionality in transformed code", async () => {
    // This test verifies the generated code maintains the same behavior
    const serviceClasses = pointcut.classes.withDecorator("Service").methods;
    registry.registerAdvice(
      "around",
      serviceClasses.name("getStock"),
      () => "test-advice"
    );

    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async getStock(location) {
    return { location, quantity: location === 'sku-nyc' ? 5 : 0 };
  }
}`;

    const result = await transformWithSwc(source, "test.ts");

    // The transformed code should contain the original logic
    expect(result.code).toContain("location === 'sku-nyc' ? 5 : 0");
    expect(result.code).toContain("const __originalMethod = async ()");

    // And should be wrapped with advice
    expect(result.code).toContain("[advice]");
  });
});
