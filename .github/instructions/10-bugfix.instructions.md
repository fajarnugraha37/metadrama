# Bug Fixing and Issue Resolution Guidelines

## Bug Classification and Prioritization

### Severity Levels

#### 🚨 **Critical (P0)** - Immediate Action Required

- **Build Failures**: Code generation produces invalid JavaScript/TypeScript
- **Security Vulnerabilities**: Code injection or unsafe transformations
- **Data Loss**: Incorrect transformations that alter program logic
- **Complete Feature Breakdown**: Core functionality completely non-functional

**Response Time**: 2-4 hours
**Resolution Target**: 24 hours
**Escalation**: Immediate hotfix release if in production

#### 🔥 **High (P1)** - Next Release Blocker

- **Performance Degradation**: >50% slowdown in compilation or runtime
- **Memory Leaks**: Unbounded memory growth during transformation
- **Incorrect Code Generation**: Generated code works but is suboptimal/wrong
- **Plugin Incompatibility**: Major build tool integrations broken

**Response Time**: 24 hours  
**Resolution Target**: 1 week
**Escalation**: Include in next patch release

#### ⚠️ **Medium (P2)** - Feature Impact

- **Diagnostic Quality**: Poor error messages or missing context
- **API Inconsistencies**: Unexpected behavior in public APIs
- **Documentation Bugs**: Examples don't work or are misleading
- **Minor Performance Issues**: 10-50% performance impact

**Response Time**: 3-5 days
**Resolution Target**: Next minor release
**Escalation**: Track in sprint planning

#### 📝 **Low (P3)** - Quality of Life

- **Developer Experience**: IDE integration issues
- **Edge Cases**: Rare scenarios with workarounds
- **Cosmetic Issues**: CLI output formatting, non-critical warnings
- **Enhancement Requests**: "It would be nice if..." scenarios

**Response Time**: 1-2 weeks
**Resolution Target**: When capacity allows
**Escalation**: Consider for roadmap planning

### Bug Type Categories

#### Transform Bugs

```typescript
// Issues with AST transformation and code generation
interface TransformBug {
  category: "transform";
  subcategory: "advice" | "macro" | "pointcut" | "codegen";
  inputCode: string;
  expectedOutput: string;
  actualOutput: string;
  affectedVersions: string[];
}

// Example transform bug report
const transformBugExample: TransformBug = {
  category: "transform",
  subcategory: "macro",
  inputCode: `
    macro.memoize({ ttlMs: 5000 }).applyTo(
      pointcut.functions.name("expensiveOperation")
    )
  `,
  expectedOutput: "Generated code with TTL-based cache expiration",
  actualOutput: "Generated code without TTL logic",
  affectedVersions: ["1.2.0", "1.2.1"],
};
```

#### Plugin Integration Bugs

```typescript
interface PluginBug {
  category: "plugin";
  buildTool: "vite" | "swc" | "typescript" | "bun" | "esbuild";
  configurationUsed: any;
  errorMessage: string;
  stackTrace?: string;
  workaround?: string;
}

// Example plugin bug
const pluginBugExample: PluginBug = {
  category: "plugin",
  buildTool: "vite",
  configurationUsed: {
    plugins: [metadramaVitePlugin({ verbose: true })],
  },
  errorMessage: "TypeError: Cannot read property transform of undefined",
  stackTrace: "...",
  workaround: "Downgrade to vite 4.x",
};
```

## Debugging Methodology

### 1. **Reproduction Strategy**

```typescript
// Create minimal reproducible examples
interface MinimalReproduction {
  sourceCode: string;
  configuration: any;
  expectedBehavior: string;
  actualBehavior: string;
  environment: {
    nodeVersion: string;
    typescriptVersion: string;
    buildTool: string;
    operatingSystem: string;
  };
}

function createReproductionTest(bug: BugReport): TestCase {
  return {
    name: `Bug reproduction: ${bug.title}`,
    code: bug.minimalExample,
    expect: {
      toCompile: bug.shouldCompile,
      toContain: bug.expectedOutput,
      diagnostics: bug.expectedDiagnostics,
    },
  };
}
```

### 2. **Root Cause Analysis**

