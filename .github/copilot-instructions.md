# GitHub Copilot Instructions for MetaDrama

> **Core Philosophy**: MetaDrama is an aspect-oriented programming framework that transforms TypeScript at compile-time. Every change should preserve type safety, maintain zero runtime overhead, and keep the developer experience delightful.

## 🎯 Project Overview

MetaDrama enables developers to:

- Apply aspects (before/after/around advice) to methods using pointcut selectors
- Use compile-time macros (memoize, retry, trace, validate) that expand to optimized code
- Validate architecture rules and enforce patterns at build time
- Integrate seamlessly with TypeScript, SWC, Vite, and Bun

## 🏗️ Architecture Principles

### Core Design Rules

- **Compile-Time First**: All transformations happen at build time, zero runtime overhead
- **Type Safety**: Never emit `any` in public APIs; use conditional types from `src/core/types.ts`
- **Pure Functions**: Transformer logic should be pure functions that accept context and return new IR nodes
- **Immutable State**: Never mutate shared state; always return new objects
- **Diagnostic Quality**: Every error should include `code`, `summary`, and actionable `fix` suggestions

### Module Dependencies

- `src/core/*` - Foundation types and utilities (no external dependencies except Node.js built-ins)
- `src/transform/*` - AST transformation logic (depends only on core)
- `src/macros/*` - Macro factories (depends only on core utilities)
- `src/runtime/*` - Runtime helpers (minimal, tree-shakeable)
- `src/plugin/*` - Build tool integrations (isolated per tool)

## 📝 Code Style & Patterns

### TypeScript Conventions

```typescript
// ✅ Good: Preserve inference with helpers
function createPointcut<T extends MethodSignature>(
  matcher: (sig: T) => boolean
) {
  return new PointcutBuilder(matcher);
}

// ❌ Bad: Explicit interface that kills inference
interface PointcutConfig {
  matcher: (sig: any) => boolean;
}
```

### Diagnostic Messages

```typescript
// ✅ Good: Human-readable with actionable fix
{
  code: "MD1003",
  level: "error",
  message: "Transform failed: unable to parse decorated class",
  file: "src/service.ts",
  span: { line: 15, column: 8 },
  hint: "Ensure the class has a valid decorator syntax: @Service()"
}

// ❌ Bad: Cryptic message without context
{
  code: "ERR",
  message: "Parse failed"
}
```

### Transform Functions

```typescript
// ✅ Good: Pure function with typed context
function expandMacro(node: CallExpression, ctx: PhaseContext): Statement[] {
  const macroName = extractMacroName(node);
  const config = extractMacroConfig(node);
  return generateExpandedCode(macroName, config, ctx);
}

// ❌ Bad: Mutating global state
function expandMacro(node: CallExpression) {
  globalRegistry.currentMacro = node; // Don't mutate globals!
  return modifyNodeInPlace(node); // Don't mutate inputs!
}
```

## 🎭 Aspect-Oriented Programming Guidelines

### Pointcut Patterns

```typescript
// ✅ Target with precision using fluent API
pointcut.classes.withDecorator("Service").methods.name(/^(get|fetch)/).async;

// ✅ Complex conditions with where()
pointcut.functions.where(
  (fn) => fn.parameters.length > 2 && fn.name.includes("process")
);

// ❌ Overly broad selectors that catch too much
pointcut.classes.methods; // Too broad!
```

### Advice Implementation

```typescript
// ✅ Good: Proper context handling with wrap()
around(targetMethods)((ctx) => {
  const start = performance.now();
  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    recordMetric(ctx.targetName, performance.now() - start);
    return value;
  });
});

// ❌ Bad: Not using wrap() for async results
around(targetMethods)((ctx) => {
  const result = ctx.proceed(...ctx.args);
  recordMetric(ctx.targetName, 123); // Lost async timing!
  return result;
});
```

## ⚡ Macro Development

### Macro Factory Pattern

```typescript
// ✅ Good: Factory function with options
export function memoize(options: MemoizeOptions = {}) {
  return {
    applyTo(pointcut: Pointcut) {
      return registerMacro("memoize", pointcut, options);
    },
  };
}

// ✅ Lazy import for optional dependencies
function createValidator(schema: TSchema) {
  const { TypeCompiler } = require("@sinclair/typebox/compiler");
  return TypeCompiler.Compile(schema);
}
```

### Runtime Helper Generation

```typescript
// ✅ Good: Generate minimal, tree-shakeable helpers
function generateMemoizeHelper(options: MemoizeOptions): string {
  return `
    function __memoize_${uniqueId}(fn, options) {
      const cache = new Map()
      return function(...args) {
        const key = ${generateKeyFunction(options.key)}
        if (cache.has(key)) return cache.get(key)
        const result = fn.apply(this, args)
        cache.set(key, result)
        return result
      }
    }
  `;
}
```

