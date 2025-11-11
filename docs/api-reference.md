# API Reference

Complete API reference for MetaDrama's aspect-oriented programming framework.

## Core Types

### PointcutBuilder

The main interface for creating pointcuts to target code elements.

```typescript
interface PointcutBuilder {
  classes: ClassSelector;
  functions: FunctionSelector;
  methods: MethodSelector;
}
```

### ClassSelector

Targets classes based on various criteria.

```typescript
interface ClassSelector {
  withDecorator(name: string): ClassMatchBuilder;
  name(pattern: string | RegExp): ClassMatchBuilder;
  where(predicate: (cls: ClassInfo) => boolean): ClassMatchBuilder;

  readonly methods: MethodSelector;
}
```

#### Methods

- **`withDecorator(name: string)`**: Select classes with specific decorator
- **`name(pattern: string | RegExp)`**: Select classes by name pattern
- **`where(predicate: Function)`**: Select classes with custom logic

#### Example

```typescript
// Target all classes with @Service decorator
const serviceClasses = pointcut.classes.withDecorator("Service");

// Target classes matching name pattern
const apiClasses = pointcut.classes.name(/^Api/);

// Target classes with custom condition
const largeClasses = pointcut.classes.where((cls) => cls.methods.length > 10);
```

### MethodSelector

Targets methods within classes or standalone functions.

```typescript
interface MethodSelector {
  name(pattern: string | RegExp | string[]): MethodMatchBuilder;
  where(predicate: (method: MethodInfo) => boolean): MethodMatchBuilder;
  async: MethodMatchBuilder;
  sync: MethodMatchBuilder;
}
```

#### Methods

- **`name(pattern)`**: Select methods by name pattern or array of names
- **`where(predicate)`**: Select methods with custom logic
- **`async`**: Select only async methods
- **`sync`**: Select only synchronous methods

#### Example

```typescript
// Target getter methods
const getterMethods = pointcut.classes
  .withDecorator("Service")
  .methods.name(/^get/);

// Target specific methods
const crudMethods = serviceMethods.name(["create", "update", "delete"]);

// Target async methods only
const asyncMethods = serviceMethods.async;
```

### FunctionSelector

Targets standalone functions.

```typescript
interface FunctionSelector {
  name(pattern: string | RegExp): FunctionMatchBuilder;
  where(predicate: (fn: FunctionInfo) => boolean): FunctionMatchBuilder;
  exported: FunctionMatchBuilder;
}
```

## Advice Functions

### around

Wraps target methods with complete control over execution.

```typescript
function around(pointcut: Pointcut): (advice: AroundAdvice) => void;

type AroundAdvice = (ctx: ExecutionContext) => any;
```

#### ExecutionContext

```typescript
interface ExecutionContext {
  targetName: string;
  args: any[];
  proceed(...args: any[]): any;
  wrap<T>(value: T, fn: (v: T) => T): T;
}
```

#### Example

```typescript
around(serviceMethods)((ctx) => {
  const start = performance.now();
  console.log(`[${ctx.targetName}] Starting with args:`, ctx.args);

  try {
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      const duration = performance.now() - start;
      console.log(`[${ctx.targetName}] Completed in ${duration}ms`);
      return value;
    });
  } catch (error) {
    console.error(`[${ctx.targetName}] Failed:`, error);
    throw error;
  }
});
```

### before

Executes code before target methods.

```typescript
function before(pointcut: Pointcut): (advice: BeforeAdvice) => void;

type BeforeAdvice = (ctx: BeforeContext) => void | Promise<void>;
```

#### BeforeContext

```typescript
interface BeforeContext {
  targetName: string;
  args: any[];
}
```

#### Example

```typescript
before(serviceMethods)((ctx) => {
  logger.info(`Starting ${ctx.targetName}`, { args: ctx.args });
  validateArguments(ctx.args);
});
```

### after

Executes code after target methods.

```typescript
function after(pointcut: Pointcut): (advice: AfterAdvice) => void;

type AfterAdvice = (ctx: AfterContext) => void | Promise<void>;
```

#### AfterContext

```typescript
interface AfterContext {
  targetName: string;
  args: any[];
  result: any;
  error?: Error;
}
```

