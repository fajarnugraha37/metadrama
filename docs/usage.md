# Usage Guide

This document provides a comprehensive guide on how to use the MetaDrama library effectively. It covers installation, configuration, and practical examples to help you get started quickly.

## Installation

```bash
# Install MetaDrama
bun install @fajarnugraha37/metadrama

# Or with npm
npm install @fajarnugraha37/metadrama

# Or with yarn
yarn add @fajarnugraha37/metadrama
```

## Quick Start

### 1. Basic Setup

Create an aspect configuration file in your project root:

```typescript
// aspect.config.ts
/** @meta */
import { pointcut, around, macro } from "@fajarnugraha37/metadrama";

// Define pointcuts for targeting
const services = pointcut.classes.withDecorator("Service").methods;
const apiMethods = pointcut.classes
  .withDecorator("Api")
  .methods.name(/^(get|post)/i);

// Register advice
around(services)((ctx) => {
  const start = performance.now();
  const result = ctx.proceed(...ctx.args);
  return ctx.wrap(result, (value) => {
    console.debug("[service]", ctx.targetName, performance.now() - start, "ms");
    return value;
  });
});

// Apply macros
macro.memoize().applyTo(services.name(/^get/));
macro.trace({ label: "api" }).applyTo(apiMethods);
```

### 2. Configure Build Tool

#### SWC Configuration

```json
// .swcrc
{
  "jsc": {
    "experimental": {
      "plugins": [["@fajarnugraha37/metadrama/swc", {}]]
    }
  }
}
```

#### TypeScript Compiler (ts-patch)

```json
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [{ "transform": "@fajarnugraha37/metadrama/ts-patch" }]
  }
}
```

#### Vite

```typescript
// vite.config.ts
import { metadramaVitePlugin } from "@fajarnugraha37/metadrama/vite";

export default {
  plugins: [metadramaVitePlugin()],
};
```

#### Bun

```toml
# bunfig.toml
[build]
plugins = ["@fajarnugraha37/metadrama/bun-esbuild"]
```

### 3. Write Your Code

```typescript
// services/inventory.ts
@Service()
export class InventoryService {
  @Cache({ ttl: 300 }) // Will be enhanced by memoize macro
  async getStock(location: string) {
    // Expensive operation
    const response = await fetch(`/api/stock/${location}`);
    return response.json();
  }

  @Retry({ max: 3, backoff: "exp" })
  async updateStock(location: string, quantity: number) {
    // Potentially failing operation
    await fetch(`/api/stock/${location}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    });
  }
}
```

## Core Concepts

### Pointcuts

Pointcuts define where advice should be applied. MetaDrama provides a fluent API for targeting specific code elements.

#### Class Selection

```typescript
// Target all classes with @Service decorator
const serviceClasses = pointcut.classes.withDecorator("Service");

// Target classes matching a pattern
const apiClasses = pointcut.classes.name(/^Api/);

// Target classes with custom conditions
const complexClasses = pointcut.classes.where(
  (cls) =>
    cls.decorators.some((d) => d.name === "Complex") && cls.methods.length > 5
);
```

#### Method Selection

```typescript
// All methods of service classes
const serviceMethods = pointcut.classes.withDecorator("Service").methods;

// Methods matching name patterns
const getMethods = serviceMethods.name(/^get/);
const asyncMethods = serviceMethods.where((m) => m.async);

// Specific method targeting
const criticalMethods = serviceMethods.name(["save", "delete", "update"]);
```

#### Function Selection

```typescript
// Target standalone functions
const utilFunctions = pointcut.functions.name(/^util/);
const exportedFunctions = pointcut.functions.where((f) => f.exported);
```

### Advice Types

#### Before Advice

Executes before the target method:

```typescript
before(pointcut.classes.withDecorator("Audit").methods)((ctx) => {
  console.log(`[audit] Starting ${ctx.targetName}`);
  console.log(`[audit] Arguments:`, ctx.args);
});
```

#### After Advice

Executes after the target method:

```typescript
after(pointcut.classes.withDecorator("Metrics").methods)((ctx) => {
  console.log(`[metrics] Completed ${ctx.targetName}`);
  console.log(`[metrics] Result:`, ctx.result);
});
```

#### Around Advice

Wraps the target method with complete control:

```typescript
around(pointcut.classes.withDecorator("Timing").methods)((ctx) => {
  const start = performance.now();
  console.log(`[timing] Starting ${ctx.targetName}`);

  try {
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      const duration = performance.now() - start;
      console.log(`[timing] ${ctx.targetName} took ${duration.toFixed(2)}ms`);
      return value;
    });
  } catch (error) {
    console.error(
      `[timing] ${ctx.targetName} failed after ${performance.now() - start}ms`
    );
    throw error;
  }
});
```

### Macros

Macros provide compile-time code generation for common patterns.

#### Memoize

Automatic caching with TTL support:

```typescript
// Basic memoization
macro.memoize().applyTo(expensiveMethods);

// With custom TTL and key function
macro
  .memoize({
    ttlMs: 60000, // 1 minute
    key: (...args) => `cache_${args[0]}_${args[1]}`,
  })
  .applyTo(dataAccessMethods);
```

Generated code:

```javascript
async getData(id) {
  // Memoize macro: cache with TTL support
  if (!this.__MyClass_getData_cache) {
    this.__MyClass_getData_cache = new Map();
  }

  const __cacheKey = JSON.stringify(arguments);
  const __now = Date.now();
  const __cached = this.__MyClass_getData_cache.get(__cacheKey);

  // Check if cached value exists and is still valid
  if (__cached && (!__cached.expiry || __cached.expiry > __now)) {
    return __cached.value;
  }

  // Execute original method...
}
```

#### Retry

Resilient error handling:

```typescript
// Basic retry
macro.retry({ max: 3 }).applyTo(networkMethods);

