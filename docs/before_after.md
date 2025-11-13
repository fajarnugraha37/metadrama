# Before & After: Code Transformation Examples

> ⚠️ **IMPORTANT**: The current MetaDrama implementation still has runtime overhead and reflection. This document shows both the **current output** and the **target zero-runtime-overhead output** that we're working towards.

This document shows how MetaDrama transforms your TypeScript code by weaving aspects and expanding macros at compile time.

## 🚨 Current State vs. Zero Runtime Overhead Goal

### ❌ **Current Output (Has Runtime Overhead)**

The current MetaDrama implementation still includes:

- TypeScript decorator helpers (`_ts_decorate`, `Reflect.decorate`)
- Runtime imports (`import { weaveFunction } from "metadrama"`)
- Runtime method weaving (`weaveMethod(...)`)
- Runtime pointcut evaluation

### ✅ **Target Output (True Zero Runtime Overhead)**

The goal is to eliminate ALL runtime overhead by:

- Removing all MetaDrama imports
- Removing all decorator helpers and reflection
- Inlining all aspect code directly into methods
- Compile-time pointcut resolution only

---

## 🎭 Basic Advice Transformation

### Before: Source TypeScript

```typescript
// user.service.ts
@Service()
export class UserService {
  constructor(private db: DatabaseService) {}

  async getUser(id: string): Promise<User> {
    return await this.db.findById(id);
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const user = await this.db.update(id, data);
    return user;
  }
}

// aspects.ts
import { pointcut, around } from "metadrama";

const serviceMethods = pointcut.classes.withDecorator("Service").methods;

around(serviceMethods)((ctx) => {
  const start = performance.now();
  console.log(`🚀 Starting ${ctx.targetName}`, ctx.args);

  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    const duration = performance.now() - start;
    console.log(`✅ ${ctx.targetName} completed in ${duration.toFixed(2)}ms`);
    return value;
  });
});
```

### After: Current Output (❌ Still Has Runtime Overhead)

```javascript
// ❌ TypeScript decorator helper with reflection
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length,
    r =
      c < 3
        ? target
        : desc === null
        ? (desc = Object.getOwnPropertyDescriptor(target, key))
        : desc,
    d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1; i >= 0; i--)
      if ((d = decorators[i]))
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

// user.service.js
export class UserService {
  constructor(db) {
    this.db = db;
  }

  async getUser(id) {
    // Generated advice wrapper
    const __advice_getUser_start = performance.now();
    console.log("🚀 Starting getUser", [id]);

    try {
      // Original method logic
      const __original_result = await this.db.findById(id);

      // Async result handling
      const __final_result = await Promise.resolve(__original_result).then(
        (value) => {
          const duration = performance.now() - __advice_getUser_start;
          console.log(`✅ getUser completed in ${duration.toFixed(2)}ms`);
          return value;
        }
      );

      return __final_result;
    } catch (error) {
      const duration = performance.now() - __advice_getUser_start;
      console.log(`❌ getUser failed in ${duration.toFixed(2)}ms`);
      throw error;
    }
  }

  async updateUser(id, data) {
    // Generated advice wrapper
    const __advice_updateUser_start = performance.now();
    console.log("🚀 Starting updateUser", [id, data]);

    try {
      // Original method logic
      const user = await this.db.update(id, data);

      // Async result handling
      const __final_result = await Promise.resolve(user).then((value) => {
        const duration = performance.now() - __advice_updateUser_start;
        console.log(`✅ updateUser completed in ${duration.toFixed(2)}ms`);
        return value;
      });

      return __final_result;
    } catch (error) {
      const duration = performance.now() - __advice_updateUser_start;
      console.log(`❌ updateUser failed in ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
}

// ❌ Runtime decorator application
UserService = _ts_decorate([Service()], UserService);

