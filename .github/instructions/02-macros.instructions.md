# Macro Development Guidelines

## Core Macro Principles

1. **Dependency Isolation**: Macro factories live under `src/macros` and must only depend on `src/core` utilities.

2. **Lazy Loading**: For `validate`, import `TypeCompiler` from `@sinclair/typebox/compiler` lazily inside the macro so TypeBox stays optional.

3. **Collision Prevention**: Memoized functions must emit a unique symbol key via `registry.memoizationBucket` to avoid collisions across files.

## Macro Factory Pattern

### Standard Factory Structure

```typescript
// ✅ Standard macro factory pattern
export interface MacroOptions {
  // Common options all macros should support
  condition?: (ctx: ExecutionContext) => boolean;
  disabled?: boolean;
  debug?: boolean;
}

export function createMacro<T extends MacroOptions>(
  name: string,
  options: T,
  generator: (options: T, context: MacroContext) => string
) {
  return {
    applyTo(pointcut: Pointcut) {
      return registry.registerMacro(name, pointcut, { options, generator });
    },
  };
}
```

### Built-in Macro Implementations

#### Memoize Macro

```typescript
export interface MemoizeOptions extends MacroOptions {
  ttlMs?: number;
  key?: (...args: any[]) => string;
  maxSize?: number;
  storage?: "memory" | "localStorage" | "sessionStorage";
}

export function memoize(options: MemoizeOptions = {}) {
  return createMacro("memoize", options, generateMemoizeCode);
}

function generateMemoizeCode(
  options: MemoizeOptions,
  ctx: MacroContext
): string {
  const symbolKey = registry.generateSymbol("memoize", ctx.methodSignature);
  const keyFunction = options.key
    ? options.key.toString()
    : "(...args) => JSON.stringify(args)";

  return `
    const ${symbolKey}_cache = new Map()
    const ${symbolKey}_original = ${ctx.methodName}
    
    ${ctx.methodName} = function(...args) {
      const key = (${keyFunction})(...args)
      
      if (${symbolKey}_cache.has(key)) {
        const cached = ${symbolKey}_cache.get(key)
        ${
          options.ttlMs
            ? `
          if (Date.now() - cached.timestamp < ${options.ttlMs}) {
            return cached.value
          }
          ${symbolKey}_cache.delete(key)
        `
            : "return cached.value"
        }
      }
      
      const result = ${symbolKey}_original.apply(this, args)
      ${symbolKey}_cache.set(key, { 
        value: result, 
        timestamp: Date.now() 
      })
      
      ${
        options.maxSize
          ? `
        if (${symbolKey}_cache.size > ${options.maxSize}) {
          const firstKey = ${symbolKey}_cache.keys().next().value
          ${symbolKey}_cache.delete(firstKey)
        }
      `
          : ""
      }
      
      return result
    }
  `;
}
```

#### Retry Macro