```typescript
// Systematic debugging approach
interface RootCauseAnalysis {
  symptom: string;
  hypothesis: string[];
  investigation: InvestigationStep[];
  rootCause: string;
  solution: SolutionPlan;
}

interface InvestigationStep {
  step: string;
  method: "code-review" | "test-creation" | "logging" | "bisection";
  result: string;
  nextStep?: string;
}

// Example RCA process
function performRootCauseAnalysis(bug: BugReport): RootCauseAnalysis {
  return {
    symptom: "Memoize macro generates incorrect cache key",
    hypothesis: [
      "Key function serialization issue",
      "Scope resolution problem",
      "AST transformation order issue",
    ],
    investigation: [
      {
        step: "Add logging to key generation",
        method: "logging",
        result: "Key function is undefined in generated code",
        nextStep: "Check AST transformation order",
      },
      {
        step: "Examine AST transformation phases",
        method: "code-review",
        result: "Key function processed before declaration",
        nextStep: "Fix phase ordering",
      },
    ],
    rootCause: "Transform phases execute out of order",
    solution: {
      type: "code-change",
      description: "Reorder transformation phases",
      files: ["src/transform/phase-manager.ts"],
      tests: ["Add phase ordering tests"],
    },
  };
}
```

### 3. **Bisection for Regression Bugs**

```typescript
// Automated bisection for identifying regression commits
interface BisectionConfig {
  goodCommit: string;
  badCommit: string;
  testScript: string;
  skipCommits?: string[];
}

async function performBisection(config: BisectionConfig): Promise<string> {
  // Use git bisect to find the first bad commit
  let current = config.goodCommit;
  let steps = 0;

  while (current !== config.badCommit && steps < 20) {
    const testResult = await runTest(current, config.testScript);

    if (testResult.success) {
      current = getNextCommit(current, config.badCommit);
    } else {
      return current; // Found the regression commit
    }

    steps++;
  }

  throw new Error("Bisection failed to identify regression commit");
}
```

## Fix Implementation Strategy

### 1. **Test-Driven Bug Fixing**

```typescript
// Always write the failing test first
describe("Bug Fix: Memoize TTL not working", () => {
  test("should respect TTL configuration in generated code", () => {
    const input = `
      macro.memoize({ ttlMs: 5000 }).applyTo(
        pointcut.functions.name("expensiveOperation")
      )
      
      function expensiveOperation(x: number): number {
        return x * 2
      }
    `;

    const result = transform(input);

    // Test should fail before fix, pass after fix
    expect(result.code).toContain("ttlMs: 5000");
    expect(result.code).toContain("Date.now() - cached.timestamp < 5000");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(
      0
    );
  });

  test("should cache and expire values correctly at runtime", async () => {
    // Runtime test to verify behavior
    let callCount = 0;
    function testFunction(x: number) {
      callCount++;
      return x * 2;
    }

    const memoized = applyMemoizeMacro(testFunction, { ttlMs: 100 });

    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);

    expect(memoized(5)).toBe(10); // Should use cache
    expect(callCount).toBe(1);

    await sleep(150); // Wait for TTL expiration

    expect(memoized(5)).toBe(10); // Should call function again
    expect(callCount).toBe(2);
  });
});
```

### 2. **Safe Code Changes**

```typescript
// Principles for bug fix implementation

// ✅ Good: Minimal, targeted changes
function fixMemoizeTTL(options: MemoizeOptions, context: MacroContext): string {
  const ttlCheck = options.ttlMs
    ? `
    if (Date.now() - cached.timestamp > ${options.ttlMs}) {
      cache.delete(key)
      return undefined
    }
  `
    : "";

  return generateMemoizeCode(options, context, ttlCheck);
}

// ❌ Bad: Large refactoring during bug fix
function fixMemoizeTTL(options: MemoizeOptions, context: MacroContext): string {
  // Don't rewrite the entire macro system during a bug fix!
  return rewriteEntireMemoizeSystem(options, context);
}

// ✅ Good: Preserve existing behavior
function fixTransformPhaseOrdering(phases: TransformPhase[]): TransformPhase[] {
  // Only change the specific ordering issue
  const declarationPhase = phases.find((p) => p.type === "declaration");
  const usagePhase = phases.find((p) => p.type === "usage");

  if (declarationPhase && usagePhase) {
    return reorderPhases(phases, declarationPhase, usagePhase);
  }

  return phases; // No change if phases not found
}
```

### 3. **Regression Prevention**