// Advanced retry with backoff
macro
  .retry({
    max: 5,
    backoff: "exp",
    baseMs: 100,
    retryable: (error) => error.code === "NETWORK_ERROR",
  })
  .applyTo(externalApiCalls);
```

#### Trace

Performance monitoring:

```typescript
// Basic tracing
macro.trace().applyTo(performanceCriticalMethods);

// Custom trace with logger
macro
  .trace({
    label: "database",
    logger: (message, payload) => logger.info(message, payload),
  })
  .applyTo(databaseMethods);
```

#### Validate

Schema validation:

```typescript
import { Type } from "@sinclair/typebox";

const userSchema = Type.Object({
  args: Type.Tuple([
    Type.String(), // username
    Type.Number(), // age
  ]),
});

macro
  .validate({
    schema: userSchema,
    mode: "args", // validate arguments
  })
  .applyTo(userServiceMethods);
```

## CLI Commands

### Build

Compile your project with aspect transformation:

```bash
# Build entire project
metadrama build

# Build specific directories
metadrama build src/api src/services

# Custom output directory
metadrama build --outDir=dist/compiled

# Watch mode
metadrama build --watch
```

### Check

Validate architecture rules and aspect configuration:

```bash
# Run all checks
metadrama check

# Check specific files
metadrama check src/services

# Explain diagnostic codes
metadrama check --explain MD1003
```

### Playground

Interactive development environment:

```bash
# Start playground server
metadrama playground

# Custom port
metadrama playground --port=3000

# Open specific example
metadrama playground --example=memoize
```

## Advanced Usage

### Custom Advice

Create reusable advice functions:

```typescript
// utils/advice.ts
export const createTimingAdvice = (threshold: number) =>
  around(/* pointcut */)((ctx) => {
    const start = performance.now();
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      const duration = performance.now() - start;
      if (duration > threshold) {
        console.warn(`Slow operation: ${ctx.targetName} took ${duration}ms`);
      }
      return value;
    });
  });

// aspect.config.ts
import { createTimingAdvice } from "./utils/advice";
createTimingAdvice(1000); // Warn if > 1 second
```

### Conditional Application

Apply aspects based on environment or conditions:

```typescript
// Development-only tracing
if (process.env.NODE_ENV === "development") {
  macro.trace({ verbose: true }).applyTo(debugMethods);
}

// Production performance monitoring
if (process.env.NODE_ENV === "production") {
  around(criticalPaths)((ctx) => {
    // Send metrics to monitoring service
    metrics.timing(ctx.targetName, () => ctx.proceed(...ctx.args));
  });
}
```

### Multi-Library Integration

Combine with other libraries:

```typescript
// With Zod validation
import { z } from "zod";

const userValidation = (schema: z.ZodSchema) =>
  before(userMethods)((ctx) => {
    schema.parse(ctx.args[0]); // Validate first argument
  });

// With observability libraries
import { trace, context } from "@opentelemetry/api";

const telemetryAdvice = around(serviceMethods)((ctx) => {
  return trace.getTracer("app").startActiveSpan(ctx.targetName, (span) => {
    try {
      return ctx.proceed(...ctx.args);
    } finally {
      span.end();
    }
  });
});
```

## Best Practices

### 1. Pointcut Organization

```typescript
// Good: Organized pointcuts
const pointcuts = {
  services: pointcut.classes.withDecorator("Service"),
  controllers: pointcut.classes.withDecorator("Controller"),
  repositories: pointcut.classes.withDecorator("Repository"),
};

const methods = {
  queries: pointcuts.services.methods.name(/^(get|find|list)/),
  commands: pointcuts.services.methods.name(/^(create|update|delete)/),
};
```

### 2. Performance Considerations

```typescript
// Good: Specific pointcuts
const expensiveMethods = pointcut.classes
  .withDecorator("Service")
  .methods.where((m) => m.name.includes("expensive"));

// Avoid: Overly broad pointcuts
const allMethods = pointcut.classes.methods; // Too broad!
```

### 3. Error Handling

```typescript
// Good: Proper error handling in advice
around(externalApiCalls)((ctx) => {
  try {
    return ctx.proceed(...ctx.args);
  } catch (error) {
    // Log error context
    logger.error(`API call failed: ${ctx.targetName}`, {
      args: ctx.args,
      error: error.message,
    });
    throw error; // Re-throw to preserve original behavior
  }
});
```

### 4. Testing

```typescript
// Test advice behavior
describe("Timing advice", () => {
  it("should log slow operations", async () => {
    const consoleSpy = vi.spyOn(console, "warn");

    // Execute method that should trigger advice
    await slowService.expensiveOperation();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Slow operation")
    );
  });
});
```

## Troubleshooting

### Common Issues

1. **Decorators not detected**: Ensure `aspect.config.ts` has the `/** @meta */` pragma
2. **Transform not applied**: Check build tool configuration and plugin setup
3. **Type errors**: Verify TypeScript configuration includes MetaDrama types
4. **Performance issues**: Use specific pointcuts instead of broad targeting

### Debugging

```bash
# Enable debug output
DEBUG=metadrama:* metadrama build

# Check transform output
metadrama build --verbose --dry-run

# Validate configuration
metadrama check --verbose
```

### Diagnostic Codes

- **MD1003**: Transform failed due to parsing issues
- **MD1004**: Method boundary detection failed
- **MD1007**: Advice weaving failed
- **MD1008**: No methods matched pointcut

For detailed explanations:

```bash
metadrama check --explain MD1003
```

This comprehensive usage guide should help you get started with MetaDrama and leverage its full potential for aspect-oriented programming in your TypeScript projects.
