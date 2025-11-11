# Performance Optimization Guidelines

## Core Performance Principles

MetaDrama must be fast at both compile-time and runtime:

1. **Zero Runtime Overhead** - All aspects compile away to optimal code
2. **Fast Compilation** - Transform large codebases in seconds, not minutes
3. **Memory Efficient** - Handle enterprise codebases without OOM errors
4. **Incremental Processing** - Only retransform changed files
5. **Tree Shakeable** - Generated code should eliminate unused helpers

## Compilation Performance

### AST Processing Optimization

```typescript
// ✅ Good: Single-pass AST traversal with visitor pattern
function transformSourceFile(sourceFile: ts.SourceFile): TransformResult {
  const visitors = new VisitorRegistry();
  const context = createTransformContext();

  // Register all transformers upfront
  visitors.register("ClassDeclaration", transformClass);
  visitors.register("MethodDeclaration", transformMethod);
  visitors.register("CallExpression", transformMacroCall);

  // Single traversal handles all transformations
  return ts.visitNode(sourceFile, (node) => visitors.visit(node, context));
}

// ❌ Bad: Multiple passes over the same AST
function transformSourceFile(sourceFile: ts.SourceFile): TransformResult {
  let result = transformClasses(sourceFile); // First pass
  result = transformMethods(result); // Second pass
  result = transformMacros(result); // Third pass
  return result;
}
```

### Caching Strategies

```typescript
// Cache parsed AST and transformation results
const astCache = new LRUCache<string, ts.SourceFile>({ max: 1000 });
const transformCache = new LRUCache<string, TransformResult>({ max: 500 });

function getOrParseSourceFile(
  filename: string,
  content: string
): ts.SourceFile {
  const cacheKey = `${filename}:${hashContent(content)}`;

  let sourceFile = astCache.get(cacheKey);
  if (!sourceFile) {
    sourceFile = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest);
    astCache.set(cacheKey, sourceFile);
  }

  return sourceFile;
}

// Incremental compilation based on file dependencies
class IncrementalCompiler {
  private dependencyGraph = new Map<string, Set<string>>();
  private fileHashes = new Map<string, string>();

  shouldRecompile(filename: string, content: string): boolean {
    const newHash = hashContent(content);
    const oldHash = this.fileHashes.get(filename);

    if (oldHash !== newHash) {
      this.fileHashes.set(filename, newHash);
      return true;
    }

    // Check if dependencies changed
    const deps = this.dependencyGraph.get(filename) || new Set();
    return Array.from(deps).some((dep) =>
      this.shouldRecompile(dep, readFileContent(dep))
    );
  }
}
```

### Lazy Loading and Tree Shaking

```typescript
// ✅ Good: Lazy import optional dependencies
function createValidator(schema: TSchema) {
  // Only import TypeBox when validation is actually used
  const { TypeCompiler } = require("@sinclair/typebox/compiler");
  return TypeCompiler.Compile(schema);
}

// ✅ Good: Generate tree-shakeable runtime helpers
function generateMemoizeHelper(options: MemoizeOptions): string {
  const keyFunction = options.key
    ? `const key = (${options.key.toString()})(...args)`
    : `const key = JSON.stringify(args)`;

  return `
    export function __memoize_${uniqueId}(fn) {
      const cache = new Map()
      return function(...args) {
        ${keyFunction}
        if (cache.has(key)) return cache.get(key)
        const result = fn.apply(this, args)
        cache.set(key, result)
        return result
      }
    }
  `;
}
```

## Runtime Performance

### Generated Code Optimization

```typescript
// ✅ Good: Optimal generated code for around advice
function generateAroundAdvice(target: string, advice: string): string {
  return `
    const original_${target} = ${target}
    ${target} = function(...args) {
      const ctx = { 
        targetName: "${target}",
        args,
        proceed: () => original_${target}.apply(this, args)
      }
      return (${advice})(ctx)
    }
  `;
}

// ❌ Bad: Creates unnecessary closures and overhead
function generateAroundAdvice(target: string, advice: string): string {
  return `
    const original_${target} = ${target}
    ${target} = function(...args) {
      const wrapper = new AdviceWrapper("${target}", args, original_${target})
      const executor = new AdviceExecutor(${advice})
      return executor.execute(wrapper)
    }
  `;
}
```

### Memory Management