```typescript
// Add comprehensive regression tests
describe("Regression Tests", () => {
  // Test for each fixed bug to ensure it doesn't return
  const regressionCases = [
    {
      bugId: "MD-123",
      description: "Memoize TTL not working",
      testCase: () => testMemoizeTTL(),
      fixedInVersion: "1.2.2",
    },
    {
      bugId: "MD-124",
      description: "Pointcut matching case sensitivity",
      testCase: () => testPointcutCaseSensitivity(),
      fixedInVersion: "1.2.3",
    },
  ];

  regressionCases.forEach(
    ({ bugId, description, testCase, fixedInVersion }) => {
      test(`${bugId}: ${description} (fixed in ${fixedInVersion})`, testCase);
    }
  );
});

// Performance regression testing
describe("Performance Regression Tests", () => {
  test("compilation performance should not regress", async () => {
    const largeCodebase = generateLargeTestCodebase(1000);
    const start = performance.now();

    await transform(largeCodebase);
    const duration = performance.now() - start;

    // Should complete within established baseline
    const baseline = getPerformanceBaseline("compilation.large-codebase");
    expect(duration).toBeLessThan(baseline * 1.1); // Allow 10% variance
  });
});
```

## Bug Fix Validation

### 1. **Multi-Environment Testing**

```typescript
// Test matrix for bug fixes
interface TestEnvironment {
  nodeVersion: string;
  typescriptVersion: string;
  buildTool: string;
  operatingSystem: "windows" | "macos" | "linux";
}

const testMatrix: TestEnvironment[] = [
  {
    nodeVersion: "16.x",
    typescriptVersion: "4.8.x",
    buildTool: "tsc",
    operatingSystem: "linux",
  },
  {
    nodeVersion: "18.x",
    typescriptVersion: "5.0.x",
    buildTool: "swc",
    operatingSystem: "windows",
  },
  {
    nodeVersion: "20.x",
    typescriptVersion: "5.2.x",
    buildTool: "vite",
    operatingSystem: "macos",
  },
  // ... more combinations
];

async function validateBugFix(bugFix: BugFix): Promise<ValidationReport> {
  const results: TestResult[] = [];

  for (const env of testMatrix) {
    const result = await runTestInEnvironment(bugFix.testCase, env);
    results.push(result);
  }

  return {
    success: results.every((r) => r.success),
    environments: results,
    recommendations: generateRecommendations(results),
  };
}
```

### 2. **Integration Testing**

```typescript
// Test bug fix doesn't break other functionality
describe("Integration Tests for Bug Fix", () => {
  test("memoize fix should not break retry macro", () => {
    const combined = `
      macro.memoize({ ttlMs: 5000 }).applyTo(getterMethods)
      macro.retry({ max: 3 }).applyTo(externalMethods)
    `;

    const result = transform(combined);

    expect(result.code).toContain("memoize");
    expect(result.code).toContain("retry");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(
      0
    );
  });

  test("transform fix should not affect other transform phases", () => {
    // Ensure the fix doesn't have unintended side effects
    const complexAspects = generateComplexAspectExample();
    const result = transform(complexAspects);

    expect(result.code).toMatchSnapshot(); // Should match known good output
  });
});
```

## Bug Communication and Documentation

### 1. **Bug Report Template**

````markdown
## Bug Report: [Short Description]

### Environment

- MetaDrama Version:
- TypeScript Version:
- Node.js Version:
- Build Tool: (Vite/SWC/TypeScript/Bun)
- Operating System:

### Description

[Clear description of the bug]

### Steps to Reproduce

1.
2.
3.

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happens]

### Minimal Reproduction

```typescript
// Minimal code that demonstrates the issue
```
````

### Workaround

[If any workaround exists]

### Additional Context

[Any other relevant information]

````

### 2. **Fix Documentation**

```typescript
// Document the fix in code comments
/**
 * Fix for MD-123: Memoize TTL not working
 *
 * Issue: Generated memoization code didn't include TTL expiration logic
 * Root Cause: TTL option was not being passed to code generation template
 * Solution: Added TTL check in generated cache lookup logic
 *
 * @see https://github.com/owner/metadrama/issues/123
 * @since v1.2.2
 */
function generateMemoizeCode(options: MemoizeOptions, context: MacroContext): string {
  const ttlCheck = options.ttlMs ?
    `if (Date.now() - cached.timestamp > ${options.ttlMs}) { /* ... */ }` :
    ''

  // ... rest of implementation
}
````

### 3. **Changelog Entries**

```markdown
## [1.2.2] - 2025-11-15

### Bug Fixes

- **Memoize TTL**: Fixed TTL expiration not working in memoize macro (#123)
- **Pointcut Matching**: Fixed case sensitivity in decorator name matching (#124)
- **Plugin Integration**: Fixed Vite plugin compatibility with Vite 5.x (#125)

### Performance Improvements

- Reduced compilation time for large codebases by 15% (#126)

### Internal Changes

- Added regression tests for all fixed bugs
- Improved error handling in transform pipeline
```

Remember: Every bug is an opportunity to make MetaDrama more robust. Fix the root cause, prevent regression, and make the developer experience better! 🐛➡️✨