#### Example

```typescript
after(serviceMethods)((ctx) => {
  if (ctx.error) {
    logger.error(`${ctx.targetName} failed`, {
      error: ctx.error,
      args: ctx.args,
    });
  } else {
    logger.info(`${ctx.targetName} succeeded`, { result: ctx.result });
  }
});
```

## Macro System

### macro.memoize

Adds intelligent caching to methods.

```typescript
interface MemoizeOptions {
  ttlMs?: number;
  key?: (...args: any[]) => string;
  maxSize?: number;
}

function memoize(options?: MemoizeOptions): MacroApplication;
```

#### Options

- **`ttlMs`**: Time-to-live in milliseconds (default: no expiry)
- **`key`**: Custom key generation function (default: JSON.stringify)
- **`maxSize`**: Maximum cache entries (default: unlimited)

#### Example

```typescript
// Basic memoization
macro.memoize().applyTo(expensiveMethods);

// With TTL and custom key
macro
  .memoize({
    ttlMs: 300_000, // 5 minutes
    key: (userId, fields) => `user:${userId}:${fields?.join(",")}`,
    maxSize: 1000,
  })
  .applyTo(userDataMethods);
```

### macro.retry

Adds retry logic with configurable backoff strategies.

```typescript
interface RetryOptions {
  max: number;
  backoff?: "exp" | "linear" | "none";
  baseMs?: number;
  maxDelayMs?: number;
  retryable?: (error: any) => boolean;
}

function retry(options: RetryOptions): MacroApplication;
```

#### Options

- **`max`**: Maximum retry attempts (required)
- **`backoff`**: Backoff strategy (default: 'none')
- **`baseMs`**: Base delay in milliseconds (default: 25)
- **`maxDelayMs`**: Maximum delay cap (default: unlimited)
- **`retryable`**: Function to determine if error should be retried

#### Example

```typescript
// Basic retry
macro.retry({ max: 3 }).applyTo(networkMethods);

// Advanced retry with custom logic
macro
  .retry({
    max: 5,
    backoff: "exp",
    baseMs: 100,
    maxDelayMs: 10000,
    retryable: (error) => error.code !== "AUTH_FAILED",
  })
  .applyTo(externalApiMethods);
```

### macro.trace

Adds performance monitoring and tracing.

```typescript
interface TraceOptions {
  label?: string;
  logger?: (message: string, payload: Record<string, unknown>) => void;
  threshold?: number;
}

function trace(options?: TraceOptions): MacroApplication;
```

#### Options

- **`label`**: Custom label for trace messages (default: method name)
- **`logger`**: Custom logging function (default: console.debug)
- **`threshold`**: Log slow operations above this threshold (ms)

#### Example

```typescript
// Basic tracing
macro.trace().applyTo(performanceCriticalMethods);

// Custom tracing with threshold
macro
  .trace({
    label: "api",
    threshold: 1000,
    logger: (message, payload) => {
      if (payload.duration > 1000) {
        console.warn(`Slow operation: ${message}`, payload);
      }
    },
  })
  .applyTo(apiMethods);
```

### macro.validate

Adds schema validation using TypeBox.

```typescript
interface ValidateOptions<TSchema = any> {
  schema: TSchema;
  mode?: "args" | "result" | "both";
  project?: (args: any[], result?: any) => any;
}

function validate<T>(options: ValidateOptions<T>): MacroApplication;
```

#### Options

- **`schema`**: TypeBox schema for validation (required)
- **`mode`**: What to validate - 'args', 'result', or 'both' (default: 'args')
- **`project`**: Function to transform data before validation

#### Example

```typescript
import { Type } from "@sinclair/typebox";

const userSchema = Type.Object({
  args: Type.Tuple([
    Type.Object({
      name: Type.String(),
      email: Type.String({ format: "email" }),
      age: Type.Optional(Type.Number({ minimum: 0 })),
    }),
  ]),
});

macro
  .validate({
    schema: userSchema,
    mode: "args",
  })
  .applyTo(userServiceMethods.name("createUser"));
```

## CLI Commands

### build

Compiles your project with aspect transformations.

```bash
metadrama build [source] [options]
```

#### Options