## 🔧 Build Tool Integration

### Plugin Architecture

```typescript
// ✅ Each plugin should be self-contained
export function createVitePlugin(options: PluginOptions = {}) {
  return {
    name: "metadrama",
    transform(code: string, id: string) {
      if (!shouldTransform(id)) return null;
      return transformWithMetaDrama(code, id, options);
    },
  };
}

// ✅ Consistent error handling across plugins
function handleTransformError(error: Error, filename: string) {
  const diagnostic = createDiagnostic({
    code: "MD1006",
    level: "error",
    message: `SWC transformation failed: ${error.message}`,
    file: filename,
    hint: "Check TypeScript syntax and aspect configuration",
  });

  return { code: null, diagnostics: [diagnostic] };
}
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
// ✅ Good: Descriptive test with setup and verification
test("memoize macro should cache function results with custom key", () => {
  const sourceCode = `
    macro.memoize({ 
      key: (id) => \`user:\${id}\`,
      ttlMs: 5000 
    }).applyTo(pointcut.functions.name("getUser"))
  `;

  const result = transform(sourceCode);

  expect(result.code).toContain("__memoize_");
  expect(result.code).toContain("user:");
  expect(result.diagnostics).toHaveLength(0);
});

// ✅ Test error conditions
test("should emit diagnostic for invalid pointcut", () => {
  const invalidCode = `pointcut.classes.invalidMethod()`;
  const result = transform(invalidCode);

  expect(result.diagnostics).toHaveLength(1);
  expect(result.diagnostics[0].code).toBe("MD1008");
});
```

## 🚀 Performance Considerations

### Compilation Performance

- Use lazy imports for optional dependencies
- Cache AST parsing results when possible
- Prefer iterative algorithms over recursive for large codebases
- Implement early bailouts for non-target files

### Runtime Performance

- Generated code should be equivalent to hand-written optimized code
- Avoid creating closures in hot paths
- Use `Object.create(null)` for cache objects
- Prefer Maps over Objects for dynamic keys

## 🐛 Common Pitfalls to Avoid

### AST Manipulation

```typescript
// ❌ Don't mutate original AST nodes
function transform(node: MethodDeclaration) {
  node.body = newBody; // Mutates original!
  return node;
}

// ✅ Create new nodes
function transform(node: MethodDeclaration): MethodDeclaration {
  return {
    ...node,
    body: generateNewBody(node),
  };
}
```

### Error Handling

```typescript
// ❌ Don't throw during transformation
function processAdvice(advice: AdviceConfig) {
  if (!advice.pointcut) {
    throw new Error("No pointcut!"); // Crashes build!
  }
}

// ✅ Collect diagnostics
function processAdvice(advice: AdviceConfig): ProcessResult {
  if (!advice.pointcut) {
    return {
      success: false,
      diagnostics: [
        createDiagnostic({
          code: "MD1001",
          message: "Advice registration failed: no pointcut provided",
        }),
      ],
    };
  }
}
```

## 📚 Documentation Standards

### API Documentation

- Every public function needs JSDoc with examples
- Include TypeScript signatures that show inference
- Provide both simple and advanced usage examples
- Document performance characteristics for macros

### Error Messages

- Start with what went wrong
- Explain why it's a problem
- Suggest specific fixes
- Include relevant file/line information

## 🎯 When to Use Copilot Suggestions

### ✅ Good Copilot Use Cases

- Generating boilerplate AST manipulation code
- Creating test cases with setup/teardown
- Writing TypeScript interface definitions
- Implementing common patterns (builders, factories)
- Generating documentation examples

### ⚠️ Review Carefully

- Complex pointcut matching logic
- AST transformation algorithms
- Error handling and diagnostic generation
- Performance-critical runtime helpers
- Plugin integration code

### ❌ Avoid Copilot For

- Core architecture decisions
- Breaking API changes
- Complex type-level programming
- Security-related transformations

## 🎪 MetaDrama-Specific Patterns

### Registry Pattern

```typescript
// Always go through the registry for shared state
const adviceId = registry.registerAdvice("around", pointcut, adviceFunction);
const macros = registry.getMacros(methodSignature);
```

### Phase Context

```typescript
// Pass context through transformation phases
function transformPhase(node: Node, ctx: PhaseContext): TransformResult {
  const newCtx = ctx.withFile(fileName).withPhase("expand");
  return processNode(node, newCtx);
}
```

### Unique Symbol Generation

```typescript
// Use registry for collision-free symbols
const memoKey = registry.generateSymbol("memoize", methodSignature);
const adviceWrapper = registry.generateSymbol("advice", pointcutId);
```

Remember: MetaDrama is about making the complex simple and the impossible possible. Every line of code should serve that mission! 🎭
