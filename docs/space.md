# Compile-Time vs Runtime Space

This document explains in detail which parts of the MetaDrama library operate at compile time versus runtime, and how decorators, reflection, and metadata are handled throughout the transformation process.

## Overview

MetaDrama is fundamentally a **compile-time framework** that transforms TypeScript code during the build process, generating optimized JavaScript with embedded cross-cutting concerns. The framework minimizes runtime dependencies and eliminates most reflection-based operations through static analysis and code generation.

## Compile-Time Components

### 1. Transform Pipeline (100% Compile-Time)

All transformation logic runs exclusively during the build process:

#### **SWC Transform Engine** (`src/plugin/swc.ts`)

- **When**: During `bun build`, `swc compile`, or bundler execution
- **Purpose**: Primary code transformation engine
- **Operations**:
  - AST parsing and analysis
  - Decorator detection and extraction
  - Method signature analysis
  - Code generation and injection

```typescript
// Compile-time operation: Decorator detection
const decoratorRegex = /@(\w+)\s*\(\s*\)/g;
const matches = code.matchAll(decoratorRegex);
// This happens during build, not runtime
```

#### **TypeScript Compiler Integration** (`src/plugin/ts-patch.ts`)

- **When**: During `tsc` compilation with ts-patch
- **Purpose**: Direct TypeScript AST manipulation
- **Operations**:
  - AST visitor pattern traversal
  - Type information preservation
  - Declaration file generation
  - Source map coordination

```typescript
// Compile-time AST visitor
function visitClassDeclaration(node: ts.ClassDeclaration): ts.Node {
  // This transformation happens during TypeScript compilation
  const decorators = node.decorators;
  if (hasServiceDecorator(decorators)) {
    return transformServiceClass(node);
  }
  return node;
}
```

#### **Code Weaving Engine** (`src/transform/weave.ts`)

- **When**: During transformation phase of build
- **Purpose**: Inject advice logic into method bodies
- **Operations**:
  - Method boundary detection
  - Advice code generation
  - Context preservation
  - Error handling injection

```typescript
// Generated at compile-time, executed at runtime
const adviceWrapper = `
// Around advice: ${adviceId}
const __start = performance.now();
console.log('[advice] entering ${methodName}');

const __originalMethod = ${originalMethodBody};

try {
  const __result = await __originalMethod();
  const __duration = performance.now() - __start;
  console.log('[advice] ${methodName} took ' + __duration.toFixed(2) + 'ms');
  return __result;
} catch (error) {
  console.error('[advice] ${methodName} failed:', error);
  throw error;
}
`;
```

### 2. Configuration Processing (Compile-Time)

#### **Aspect Configuration Loading** (`src/core/config.ts`)

- **When**: At the start of each build process
- **Purpose**: Load and execute aspect definitions
- **Operations**:
  - Dynamic import of `aspect.config.ts`
  - Registry population with advice and macros
  - Pointcut pattern compilation
  - Validation of configuration structure

```typescript
// Happens once per build
export async function loadConfig(configPath: string) {
  const config = await import(configPath);
  // All pointcuts and advice are registered here
  // No runtime discovery needed
}
```

#### **Pointcut Compilation** (`src/core/pointcut.ts`)

- **When**: During configuration loading
- **Purpose**: Convert pointcut patterns to matching logic
- **Operations**:
  - Regex compilation for name patterns
  - Decorator filter preparation
  - Conditional predicate validation
  - Optimization of matching algorithms

```typescript
// Compiled at build time
const compiledPointcut = {
  decoratorPattern: /^Service$/,
  namePattern: /^get/,
  matchFunction: (target) =>
    target.decorators.includes("Service") && target.name.startsWith("get"),
};
```

### 3. Macro Expansion (Compile-Time)

#### **Memoize Macro** (`src/transform/expand-macro.ts`)

- **When**: During AST transformation
- **Purpose**: Generate caching logic inline
- **Output**: Direct JavaScript code, no runtime library calls

```typescript
// Input (compile-time)
macro.memoize({ ttlMs: 60000 }).applyTo(expensiveMethods);

// Output (generated at compile-time, executed at runtime)
if (!this.__MyClass_getData_cache) {
  this.__MyClass_getData_cache = new Map();
}

const __cacheKey = JSON.stringify(arguments);
const __now = Date.now();
const __cached = this.__MyClass_getData_cache.get(__cacheKey);

if (__cached && (!__cached.expiry || __cached.expiry > __now)) {
  console.log("[memoize] cache hit for getData(" + __cacheKey + ")");
  return __cached.value;
}

console.log("[memoize] cache miss for getData(" + __cacheKey + ")");
const __result = await originalMethod();

this.__MyClass_getData_cache.set(__cacheKey, {
  value: __result,
  expiry: __now + 60000,
});
```

#### **Retry Macro** (Compile-Time Generation)

```typescript
// Generated retry logic (no runtime retry library)
let __attempt = 0;
while (true) {
  try {
    return await originalMethod();
  } catch (error) {
    if (__attempt >= 3) throw error;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.pow(2, __attempt) * 100)
    );
    __attempt++;
  }
}
```

## Runtime Components (Minimal)

### 1. Generated Code Execution (Runtime)

The generated JavaScript code executes at runtime, but contains **no MetaDrama library dependencies**:

```javascript
// Pure JavaScript output - no framework dependencies
class InventoryService {
  async getStock(location) {
    // All this code was generated at compile-time
    const __start = performance.now();
    console.log("[advice] entering getStock");

    try {
      // Original method logic (preserved exactly)
      const result = await this.fetchFromDatabase(location);

      const __duration = performance.now() - __start;
      console.log("[advice] getStock took " + __duration.toFixed(2) + "ms");
      return result;
    } catch (error) {
      console.error("[advice] getStock failed:", error);
      throw error;
    }
  }
}
```

### 2. Context Objects (Runtime)

Minimal context objects for advice execution:

```typescript
// Generated context (no reflection needed)
const ctx = {
  targetName: "getStock",
  args: [location],
  proceed: () => originalMethod.call(this, ...arguments),
  wrap: (result, fn) =>
    result instanceof Promise ? result.then(fn) : fn(result),
};
```

### 3. Cache Storage (Runtime)

Generated cache variables for memoization:

```javascript
// Instance variables created by memoize macro
this.__InventoryService_getStock_cache = new Map();
this.__InventoryService_updateStock_cache = new Map();
```

## Decorator Handling

### Compile-Time Decorator Processing

MetaDrama handles decorators through **static analysis** rather than runtime reflection:

#### **Decorator Detection**

```typescript
// Compile-time regex matching (not Reflect.getMetadata)
const decoratorPattern = /@(\w+)(?:\s*\([^)]*\))?\s*$/gm;
const decorators = sourceCode.match(decoratorPattern);
```

#### **Decorator Information Extraction**

```typescript
// Parsed at compile-time
const decoratorInfo = {
  name: "Service",
  arguments: [],
  target: "InventoryService",
  position: { line: 5, column: 1 },
};
```

#### **No Runtime Decorator Dependencies**

- **No `reflect-metadata`**: Not required or used
- **No `Reflect.getMetadata()`**: All metadata resolved at compile-time
- **No decorator factories at runtime**: All decorators are analyzed statically

```typescript
// Traditional reflection approach (NOT used by MetaDrama)
const metadata = Reflect.getMetadata("design:type", target, propertyKey); // ❌

// MetaDrama approach (compile-time analysis)
const typeInfo = analyzeTypeFromAST(node); // ✅ Compile-time
```

## Reflection vs Static Analysis

### What MetaDrama Avoids (Traditional Reflection)

```typescript
// Traditional runtime reflection (NOT used)
class TraditionalFramework {
  static discoverMethods(target: any) {
    const prototype = target.prototype;
    const methods = Object.getOwnPropertyNames(prototype); // Runtime discovery

    for (const method of methods) {
      const metadata = Reflect.getMetadata("advice", target, method); // Runtime metadata
      if (metadata) {
        this.applyAdvice(target, method, metadata); // Runtime weaving
      }
    }
  }
}
```

### What MetaDrama Does Instead (Static Analysis)

```typescript
// Compile-time static analysis (MetaDrama approach)
function analyzeClass(node: ClassDeclaration): ClassInfo {
  const methods = node.members.filter(isMethodDeclaration).map((method) => ({
    name: method.name.getText(),
    async: method.modifiers?.some((m) => m.kind === SyntaxKind.AsyncKeyword),
    decorators: extractDecorators(method),
    parameters: analyzeParameters(method.parameters),
  }));

  return { methods, decorators: extractDecorators(node) };
}
```

## Memory and Performance Characteristics

### Compile-Time Memory Usage

```typescript
// Build-time memory footprint
interface BuildTimeState {
  ast: TypeScriptAST; // ~10-50MB for large projects
  registry: AdviceRegistry; // ~1-5MB
  transformCache: Map<string, TransformResult>; // ~5-20MB
  diagnostics: DiagnosticEntry[]; // ~1-2MB
}
```

### Runtime Memory Usage

```javascript
// Runtime memory footprint (minimal)
class TransformedClass {
  // Only generated cache variables (if using memoize)
  __TransformedClass_method_cache = new Map(); // ~1KB per method

  // No framework objects
  // No reflection metadata
  // No runtime registry
  // No pointcut matching logic
}
```

## Zero Runtime Dependencies

### What's NOT in the Generated Code

- ❌ MetaDrama library imports
- ❌ Pointcut matching logic
- ❌ Advice registry
- ❌ Reflection utilities
- ❌ Configuration objects
- ❌ Transform pipeline

### What IS in the Generated Code

- ✅ Pure JavaScript/TypeScript
- ✅ Inlined advice logic
- ✅ Direct method implementations
- ✅ Optimized control flow
- ✅ Native performance characteristics

## Build Tool Integration Points

### SWC Integration

```typescript
// Runs during SWC compilation
export function transform(code: string, filename: string): TransformResult {
  const ast = parse(code);
  const transformedAst = applyAdvice(ast);
  return generate(transformedAst);
}
```

### TypeScript Integration

```typescript
// Runs during tsc compilation
export default function createTransformer(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
    return visitNode(sourceFile, visitor);
  };
}
```

### Vite Integration

```typescript
// Runs during Vite build/dev
export const metadramaVitePlugin = (): Plugin => ({
  name: "metadrama-transform",
  transform(code, id) {
    return transformWithSwc(code, id);
  },
});
```

## Summary

MetaDrama achieves its performance and simplicity through a clear separation of concerns:

- **Compile-Time**: Complex analysis, pointcut matching, code generation, optimization
- **Runtime**: Simple execution of generated code with zero framework dependencies
- **No Reflection**: Static analysis replaces runtime reflection entirely
- **No Metadata**: All decorator information processed at build time
- **Pure Output**: Generated code is indistinguishable from hand-written JavaScript

This architecture ensures that the full power of aspect-oriented programming is available with the performance characteristics of hand-optimized code.