// ❌ Runtime method weaving (not shown in this example but present in actual output)
// weaveMethod(UserService, "getUser", { /* signature metadata */ });
```

### After: Target Output (✅ True Zero Runtime Overhead)

```javascript
// ✅ NO imports, NO decorators, NO reflection, NO runtime overhead
// Pure JavaScript with aspects compiled directly into methods

export class UserService {
  constructor(db) {
    this.db = db;
  }

  async getUser(id) {
    // ✅ Aspect logic compiled directly into method - zero runtime cost
    const start = performance.now();
    console.log(`🚀 Starting getUser`, [id]);

    try {
      // Original method logic inlined
      const result = await this.db.findById(id);

      // Advice logic inlined
      const duration = performance.now() - start;
      console.log(`✅ getUser completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`❌ getUser failed in ${duration.toFixed(2)}ms`);
      throw error;
    }
  }

  async updateUser(id, data) {
    // ✅ Same pattern - all aspect logic compiled away
    const start = performance.now();
    console.log(`🚀 Starting updateUser`, [id, data]);

    try {
      const user = await this.db.update(id, data);

      const duration = performance.now() - start;
      console.log(`✅ updateUser completed in ${duration.toFixed(2)}ms`);

      return user;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`❌ updateUser failed in ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
}

// ✅ NO decorator application - completely eliminated
// ✅ NO runtime weaving - everything is compile-time
```

## ⚡ Memoize Macro Expansion

### Before: Source TypeScript

```typescript
// data.service.ts
export class DataService {
  async fetchUserProfile(userId: string): Promise<UserProfile> {
    // Expensive API call
    const response = await fetch(`/api/users/${userId}/profile`);
    return response.json();
  }

  calculateExpensiveValue(input: number): number {
    // CPU-intensive calculation
    let result = input;
    for (let i = 0; i < 1000000; i++) {
      result = Math.sqrt(result * result + i);
    }
    return result;
  }
}

// macros.ts
import { macro, pointcut } from "metadrama";

const expensiveMethods = pointcut.classes.methods.where(
  (method) => method.name.includes("fetch") || method.name.includes("calculate")
);

macro
  .memoize({
    ttlMs: 300_000, // 5 minutes
    key: (...args) => `cache:${JSON.stringify(args)}`,
    maxSize: 1000,
  })
  .applyTo(expensiveMethods);
```

### After: Generated JavaScript

```javascript
// data.service.js

// Generated memoization cache
const __memoize_fetchUserProfile_cache = new Map();
const __memoize_calculateExpensiveValue_cache = new Map();

export class DataService {
  async fetchUserProfile(userId) {
    // Generated memoization logic
    const __cache_key = `cache:${JSON.stringify([userId])}`;

    // Check cache first
    if (__memoize_fetchUserProfile_cache.has(__cache_key)) {
      const __cached_entry = __memoize_fetchUserProfile_cache.get(__cache_key);

      // Check TTL expiration
      if (Date.now() - __cached_entry.timestamp < 300000) {
        return __cached_entry.value;
      } else {
        // Remove expired entry
        __memoize_fetchUserProfile_cache.delete(__cache_key);
      }
    }

    // Execute original method
    const response = await fetch(`/api/users/${userId}/profile`);
    const __result = await response.json();

    // Cache the result
    __memoize_fetchUserProfile_cache.set(__cache_key, {
      value: __result,
      timestamp: Date.now(),
    });

    // Enforce max cache size
    if (__memoize_fetchUserProfile_cache.size > 1000) {
      const __first_key = __memoize_fetchUserProfile_cache.keys().next().value;
      __memoize_fetchUserProfile_cache.delete(__first_key);
    }

    return __result;
  }

  calculateExpensiveValue(input) {
    // Generated memoization logic
    const __cache_key = `cache:${JSON.stringify([input])}`;

    // Check cache first
    if (__memoize_calculateExpensiveValue_cache.has(__cache_key)) {
      const __cached_entry =
        __memoize_calculateExpensiveValue_cache.get(__cache_key);

      // Check TTL expiration
      if (Date.now() - __cached_entry.timestamp < 300000) {
        return __cached_entry.value;
      } else {
        // Remove expired entry
        __memoize_calculateExpensiveValue_cache.delete(__cache_key);
      }
    }

    // Execute original method
    let result = input;
    for (let i = 0; i < 1000000; i++) {
      result = Math.sqrt(result * result + i);
    }

    // Cache the result
    __memoize_calculateExpensiveValue_cache.set(__cache_key, {
      value: result,
      timestamp: Date.now(),
    });

    // Enforce max cache size
    if (__memoize_calculateExpensiveValue_cache.size > 1000) {
      const __first_key = __memoize_calculateExpensiveValue_cache
        .keys()
        .next().value;
      __memoize_calculateExpensiveValue_cache.delete(__first_key);
    }

    return result;
  }
}
```

## 🔄 Retry Macro Expansion

### Before: Source TypeScript

```typescript
// api.service.ts
export class ApiService {
  async fetchExternalData(endpoint: string): Promise<any> {
    const response = await fetch(`https://external-api.com/${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// retry-config.ts
macro
  .retry({
    max: 3,
    backoff: "exp",
    baseMs: 100,
    maxDelayMs: 5000,
    retryable: (error) => {
      return (
        error.message.includes("HTTP 5") ||
        error.message.includes("TIMEOUT") ||
        error.name === "NetworkError"
      );
    },
  })
  .applyTo(pointcut.functions.name(/fetch.*External/));
```

### After: Generated JavaScript

```javascript
// api.service.js
export class ApiService {
  async fetchExternalData(endpoint) {
    let __last_error;

    // Retry loop with exponential backoff
    for (let __attempt = 0; __attempt <= 3; __attempt++) {
      try {
        // Original method logic
        const response = await fetch(`https://external-api.com/${endpoint}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        __last_error = error;

        // Check if we should retry this error
        const __should_retry =
          error.message.includes("HTTP 5") ||
          error.message.includes("TIMEOUT") ||
          error.name === "NetworkError";

        // Don't retry on last attempt or non-retryable errors
        if (__attempt === 3 || !__should_retry) {
          throw error;
        }

        // Calculate exponential backoff delay
        const __delay = Math.min(100 * Math.pow(2, __attempt), 5000);

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, __delay));
      }
    }

    // This should never be reached, but just in case
    throw __last_error;
  }
}
```

## 📊 Trace Macro Expansion

### Before: Source TypeScript

```typescript
// performance.service.ts
export class PerformanceService {
  @Critical()
  async processLargeDataset(data: any[]): Promise<ProcessResult> {
    const processed = data.map((item) => this.transformItem(item));
    const result = this.aggregateResults(processed);
    return result;
  }