- **`--outDir <dir>`**: Output directory (default: dist)
- **`--watch`**: Watch mode for development
- **`--verbose`**: Verbose output with timing information
- **`--dry-run`**: Show what would be transformed without writing files

#### Examples

```bash
# Build entire project
metadrama build

# Build specific directories
metadrama build src/api src/services

# Build with custom output
metadrama build --outDir=build/compiled

# Watch mode
metadrama build --watch
```

### check

Validates architecture rules and aspect configuration.

```bash
metadrama check [source] [options]
```

#### Options

- **`--explain <code>`**: Explain diagnostic error codes
- **`--rules`**: Run architecture rules validation
- **`--aspects`**: Check aspect configuration only
- **`--verbose`**: Detailed diagnostic information

#### Examples

```bash
# Check entire project
metadrama check

# Explain error code
metadrama check --explain MD1003

# Check specific files
metadrama check src/services --verbose
```

### playground

Starts the interactive development environment.

```bash
metadrama playground [options]
```

#### Options

- **`--port <number>`**: Server port (default: 4173)
- **`--host <string>`**: Server host (default: localhost)
- **`--example <name>`**: Load specific example

#### Examples

```bash
# Start playground
metadrama playground

# Custom port
metadrama playground --port=3000

# Load example
metadrama playground --example=memoize
```

## Diagnostic Codes

### Error Codes

- **MD1001**: Advice registration failed - no targets found
- **MD1002**: Macro expansion failed - unsupported AST node
- **MD1003**: Transform failed - unable to parse decorated class
- **MD1004**: Transform failed - method boundary detection failed
- **MD1005**: Config loading failed - aspect.config.ts import error
- **MD1006**: SWC transformation failed - invalid TypeScript syntax
- **MD1007**: Weaving failed - cannot inject advice into method
- **MD1008**: Pointcut matching failed - no methods found
- **MD1009**: Registry error - duplicate advice registration
- **MD1010**: Performance warning - transform time exceeded budget

### Getting Help

```bash
# Explain any diagnostic code
metadrama check --explain MD1003
```

## Advanced APIs

### Registry

Direct access to the advice and macro registry.

```typescript
interface Registry {
  registerAdvice(
    type: AdviceType,
    pointcut: Pointcut,
    advice: Function
  ): string;
  registerMacro(name: string, pointcut: Pointcut, options: any): string;
  getAdvice(signature: MethodSignature): AdviceEntry[];
  getMacros(signature: MethodSignature): MacroEntry[];
  reset(): void;
}
```

### Custom Transformers

Create custom build tool integrations.

```typescript
interface TransformResult {
  code: string;
  map?: string;
  diagnostics: DiagnosticEntry[];
}

function createCustomTransformer(): TransformerFunction {
  return async (code: string, filename: string): Promise<TransformResult> => {
    // Custom transformation logic
    return { code, diagnostics: [] };
  };
}
```

### Plugin Development

Extend MetaDrama with custom plugins.

```typescript
interface Plugin {
  name: string;
  setup(registry: Registry): void;
  transform?(code: string, context: TransformContext): TransformResult;
}

function createPlugin(config: PluginConfig): Plugin {
  return {
    name: "my-plugin",
    setup(registry) {
      // Register custom advice or macros
    },
  };
}
```

## Type Definitions

### Core Types

```typescript
type AdviceType = "before" | "after" | "around";

interface MethodSignature {
  className?: string;
  methodName: string;
  decorators: string[];
  async: boolean;
  parameters: ParameterInfo[];
}

interface ClassInfo {
  name: string;
  decorators: string[];
  methods: MethodInfo[];
  exported: boolean;
}

interface MethodInfo {
  name: string;
  async: boolean;
  decorators: string[];
  parameters: ParameterInfo[];
  static: boolean;
}

interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  decorators: string[];
}

interface DiagnosticEntry {
  code: string;
  level: "error" | "warn" | "info";
  message: string;
  file?: string;
  span?: { line: number; column: number };
  hint?: string;
}
```

This API reference covers all the main interfaces and functions available in MetaDrama. For more examples and advanced usage patterns, see the [Usage Guide](./usage.md) and [Recipes](./recipes/).