```typescript
export interface RetryOptions extends MacroOptions {
  max: number;
  backoff?: "none" | "linear" | "exp";
  baseMs?: number;
  maxDelayMs?: number;
  retryable?: (error: any) => boolean;
}

export function retry(options: RetryOptions) {
  return createMacro("retry", options, generateRetryCode);
}

function generateRetryCode(options: RetryOptions, ctx: MacroContext): string {
  const symbolKey = registry.generateSymbol("retry", ctx.methodSignature);
  const retryableCheck = options.retryable
    ? `(${options.retryable.toString()})(error)`
    : "true";

  return `
    const ${symbolKey}_original = ${ctx.methodName}
    
    ${ctx.methodName} = async function(...args) {
      let lastError
      
      for (let attempt = 0; attempt <= ${options.max}; attempt++) {
        try {
          return await ${symbolKey}_original.apply(this, args)
        } catch (error) {
          lastError = error
          
          if (attempt === ${options.max} || !(${retryableCheck})) {
            throw error
          }
          
          const delay = ${generateBackoffFormula(options)}
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      throw lastError
    }
  `;
}

function generateBackoffFormula(options: RetryOptions): string {
  const base = options.baseMs || 25;
  const max = options.maxDelayMs || 30000;

  switch (options.backoff) {
    case "linear":
      return `Math.min(${base} * (attempt + 1), ${max})`;
    case "exp":
      return `Math.min(${base} * Math.pow(2, attempt), ${max})`;
    case "none":
    default:
      return base.toString();
  }
}
```

#### Trace Macro

```typescript
export interface TraceOptions extends MacroOptions {
  label?: string;
  logger?: (message: string, data: Record<string, unknown>) => void;
  threshold?: number;
  includeArgs?: boolean;
  includeResult?: boolean;
}

export function trace(options: TraceOptions = {}) {
  return createMacro("trace", options, generateTraceCode);
}

function generateTraceCode(options: TraceOptions, ctx: MacroContext): string {
  const symbolKey = registry.generateSymbol("trace", ctx.methodSignature);
  const label = options.label || ctx.methodName;
  const logger = options.logger
    ? `(${options.logger.toString()})`
    : "console.debug";

  return `
    const ${symbolKey}_original = ${ctx.methodName}
    
    ${ctx.methodName} = function(...args) {
      const startTime = performance.now()
      const traceId = Math.random().toString(36).slice(2, 8)
      
      ${logger}(\`[\${traceId}] ${label} starting\`, {
        ${options.includeArgs ? "args" : ""}
      })
      
      try {
        const result = ${symbolKey}_original.apply(this, args)
        
        if (result && typeof result.then === 'function') {
          return result
            .then(value => {
              const duration = performance.now() - startTime
              ${logger}(\`[\${traceId}] ${label} completed\`, {
                duration: \`\${duration.toFixed(2)}ms\`,
                ${options.includeResult ? "result: value" : ""}
              })
              return value
            })
            .catch(error => {
              const duration = performance.now() - startTime
              ${logger}(\`[\${traceId}] ${label} failed\`, {
                duration: \`\${duration.toFixed(2)}ms\`,
                error: error.message
              })
              throw error
            })
        }
        
        const duration = performance.now() - startTime
        ${
          options.threshold
            ? `
          if (duration > ${options.threshold}) {
            ${logger}(\`[\${traceId}] ${label} slow operation\`, { duration: \`\${duration.toFixed(2)}ms\` })
          }
        `
            : `
          ${logger}(\`[\${traceId}] ${label} completed\`, { duration: \`\${duration.toFixed(2)}ms\` })
        `
        }
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        ${logger}(\`[\${traceId}] ${label} failed\`, {
          duration: \`\${duration.toFixed(2)}ms\`,
          error: error.message
        })
        throw error
      }
    }
  `;
}
```

#### Validate Macro

```typescript
export interface ValidateOptions extends MacroOptions {
  schema: any; // TypeBox schema
  mode?: "args" | "result" | "both";
  project?: (args: any[], result?: any) => any;
}

export function validate<T>(options: ValidateOptions) {
  return createMacro("validate", options, generateValidateCode);
}

function generateValidateCode(
  options: ValidateOptions,
  ctx: MacroContext
): string {
  const symbolKey = registry.generateSymbol("validate", ctx.methodSignature);

  return `
    // Lazy load TypeBox compiler
    let ${symbolKey}_validator
    function ${symbolKey}_getValidator() {
      if (!${symbolKey}_validator) {
        const { TypeCompiler } = require('@sinclair/typebox/compiler')
        ${symbolKey}_validator = TypeCompiler.Compile(${JSON.stringify(
    options.schema
  )})
      }
      return ${symbolKey}_validator
    }
    
    const ${symbolKey}_original = ${ctx.methodName}
    
    ${ctx.methodName} = function(...args) {
      ${
        options.mode !== "result"
          ? `
        // Validate arguments
        const argsToValidate = ${
          options.project ? `(${options.project.toString()})(args)` : "args"
        }
        
        const validator = ${symbolKey}_getValidator()
        if (!validator.Check(argsToValidate)) {
          const errors = [...validator.Errors(argsToValidate)]
          throw new ValidationError('Argument validation failed', errors)
        }
      `
          : ""
      }
      
      const result = ${symbolKey}_original.apply(this, args)
      
      ${
        options.mode !== "args"
          ? `
        // Validate result for sync functions
        if (result && typeof result.then !== 'function') {
          const resultToValidate = ${
            options.project
              ? `(${options.project.toString()})(args, result)`
              : "result"
          }
          
          const validator = ${symbolKey}_getValidator()
          if (!validator.Check(resultToValidate)) {
            const errors = [...validator.Errors(resultToValidate)]
            throw new ValidationError('Result validation failed', errors)
          }
        }
        
        // Handle async result validation
        if (result && typeof result.then === 'function') {
          return result.then(value => {
            const resultToValidate = ${
              options.project
                ? `(${options.project.toString()})(args, value)`
                : "value"
            }
            
            const validator = ${symbolKey}_getValidator()
            if (!validator.Check(resultToValidate)) {
              const errors = [...validator.Errors(resultToValidate)]
              throw new ValidationError('Result validation failed', errors)
            }
            
            return value
          })
        }
      `
          : ""
      }
      
      return result
    }
  `;
}
```

## Advanced Macro Patterns

### Conditional Macros

```typescript
// Macros can be conditionally applied based on runtime or compile-time conditions
export function conditionalMemoize(
  options: MemoizeOptions & {
    when?: (ctx: ExecutionContext) => boolean;
  }
) {
  return createMacro(
    "conditionalMemoize",
    options,
    (opts, ctx) => `
    const shouldMemoize = ${opts.when ? opts.when.toString() : "() => true"}
    
    if (shouldMemoize({ targetName: '${ctx.methodName}', args: [] })) {
      ${generateMemoizeCode(opts, ctx)}
    }
  `
  );
}
```

### Macro Composition

```typescript
// Allow combining multiple macros
export function compose(...macros: MacroApplication[]): MacroApplication {
  return {
    applyTo(pointcut: Pointcut) {
      return macros.map((macro) => macro.applyTo(pointcut));
    },
  };
}

// Usage:
compose(
  trace({ label: "api" }),
  retry({ max: 3 }),
  memoize({ ttlMs: 60000 })
).applyTo(apiMethods);
```

### Custom Macro Development

```typescript
// Guide for creating custom macros
export function createCustomMacro(name: string, template: string) {
  return function (options: any = {}) {
    return createMacro(name, options, (opts, ctx) => {
      return template
        .replace(/\{methodName\}/g, ctx.methodName)
        .replace(/\{options\.(\w+)\}/g, (_, prop) => opts[prop]);
    });
  };
}

// Example: Simple timing macro
const timing = createCustomMacro(
  "timing",
  `
  const start = performance.now()
  const result = {methodName}_original.apply(this, arguments)
  console.log('{methodName} took', performance.now() - start, 'ms')
  return result
`
);
```

## Macro Testing Patterns

```typescript
// Test macro code generation
test("memoize macro generates correct code structure", () => {
  const options = { ttlMs: 5000, maxSize: 100 };
  const context = createMockMacroContext("testMethod");

  const code = generateMemoizeCode(options, context);

  expect(code).toContain("testMethod_memoize_");
  expect(code).toContain("ttlMs: 5000");
  expect(code).toContain("maxSize: 100");
});

// Test macro runtime behavior
test("memoize macro caches function results", () => {
  let callCount = 0;
  function expensiveFunction(x: number) {
    callCount++;
    return x * 2;
  }

  const memoized = applyMemoizeMacro(expensiveFunction, {});

  expect(memoized(5)).toBe(10);
  expect(memoized(5)).toBe(10); // Should use cache
  expect(callCount).toBe(1);
});
```

Remember: Macros are compile-time magic that should feel like runtime convenience. Make them powerful but predictable! ⚡
