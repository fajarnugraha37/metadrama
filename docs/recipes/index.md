# MetaDrama Recipes

This collection provides practical patterns and recipes for common aspect-oriented programming scenarios using MetaDrama. Each recipe includes complete examples, best practices, and performance considerations.

## Table of Contents

- [Latency Tracing with `macro.trace`](#latency-tracing)
- [Resilient IO with `macro.retry`](#resilient-io)
- [Schema Validation with `macro.validate`](#schema-validation)
- [Memoization Hoisting with `macro.memoize`](#memoization-hoisting)
- [Advanced Patterns](#advanced-patterns)

## Latency Tracing

### Basic Performance Monitoring

Track method execution time and performance characteristics:

```typescript
// aspect.config.ts
/** @meta */
import { pointcut, macro } from "@fajarnugraha37/metadrama";

// Target API endpoints for performance monitoring
const apiMethods = pointcut.classes
  .withDecorator("Api")
  .methods.name(/^(get|post|put|delete)/i);

// Apply basic tracing
macro
  .trace({
    label: "api",
    threshold: 1000, // Warn for operations > 1 second
  })
  .applyTo(apiMethods);
```

### Advanced Performance Tracing

Custom logging with detailed context:

```typescript
// utils/performance-logger.ts
export const performanceLogger = {
  trace: (message: string, payload: Record<string, unknown>) => {
    const { duration, args, result, error } = payload;

    if (error) {
      console.error(`[PERF:ERROR] ${message}`, {
        duration,
        error: error.message,
      });
    } else if (duration > 500) {
      console.warn(`[PERF:SLOW] ${message}`, {
        duration,
        args,
        resultSize: JSON.stringify(result).length,
      });
    } else {
      console.debug(`[PERF:OK] ${message}`, { duration });
    }

    // Send to monitoring service
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      sendToDatadog({
        metric: "api.latency",
        value: duration,
        tags: { method: message },
      });
    }
  },
};

// aspect.config.ts
macro
  .trace({
    label: "database",
    logger: performanceLogger.trace,
  })
  .applyTo(pointcut.classes.withDecorator("Repository").methods);
```

### Generated Code Example

```javascript
// Before transformation
async getUsers(filter) {
  return this.db.query('SELECT * FROM users WHERE ?', filter)
}

// After transformation (generated automatically)
async getUsers(filter) {
  // Trace macro: performance monitoring
  const __start = performance.now()
  console.debug('[trace:start] getUsers', { args: [filter] })

  try {
    const __result = await (async () => {
      return this.db.query('SELECT * FROM users WHERE ?', filter)
    })()

    const __duration = performance.now() - __start
    console.debug('[trace:resolve] getUsers', { duration: __duration, result: __result })
    return __result
  } catch (error) {
    const __duration = performance.now() - __start
    console.debug('[trace:reject] getUsers', { duration: __duration, error })
    throw error
  }
}
```

## Resilient IO

### Basic Retry Logic

Handle transient failures with exponential backoff:

```typescript
// aspect.config.ts
const networkMethods = pointcut.classes
  .withDecorator("ExternalService")
  .methods.name(/^(fetch|request|call)/);

macro
  .retry({
    max: 3,
    backoff: "exp",
    baseMs: 100,
  })
  .applyTo(networkMethods);
```

### Advanced Retry with Custom Logic

Conditional retry based on error types:

```typescript
// utils/retry-strategies.ts
export const networkRetryStrategy = {
  max: 5,
  backoff: "exp",
  baseMs: 200,
  maxDelayMs: 10000,
  retryable: (error: any) => {
    // Retry on network errors, server errors, but not client errors
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") return true;
    if (error.response?.status >= 500) return true;
    if (error.response?.status === 429) return true; // Rate limiting
    return false;
  },
};

// aspect.config.ts
macro
  .retry(networkRetryStrategy)
  .applyTo(pointcut.classes.withDecorator("HttpClient").methods);
```

## Schema Validation

### TypeBox Integration

Runtime validation with compile-time schema definitions:

```typescript
// schemas/user-schemas.ts
import { Type } from "@sinclair/typebox";

export const CreateUserSchema = Type.Object({
  args: Type.Tuple([
    Type.Object({
      name: Type.String({ minLength: 1, maxLength: 100 }),
      email: Type.String({ format: "email" }),
      age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
    }),
  ]),
});

// aspect.config.ts
macro
  .validate({
    schema: CreateUserSchema,
    mode: "args",
  })
  .applyTo(
    pointcut.classes.withDecorator("UserService").methods.name("createUser")
  );
```

## Memoization Hoisting

### Intelligent Caching

Automatic cache management with TTL and invalidation:

```typescript
// aspect.config.ts
const dataAccessMethods = pointcut.classes
  .withDecorator("DataService")
  .methods.name(/^(get|find|fetch|load)/);

// Basic memoization with TTL
macro
  .memoize({
    ttlMs: 300_000, // 5 minutes
    key: (...args) => `data_${JSON.stringify(args)}`,
  })
  .applyTo(dataAccessMethods);
```

## Advanced Patterns

### Combining Multiple Aspects

Layer different concerns for comprehensive coverage:

```typescript
// aspect.config.ts
const criticalApiMethods = pointcut.classes
  .withDecorator("CriticalApi")
  .methods.name(/^(process|execute|handle)/);

// Layer 1: Validation
macro
  .validate({
    schema: CriticalOperationSchema,
    mode: "both",
  })
  .applyTo(criticalApiMethods);

// Layer 2: Retry for resilience
macro
  .retry({
    max: 2,
    backoff: "exp",
    baseMs: 500,
  })
  .applyTo(criticalApiMethods);

// Layer 3: Performance monitoring
macro
  .trace({
    label: "critical",
    threshold: 2000,
  })
  .applyTo(criticalApiMethods);

// Layer 4: Caching for performance
macro
  .memoize({
    ttlMs: 60_000,
    key: (...args) => `critical_${hash(args)}`,
  })
  .applyTo(criticalApiMethods.name(/^(get|fetch|read)/));
```

### Performance Budgets

Automatic performance constraint enforcement:

```typescript
// performance/budgets.ts
export const performanceBudgets = {
  api: { maxDuration: 1000 }, // API calls should be < 1 second
  database: { maxDuration: 500 }, // DB queries should be < 500ms
  computation: { maxDuration: 2000 }, // Heavy computation should be < 2 seconds
};

const createBudgetAdvice = (budget: { maxDuration: number }) =>
  around(/* pointcut */)((ctx) => {
    const start = performance.now();

    return ctx.wrap(ctx.proceed(...ctx.args), (result) => {
      const duration = performance.now() - start;

      if (duration > budget.maxDuration) {
        logger.warn("Performance budget exceeded", {
          method: ctx.targetName,
          duration,
          budget: budget.maxDuration,
          violation: duration - budget.maxDuration,
        });
      }

      return result;
    });
  });
```

## Best Practices

### 1. Pointcut Specificity

```typescript
// ✅ Good: Specific and meaningful pointcuts
const userApiMethods = pointcut.classes
  .withDecorator("UserController")
  .methods.name(/^(getUser|createUser|updateUser|deleteUser)$/);

// ❌ Avoid: Overly broad pointcuts
const allMethods = pointcut.classes.methods;
```

### 2. Performance Considerations

```typescript
// ✅ Good: Efficient cache keys
macro
  .memoize({
    key: (userId: string, fields?: string[]) =>
      `user_${userId}_${fields?.sort().join(",") || "all"}`,
  })
  .applyTo(userQueries);

// ❌ Avoid: Inefficient serialization
macro
  .memoize({
    key: (...args) => JSON.stringify(args), // Can be slow for large objects
  })
  .applyTo(expensiveMethods);
```

### 3. Error Handling

```typescript
// ✅ Good: Preserve original error semantics
macro
  .retry({
    max: 3,
    retryable: (error) => {
      // Don't retry business logic errors
      if (error instanceof ValidationError) return false;
      if (error instanceof AuthorizationError) return false;
      return true;
    },
  })
  .applyTo(externalServiceCalls);
```

These recipes demonstrate the power and flexibility of MetaDrama's aspect-oriented programming approach, showing how to build robust, performant, and maintainable applications with compile-time code generation.