```typescript
// Efficient pointcut matching with compiled selectors
class CompiledPointcut {
  private matcher: (method: MethodInfo) => boolean;

  constructor(pointcut: PointcutExpression) {
    // Compile pointcut to efficient predicate function
    this.matcher = compilePointcutToFunction(pointcut);
  }

  matches(method: MethodInfo): boolean {
    return this.matcher(method);
  }
}

function compilePointcutToFunction(
  expr: PointcutExpression
): (method: MethodInfo) => boolean {
  if (expr.type === "decorator") {
    const decoratorName = expr.value;
    return (method) => method.decorators.includes(decoratorName);
  }

  if (expr.type === "namePattern") {
    const pattern = new RegExp(expr.value);
    return (method) => pattern.test(method.name);
  }

  if (expr.type === "and") {
    const left = compilePointcutToFunction(expr.left);
    const right = compilePointcutToFunction(expr.right);
    return (method) => left(method) && right(method);
  }

  throw new Error(`Unknown pointcut type: ${expr.type}`);
}
```

### Async Performance

```typescript
// ✅ Good: Proper async handling in advice
function generateAsyncAroundAdvice(target: string, advice: string): string {
  return `
    const original_${target} = ${target}
    ${target} = async function(...args) {
      const ctx = {
        targetName: "${target}",
        args,
        proceed: async (...proceedArgs) => original_${target}.apply(this, proceedArgs),
        wrap: (result, fn) => result && typeof result.then === 'function' 
          ? result.then(fn) 
          : fn(result)
      }
      return await (${advice})(ctx)
    }
  `;
}
```

## Benchmarking and Profiling

### Performance Tests

```typescript
// Establish performance baselines for common operations
describe("Performance Benchmarks", () => {
  test("should transform 1000 classes in under 5 seconds", async () => {
    const largeCodebase = generateTestCodebase(1000);

    const start = performance.now();
    const result = await transform(largeCodebase);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
    expect(result.errors).toHaveLength(0);
  });

  test("generated memoize helper should be faster than naive implementation", () => {
    const memoized = generateMemoizeHelper({ ttlMs: 60000 });
    const naive = (fn) => {
      /* naive memoization */
    };

    const testFn = (n) => fibonacci(n);
    const memoizedFn = memoized(testFn);
    const naiveFn = naive(testFn);

    // Warm up
    memoizedFn(40);
    naiveFn(40);

    const memoizedTime = benchmark(() => memoizedFn(40), 1000);
    const naiveTime = benchmark(() => naiveFn(40), 1000);

    expect(memoizedTime).toBeLessThan(naiveTime * 0.5); // At least 2x faster
  });
});
```

### Memory Profiling

```typescript
// Monitor memory usage during transformation
function profileTransformation(sourceCode: string): PerformanceMetrics {
  const startMem = process.memoryUsage();
  const startTime = performance.now();

  const result = transform(sourceCode);

  const endTime = performance.now();
  const endMem = process.memoryUsage();

  return {
    duration: endTime - startTime,
    memoryDelta: {
      rss: endMem.rss - startMem.rss,
      heapUsed: endMem.heapUsed - startMem.heapUsed,
      heapTotal: endMem.heapTotal - startMem.heapTotal,
      external: endMem.external - startMem.external,
    },
    transformedLines: sourceCode.split("\n").length,
    resultSize: result.code.length,
  };
}
```

## Performance Budgets

Set strict performance budgets for different scenarios:

### Compilation Budgets

- **Single file transformation**: < 50ms for files under 1000 lines
- **Project compilation**: < 5s for projects under 100k lines
- **Memory usage**: < 500MB peak for enterprise codebases
- **Cache hit ratio**: > 90% for incremental builds

### Runtime Budgets

- **Advice overhead**: < 5% performance impact vs hand-written code
- **Memory footprint**: Generated helpers < 1KB per macro usage
- **Cold start**: First advice execution < 10ms
- **Bundle size**: Runtime helpers < 5KB when tree-shaken

### Monitoring Performance

```typescript
// Add performance monitoring to CLI
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];

  startOperation(name: string): PerformanceToken {
    return {
      name,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
    };
  }

  endOperation(token: PerformanceToken): PerformanceMetrics {
    const metrics = {
      name: token.name,
      duration: performance.now() - token.startTime,
      memoryDelta: this.calculateMemoryDelta(token.startMemory),
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);

    if (metrics.duration > this.getBudget(token.name)) {
      console.warn(
        `⚠️ Performance budget exceeded for ${
          token.name
        }: ${metrics.duration.toFixed(2)}ms`
      );
    }

    return metrics;
  }

  generateReport(): string {
    return this.metrics
      .map((m) => `${m.name}: ${m.duration.toFixed(2)}ms`)
      .join("\n");
  }
}
```

Remember: Performance is a feature, not an afterthought. Every transformation should make code faster, not slower! ⚡
