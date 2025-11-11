# Testing Guidelines for MetaDrama

## Test Structure Philosophy

Tests should validate both transformation correctness and developer experience. Every feature needs:

1. **Unit tests** - Individual components work correctly
2. **Integration tests** - Components work together
3. **Transform tests** - Generated code is correct and optimal
4. **Error tests** - Failures produce helpful diagnostics

## Test Naming Conventions

```typescript
// ✅ Good: Descriptive test names
test(
  "memoize macro with custom key function should generate unique cache keys"
);
test("pointcut selector withDecorator should match only decorated classes");
test("around advice should preserve async function return types");

// ❌ Bad: Vague test names
test("memoize works");
test("pointcut test");
test("advice");
```

## Transform Testing Pattern

```typescript
// Standard pattern for testing code transformations
function testTransform(
  name: string,
  input: string,
  expectations: {
    shouldContain?: string[];
    shouldNotContain?: string[];
    diagnostics?: { code: string; level: string }[];
    shouldCompile?: boolean;
  }
) {
  test(name, () => {
    const result = transformCode(input);

    expectations.shouldContain?.forEach((text) => {
      expect(result.code).toContain(text);
    });

    expectations.shouldNotContain?.forEach((text) => {
      expect(result.code).not.toContain(text);
    });

    if (expectations.diagnostics) {
      expect(result.diagnostics).toHaveLength(expectations.diagnostics.length);
      expectations.diagnostics.forEach((expected, i) => {
        expect(result.diagnostics[i].code).toBe(expected.code);
        expect(result.diagnostics[i].level).toBe(expected.level);
      });
    }

    if (expectations.shouldCompile) {
      expect(
        result.diagnostics.filter((d) => d.level === "error")
      ).toHaveLength(0);
    }
  });
}
```

## Performance Testing

```typescript
// Test compilation performance for large codebases
test("should transform 1000 classes with aspects in under 5 seconds", async () => {
  const largeCodebase = generateLargeCodebase(1000);
  const start = performance.now();

  const result = await transformCode(largeCodebase);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000);
  expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
});
```

## Mock and Fixture Patterns

```typescript
// Create reusable test fixtures
const fixtures = {
  simpleService: `
    @Service()
    class UserService {
      async getUser(id: string): Promise<User> {
        return await this.db.findById(id)
      }
    }
  `,

  aspectDefinition: `
    const services = pointcut.classes.withDecorator("Service").methods
    around(services)((ctx) => {
      console.log(\`Calling \${ctx.targetName}\`)
      return ctx.proceed(...ctx.args)
    })
  `,
};

// Mock external dependencies consistently
const mockRegistry = {
  registerAdvice: vi.fn(),
  getMacros: vi.fn(() => []),
  generateSymbol: vi.fn((prefix) => `__${prefix}_${Date.now()}`),
};
```

## Error Testing Best Practices

```typescript
// Test both the error and the suggested fix
test("invalid pointcut should suggest correct syntax", () => {
  const invalidCode = `pointcut.classes.invalidMethod()`;
  const result = transformCode(invalidCode);

  expect(result.diagnostics).toHaveLength(1);
  expect(result.diagnostics[0]).toMatchObject({
    code: "MD1008",
    level: "error",
    message: expect.stringContaining(
      "invalidMethod is not a valid pointcut method"
    ),
    hint: expect.stringContaining(
      "Did you mean: withDecorator, name, or where?"
    ),
  });
});
```

## Test Categories

### Unit Tests (`*.test.ts`)

- Test individual functions and classes in isolation
- Fast execution (< 100ms per test)
- No file I/O or network calls
- Focus on edge cases and error conditions

### Integration Tests (`*.integration.test.ts`)

- Test component interactions
- May include file operations
- Test realistic usage scenarios
- Validate end-to-end workflows

### Performance Tests (`*.perf.test.ts`)

- Measure compilation speed
- Memory usage validation
- Large codebase handling
- Regression detection

### Plugin Tests (`plugin/*.test.ts`)

- Test build tool integrations
- Validate plugin configurations
- Test error propagation
- Cross-platform compatibility

## Test Data Management

```typescript
// Use snapshot testing for generated code
test("memoize macro generates expected code structure", () => {
  const input = `macro.memoize().applyTo(pointcut.functions.name("expensive"))`;
  const result = transformCode(input);

  // Normalize whitespace for reliable comparison
  const normalizedCode = normalizeCode(result.code);
  expect(normalizedCode).toMatchSnapshot();
});

// Parameterized tests for multiple scenarios
test.each([
  ["simple function", "function test() {}", "test"],
  ["arrow function", "const test = () => {}", "test"],
  ["method", "class C { test() {} }", "test"],
])("should extract function name from %s", (desc, code, expected) => {
  const result = extractFunctionName(parseCode(code));
  expect(result).toBe(expected);
});
```

## Test Utilities

Always provide helper functions for common test operations:

```typescript
// Test utilities should be reusable and clear
export const testUtils = {
  // Quick transform with default options
  transform: (code: string) => transformCode(code, defaultTestOptions),

  // Create mock contexts
  createMockContext: (overrides = {}) => ({
    fileName: "test.ts",
    phase: "analyze" as const,
    ...overrides,
  }),

  // Normalize code for comparison
  normalizeCode: (code: string) => code.replace(/\s+/g, " ").trim(),

  // Generate test classes
  createTestClass: (name: string, methods: string[] = ["test"]) => `
    @Service()
    class ${name} {
      ${methods.map((m) => `${m}() { return "result" }`).join("\n")}
    }
  `,

  // Assert diagnostic properties
  expectDiagnostic: (
    diagnostics: Diagnostic[],
    code: string,
    level: string
  ) => {
    const found = diagnostics.find((d) => d.code === code);
    expect(found).toBeDefined();
    expect(found!.level).toBe(level);
    return found!;
  },
};
```

## Coverage Requirements

- **Core modules**: Minimum 90% coverage
- **Transform logic**: 95% coverage (critical for correctness)
- **Plugin integrations**: 80% coverage (external dependencies)
- **CLI tools**: 85% coverage (user-facing reliability)

## Running Tests

```bash
# Run all tests
bun run test

# Run specific test categories
bun run test:unit
bun run test:integration
bun run test:perf

# Run tests with coverage
bun run test:coverage

# Watch mode for development
bun run test:watch
```

Remember: Good tests are the safety net that allows us to refactor fearlessly and ship with confidence! 🧪