  private transformItem(item: any): any {
    // Complex transformation logic
    return { ...item, processed: true, timestamp: Date.now() };
  }

  private aggregateResults(items: any[]): ProcessResult {
    return {
      count: items.length,
      summary: items.reduce((acc, item) => ({ ...acc, ...item }), {}),
    };
  }
}

// tracing.ts
macro
  .trace({
    label: "perf",
    threshold: 1000, // Log if > 1 second
    logger: (message, data) => {
      if (data.duration > 1000) {
        console.warn(`🐌 Slow operation: ${message}`, data);
      } else {
        console.debug(`⚡ ${message}`, data);
      }
    },
  })
  .applyTo(pointcut.classes.methods.withDecorator("Critical"));
```

### After: Generated JavaScript

```javascript
// performance.service.js
export class PerformanceService {
  async processLargeDataset(data) {
    // Generated trace instrumentation
    const __trace_start = performance.now();
    const __trace_id = Math.random().toString(36).slice(2, 8);

    const __logger = (message, data) => {
      if (data.duration > 1000) {
        console.warn(`🐌 Slow operation: ${message}`, data);
      } else {
        console.debug(`⚡ ${message}`, data);
      }
    };

    __logger(`[${__trace_id}] perf processLargeDataset starting`, {
      args: [data],
    });

    try {
      // Original method logic
      const processed = data.map((item) => this.transformItem(item));
      const result = this.aggregateResults(processed);

      // Handle async result
      const __final_result = await Promise.resolve(result).then((value) => {
        const __duration = performance.now() - __trace_start;

        // Apply threshold check
        if (__duration > 1000) {
          __logger(
            `[${__trace_id}] perf processLargeDataset completed (SLOW)`,
            {
              duration: `${__duration.toFixed(2)}ms`,
              result: typeof value,
            }
          );
        } else {
          __logger(`[${__trace_id}] perf processLargeDataset completed`, {
            duration: `${__duration.toFixed(2)}ms`,
            result: typeof value,
          });
        }

        return value;
      });

      return __final_result;
    } catch (error) {
      const __duration = performance.now() - __trace_start;
      __logger(`[${__trace_id}] perf processLargeDataset failed`, {
        duration: `${__duration.toFixed(2)}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  transformItem(item) {
    // No tracing - doesn't match decorator criteria
    return { ...item, processed: true, timestamp: Date.now() };
  }

  aggregateResults(items) {
    // No tracing - doesn't match decorator criteria
    return {
      count: items.length,
      summary: items.reduce((acc, item) => ({ ...acc, ...item }), {}),
    };
  }
}
```

## ✅ Validation Macro Expansion

### Before: Source TypeScript

```typescript
// payment.service.ts
import { Type } from "@sinclair/typebox";

export class PaymentService {
  processPayment(
    amount: number,
    currency: string,
    cardToken: string
  ): Promise<PaymentResult> {
    // Payment processing logic
    return this.chargeCard(amount, currency, cardToken);
  }

  private async chargeCard(
    amount: number,
    currency: string,
    token: string
  ): Promise<PaymentResult> {
    // External payment gateway call
    const response = await fetch("/api/payments/charge", {
      method: "POST",
      body: JSON.stringify({ amount, currency, token }),
    });
    return response.json();
  }
}

// validation.ts
const paymentSchema = Type.Object({
  args: Type.Tuple([
    Type.Number({ minimum: 0.01, maximum: 999999 }),
    Type.String({ pattern: "^[A-Z]{3}$" }),
    Type.String({ minLength: 10, maxLength: 100 }),
  ]),
});

macro
  .validate({
    schema: paymentSchema,
    mode: "args",
  })
  .applyTo(pointcut.functions.name("processPayment"));
```

### After: Generated JavaScript

```javascript
// payment.service.js

// Lazy-loaded TypeBox validator
let __validate_processPayment_validator;

function __validate_processPayment_getValidator() {
  if (!__validate_processPayment_validator) {
    const { TypeCompiler } = require("@sinclair/typebox/compiler");
    __validate_processPayment_validator = TypeCompiler.Compile({
      type: "object",
      properties: {
        args: {
          type: "array",
          items: [
            { type: "number", minimum: 0.01, maximum: 999999 },
            { type: "string", pattern: "^[A-Z]{3}$" },
            { type: "string", minLength: 10, maxLength: 100 },
          ],
        },
      },
    });
  }
  return __validate_processPayment_validator;
}

export class PaymentService {
  processPayment(amount, currency, cardToken) {
    // Generated validation logic
    const __args_to_validate = { args: [amount, currency, cardToken] };
    const __validator = __validate_processPayment_getValidator();

    if (!__validator.Check(__args_to_validate)) {
      const __errors = [...__validator.Errors(__args_to_validate)];
      const __error_messages = __errors
        .map((err) => `${err.path}: ${err.message}`)
        .join(", ");

      throw new ValidationError(
        `Argument validation failed for processPayment: ${__error_messages}`,
        __errors
      );
    }

    // Original method logic
    return this.chargeCard(amount, currency, cardToken);
  }

  async chargeCard(amount, currency, token) {
    // No validation - doesn't match pointcut
    const response = await fetch("/api/payments/charge", {
      method: "POST",
      body: JSON.stringify({ amount, currency, token }),
    });
    return response.json();
  }
}

// Generated ValidationError class
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}
```

## 🎪 Complex Composition Example

### Before: Multi-Aspect Source

```typescript
// order.service.ts
@Service()
@Transactional()
export class OrderService {
  constructor(
    private db: DatabaseService,
    private inventory: InventoryService,
    private payment: PaymentService
  ) {}

  @RequireAuth()
  @ValidateInput()
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    // Validate inventory
    await this.inventory.reserveItems(orderData.items);

    // Process payment
    const paymentResult = await this.payment.processPayment(
      orderData.total,
      orderData.currency,
      orderData.paymentToken
    );

    // Create order record
    const order = await this.db.orders.create({
      ...orderData,
      paymentId: paymentResult.id,
      status: "confirmed",
    });

    return order;
  }
}

// comprehensive-aspects.ts
const serviceMethods = pointcut.classes.withDecorator("Service").methods;
const authenticatedMethods =
  pointcut.classes.methods.withDecorator("RequireAuth");
const transactionalMethods =
  pointcut.classes.withDecorator("Transactional").methods;

// Add comprehensive logging
around(serviceMethods)((ctx) => {
  const start = performance.now();
  const traceId = crypto.randomUUID().slice(0, 8);

  console.log(`[${traceId}] 🚀 ${ctx.targetName} starting`);

  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    const duration = performance.now() - start;
    console.log(
      `[${traceId}] ✅ ${ctx.targetName} completed (${duration.toFixed(2)}ms)`
    );
    return value;
  });
});

// Add authentication check
before(authenticatedMethods)((ctx) => {
  const user = getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
});

// Add transaction management
around(transactionalMethods)((ctx) => {
  return withTransaction(async (tx) => {
    const originalDb = global.db;
    global.db = tx;

    try {
      const result = await ctx.proceed(...ctx.args);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      global.db = originalDb;
    }
  });
});

// Add retry for external calls
macro
  .retry({
    max: 3,
    backoff: "exp",
  })
  .applyTo(
    pointcut.classes.methods.where(
      (m) => m.name.includes("process") || m.name.includes("external")
    )
  );

// Add caching for expensive operations
macro
  .memoize({
    ttlMs: 60000,
  })
  .applyTo(pointcut.classes.methods.name(/^(get|fetch|find)/));
```

### After: Fully Woven JavaScript

```javascript
// order.service.js

// Generated caches and state
const __memoize_caches = new Map();
const __transaction_stack = [];

export class OrderService {
  constructor(db, inventory, payment) {
    this.db = db;
    this.inventory = inventory;
    this.payment = payment;
  }

  async createOrder(orderData) {
    // Generated comprehensive aspect weaving

    // 1. Authentication check (before advice)
    const __user = getCurrentUser();
    if (!__user) {
      throw new UnauthorizedError("Authentication required");
    }

    // 2. Transaction management (around advice - outer)
    return withTransaction(async (__tx) => {
      const __originalDb = global.db;
      global.db = __tx;

      try {
        // 3. Logging (around advice - inner)
        const __start = performance.now();
        const __traceId = crypto.randomUUID().slice(0, 8);

        console.log(`[${__traceId}] 🚀 createOrder starting`);

        try {
          // 4. Retry wrapper for processPayment call
          const __processPaymentWithRetry = async (
            total,
            currency,
            paymentToken
          ) => {
            let __lastError;

            for (let __attempt = 0; __attempt <= 3; __attempt++) {
              try {
                return await this.payment.processPayment(
                  total,
                  currency,
                  paymentToken
                );
              } catch (error) {
                __lastError = error;
                if (__attempt === 3) throw error;

                const __delay = 100 * Math.pow(2, __attempt);
                await new Promise((resolve) => setTimeout(resolve, __delay));
              }
            }
          };

          // Original method logic with woven aspects
          await this.inventory.reserveItems(orderData.items);

          const paymentResult = await __processPaymentWithRetry(
            orderData.total,
            orderData.currency,
            orderData.paymentToken
          );

          const order = await this.db.orders.create({
            ...orderData,
            paymentId: paymentResult.id,
            status: "confirmed",
          });

          // Commit transaction
          await __tx.commit();

          // Complete logging
          const __duration = performance.now() - __start;
          console.log(
            `[${__traceId}] ✅ createOrder completed (${__duration.toFixed(
              2
            )}ms)`
          );

          return order;
        } catch (error) {
          // Rollback transaction
          await __tx.rollback();

          // Error logging
          const __duration = performance.now() - __start;
          console.log(
            `[${__traceId}] ❌ createOrder failed (${__duration.toFixed(2)}ms)`
          );

          throw error;
        }
      } finally {
        global.db = __originalDb;
      }
    });
  }
}

// Generated helper functions
class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function getCurrentUser() {
  // Implementation depends on auth system
  return global.currentUser || null;
}

async function withTransaction(callback) {
  // Implementation depends on database system
  const tx = await global.db.beginTransaction();
  return callback(tx);
}
```

## 🎯 Key Transformation Principles

### 1. **Zero Runtime Overhead**

All aspects and macros are completely compiled away. The generated code is equivalent to hand-written, optimized JavaScript.

### 2. **Type Safety Preservation**

TypeScript types are preserved through the transformation process. Generated code maintains the same type contracts as the original.

### 3. **Async/Await Handling**

The transformer intelligently handles async functions, ensuring proper promise chaining and error handling in generated code.

### 4. **Symbol Collision Prevention**

All generated variables and functions use prefixed, unique names to avoid conflicts with user code.

### 5. **Source Map Generation**

Generated code includes source maps that point back to the original TypeScript, enabling proper debugging experience.

### 6. **Tree Shaking Compatibility**

Generated helpers are modular and tree-shakeable, ensuring only used functionality ends up in your bundle.

---

## 🎯 **Current vs. Target: Runtime Overhead Analysis**

### ❌ **Current MetaDrama Implementation Issues**

| Issue                   | Current Behavior                              | Runtime Cost            |
| ----------------------- | --------------------------------------------- | ----------------------- |
| **Decorator Helpers**   | `_ts_decorate` with `Reflect.decorate`        | ✅ Reflection calls     |
| **Runtime Imports**     | `import { weaveFunction } from "metadrama"`   | ✅ Bundle size increase |
| **Method Weaving**      | `weaveMethod()` calls at runtime              | ✅ Startup overhead     |
| **Pointcut Evaluation** | `pointcut.classes.withDecorator()` at runtime | ✅ Runtime parsing      |

### ✅ **Target Zero Runtime Overhead Goals**

| Goal                       | Target Behavior                      | Benefit              |
| -------------------------- | ------------------------------------ | -------------------- |
| **Pure Compilation**       | All aspects compiled to vanilla JS   | Zero reflection      |
| **No Runtime Imports**     | All MetaDrama imports eliminated     | Smaller bundles      |
| **Inline Everything**      | Methods contain fully expanded logic | Zero startup cost    |
| **Compile-time Pointcuts** | Pointcut matching at build time only | Zero runtime parsing |

### 🚧 **What Needs to Be Fixed**

1. **Eliminate TypeScript Decorators**: Replace `@Service()` with compile-time markers
2. **Pure Code Generation**: Generate methods with inlined aspect logic
3. **Remove Runtime Dependencies**: Eliminate all MetaDrama imports from output
4. **Compile-time Pointcut Resolution**: Move all matching to build phase

---

**Current State**: MetaDrama is "compile-time enhanced" but still has runtime overhead  
**Target State**: True zero-runtime-overhead aspect-oriented programming �✨
