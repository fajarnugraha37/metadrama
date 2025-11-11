# Architecture Guidelines for MetaDrama

## Core Architecture Principles

1. **Registry-First Design**: Implement the registry (`src/core/registry.ts`) before advice helpers so decorators can share a single source of truth.

2. **Diagnostic Integrity**: Diagnostics must be synchronous and side-effect free; store them on the registry `timeline` for the CLI to consume later.

3. **Test-Driven Validation**: Run `bun run test` after editing any file touching `src/transform/*`.

## Module Dependency Rules

### Dependency Hierarchy (from foundation to application)

```
src/core/*          (Foundation - no external deps except Node.js built-ins)
    ↓
src/transform/*     (Transformations - depends only on core)
    ↓
src/macros/*        (Macro factories - depends only on core utilities)
    ↓
src/runtime/*       (Runtime helpers - minimal, tree-shakeable)
    ↓
src/plugin/*        (Build integrations - isolated per tool)
    ↓
src/cli/*           (Command-line interface - depends on all layers)
```

### Architectural Constraints

- **No Circular Dependencies**: Enforce with ESLint rules
- **Pure Transform Functions**: All transformers must be pure functions
- **Immutable Operations**: Never mutate input nodes or shared state
- **Phase Separation**: Clear separation between parse, analyze, transform, generate phases

## Registry Architecture

The registry is the central coordination point:

```typescript
interface Registry {
  // Advice management
  registerAdvice(
    type: AdviceType,
    pointcut: Pointcut,
    advice: Function
  ): string;
  getAdvice(signature: MethodSignature): AdviceEntry[];

  // Macro management
  registerMacro(name: string, pointcut: Pointcut, options: any): string;
  getMacros(signature: MethodSignature): MacroEntry[];

  // Symbol generation (collision-free)
  generateSymbol(prefix: string, context?: any): string;

  // Diagnostic collection
  addDiagnostic(diagnostic: DiagnosticEntry): void;
  getDiagnostics(): DiagnosticEntry[];

  // State management
  reset(): void;
  snapshot(): RegistrySnapshot;
  restore(snapshot: RegistrySnapshot): void;
}
```

## Transform Pipeline Architecture

### Phase Structure

1. **Parse Phase**: Convert source to AST (use existing TypeScript parser)
2. **Analyze Phase**: Build symbol table, resolve pointcuts, collect metadata
3. **Transform Phase**: Apply aspects and expand macros
4. **Generate Phase**: Emit transformed code with source maps

### Context Propagation

```typescript
interface PhaseContext {
  readonly fileName: string;
  readonly phase: "parse" | "analyze" | "transform" | "generate";
  readonly registry: Registry;
  readonly sourceFile: SourceFile;

  // Immutable updates
  withFile(fileName: string): PhaseContext;
  withPhase(phase: PhaseType): PhaseContext;
  withSourceFile(sourceFile: SourceFile): PhaseContext;
}
```

### Error Handling Strategy

- **Never throw during transformation** - collect diagnostics instead
- **Graceful degradation** - continue processing when possible
- **Rich context** - include file, line, column, and fix suggestions
- **Structured errors** - use diagnostic codes for programmatic handling

## AST Manipulation Patterns

### Visitor Pattern Implementation

```typescript
// ✅ Good: Immutable visitor pattern
interface ASTVisitor<T> {
  visit(node: Node, context: PhaseContext): VisitResult<T>;
}

interface VisitResult<T> {
  node: Node | Node[]; // Transformed nodes
  data?: T; // Collected data
  diagnostics: DiagnosticEntry[];
}

// ✅ Transform functions should be pure
function transformMethod(
  node: MethodDeclaration,
  advice: AdviceEntry[],
  context: PhaseContext
): MethodDeclaration {
  return {
    ...node,
    body: generateAdviceWrappedBody(node.body, advice, context),
  };
}
```

### Node Creation Helpers

```typescript
// Provide helpers for common AST operations
export const astHelpers = {
  createAroundAdvice(target: string, advice: string): Statement[],
  createMemoizeWrapper(fn: string, options: MemoizeOptions): Expression,
  createDiagnosticCall(code: string, message: string): CallExpression
}
```

## Plugin Architecture

### Plugin Interface Consistency

All plugins must implement the same core interface pattern:

```typescript
interface PluginOptions {
  include?: string | string[];
  exclude?: string | string[];
  verbose?: boolean;
}

interface TransformResult {
  code: string | null;
  map?: string;
  diagnostics: DiagnosticEntry[];
}

type PluginFactory<T = any> = (options?: PluginOptions) => T;
```

### Build Tool Abstraction

```typescript
// Abstract common build tool operations
interface BuildToolAdapter {
  shouldTransform(filename: string, options: PluginOptions): boolean;
  readFile(filename: string): Promise<string>;
  emitDiagnostic(diagnostic: DiagnosticEntry): void;
  createSourceMap(original: string, transformed: string): string;
}
```

## Performance Architecture

### Compilation Performance

- **Incremental Processing**: Only retransform changed files
- **Caching Strategy**: Cache AST parsing and transformation results
- **Parallel Processing**: Transform files in parallel when possible
- **Early Bailout**: Skip transformation for files without aspects

### Memory Management

- **Bounded Caches**: Use LRU caches with size limits
- **Weak References**: Don't hold onto large objects unnecessarily
- **Stream Processing**: Process large codebases without loading everything into memory

## Testing Architecture

### Test Categories

- **Unit Tests**: Individual functions and classes (`*.test.ts`)
- **Integration Tests**: Component interactions (`*.integration.test.ts`)
- **Transform Tests**: Code generation validation (`*.transform.test.ts`)
- **Plugin Tests**: Build tool integrations (`plugin/*.test.ts`)

### Test Utilities Structure

```typescript
// Centralized test utilities
export const testHelpers = {
  transform: (code: string, options?: TransformOptions) => TransformResult,
  mockRegistry: () => Registry,
  createContext: (overrides?: Partial<PhaseContext>) => PhaseContext,
  expectDiagnostic: (diagnostics: DiagnosticEntry[], code: string) => void
}
```

Remember: Architecture is the foundation that enables everything else. Get it right, and features become easy to add! 🏗️
