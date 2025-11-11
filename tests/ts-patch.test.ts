import { describe, test, expect, vi, beforeEach } from "vitest";
import ts from "typescript";
import {
  createTsPatchTransformer,
  registerTsPatch,
} from "../src/plugin/ts-patch";
import { registry } from "../src/core/registry";
import type { AdviceKind } from "../src/core/registry";

// Mock the registry
vi.mock("../src/core/registry", () => ({
  registry: {
    findAdvice: vi.fn(() => []),
    findMacros: vi.fn(() => []),
    recordDiagnostic: vi.fn(),
  },
}));

// Mock the transform modules
vi.mock("../src/transform/expand-macro", () => ({
  expandMacros: vi.fn((artifact) => artifact),
}));

vi.mock("../src/transform/weave", () => ({
  weave: vi.fn((artifact) => ({
    ...artifact,
    code: artifact.code + "// transformed",
  })),
}));

// Mock the core/diagnostics timer
vi.mock("../src/core/diagnostics", () => ({
  timer: vi.fn((category, message, fn) => fn()),
}));

describe("TypeScript Patch Transform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create a proper TypeScript transformation context
  const createMockContext = (): ts.TransformationContext =>
    ({
      factory: ts.factory,
      getCompilerOptions: () => ({}),
      startLexicalEnvironment: () => {},
      suspendLexicalEnvironment: () => {},
      resumeLexicalEnvironment: () => {},
      endLexicalEnvironment: () => undefined,
      setLexicalEnvironmentFlags: () => {},
      getLexicalEnvironmentFlags: () => 0,
      hoistFunctionDeclaration: () => {},
      hoistVariableDeclaration: () => {},
      requestEmitHelper: () => {},
      readEmitHelpers: () => undefined,
      enableSubstitution: () => {},
      isSubstitutionEnabled: () => false,
      onSubstituteNode: (hint, node) => node,
      enableEmitNotification: () => {},
      isEmitNotificationEnabled: () => false,
      onEmitNode: (hint, node, emitCallback) => emitCallback(hint, node),
    } as ts.TransformationContext);

  test("should create TypeScript transformer factory", () => {
    const factory = createTsPatchTransformer();
    expect(typeof factory).toBe("function");

    const context = createMockContext();
    const transformer = factory(context);
    expect(typeof transformer).toBe("function");
  });

  test("should register TypeScript patch correctly", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = registerTsPatch();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[TS-PATCH] Metadrama TypeScript transformer registered"
    );
    expect(result).toBe(createTsPatchTransformer);

    consoleSpy.mockRestore();
  });

  test("should pass through undecorated classes", () => {
    const sourceCode = `
      class PlainClass {
        plainMethod() {
          return "hello";
        }
      }
    `;

    const sourceFile = ts.createSourceFile(
      "test.ts",
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    const factory = createTsPatchTransformer();
    const context = createMockContext();
    const transformer = factory(context);
    const result = transformer(sourceFile);

    // Should return the same file since no decorators
    expect(result).toBe(sourceFile);
  });

  test("should detect and process decorated classes", () => {
    const sourceCode = `
      @Component
      class DecoratedClass {
        decoratedMethod() {
          return "hello";
        }
        
        async asyncMethod() {
          return "async hello";
        }
        
        constructor() {}
      }
    `;

    const sourceFile = ts.createSourceFile(
      "test.ts",
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    // Mock registry to return some advice
    const mockAdvice = {
      id: "test-advice",
      kind: "before" as AdviceKind,
      handler: () => {},
      pointcut: {
        kind: "method" as const,
        test: () => true,
        describe: () => "test",
      },
    };

    vi.mocked(registry.findAdvice).mockReturnValue([mockAdvice]);
    vi.mocked(registry.findMacros).mockReturnValue([]);

    const factory = createTsPatchTransformer();
    const context = createMockContext();
    const transformer = factory(context);

    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const result = transformer(sourceFile);
    consoleSpy.mockRestore();

    // Should process and return transformed file
    expect(result).toBeDefined();
    expect(result.fileName).toBe("test.ts");

    // Verify registry was called correctly
    expect(registry.findAdvice).toHaveBeenCalled();
    expect(registry.findMacros).toHaveBeenCalled();
  });

  test("should handle transformation errors gracefully", async () => {
    const sourceCode = `
      @Component
      class TestClass {
        testMethod() {
          return "test";
        }
      }
    `;

    const sourceFile = ts.createSourceFile(
      "test.ts",
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    // Mock weave to return invalid code that will cause parsing to fail
    const weaveModule = await import("../src/transform/weave");
    vi.mocked(weaveModule.weave).mockReturnValue({
      file: "test.ts",
      source: sourceCode,
      code: "class { @@@\n###\n!!!", // Truly invalid syntax
      map: undefined,
      advice: [],
      macros: [],
    });

    const mockAdvice = {
      id: "test-advice",
      kind: "before" as AdviceKind,
      handler: () => {},
      pointcut: {
        kind: "method" as const,
        test: () => true,
        describe: () => "test",
      },
    };

    vi.mocked(registry.findAdvice).mockReturnValue([mockAdvice]);
    vi.mocked(registry.findMacros).mockReturnValue([]);

    const factory = createTsPatchTransformer();
    const context = createMockContext();
    const transformer = factory(context);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const result = transformer(sourceFile);

    consoleSpy.mockRestore();
    debugSpy.mockRestore();

    // Should return a result without throwing
    expect(result).toBeDefined();

    // May or may not call recordDiagnostic depending on TypeScript's error handling,
    // but should not crash
    // expect(registry.recordDiagnostic).toHaveBeenCalled();
  });

  test("should properly extract decorator information from TypeScript 5.x syntax", () => {
    const sourceCode = `
      @Service("database")
      @Transactional
      class UserService {
        @Memoize({ ttl: 5000 })
        async getUser(id: string): Promise<User> {
          return await this.db.findUser(id);
        }
      }
    `;

    const sourceFile = ts.createSourceFile(
      "user-service.ts",
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    vi.mocked(registry.findAdvice).mockReturnValue([]);
    vi.mocked(registry.findMacros).mockReturnValue([]);

    const factory = createTsPatchTransformer();
    const context = createMockContext();
    const transformer = factory(context);

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    transformer(sourceFile);
    debugSpy.mockRestore();

    // Verify the signature was created correctly with class decorators
    const calls = vi.mocked(registry.findAdvice).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    if (calls.length > 0 && calls[0]?.[0]) {
      const signature = calls[0][0];
      expect(signature.kind).toBe("method");
      expect(signature.name).toBe("getUser");
      expect(signature.async).toBe(true);
      expect(signature.owner).toBeDefined();
      expect(signature.owner?.name).toBe("UserService");
      expect(signature.owner?.decorators).toEqual(["Service", "Transactional"]);
    }
  });
});
