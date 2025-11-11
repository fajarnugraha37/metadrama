# Examples Gallery

Real-world examples showcasing MetaDrama's aspect-oriented programming capabilities.

## Service Layer Monitoring

Complete service layer instrumentation with logging, metrics, and error handling.

```typescript
// services/user.service.ts
@Service()
export class UserService {
  constructor(private db: DatabaseService, private cache: CacheService) {}

  async getUser(id: string): Promise<User> {
    return await this.db.users.findById(id);
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const updated = await this.db.users.update(id, data);
    await this.cache.invalidate(`user:${id}`);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.users.delete(id);
    await this.cache.delete(`user:${id}`);
  }
}
```

```typescript
// aspects/service-monitoring.ts
import { pointcut, around, before, after } from "metadrama";

const serviceMethods = pointcut.classes.withDecorator("Service").methods;

// Comprehensive logging with timing
around(serviceMethods)((ctx) => {
  const start = performance.now();
  const traceId = crypto.randomUUID().slice(0, 8);

  console.log(`[${traceId}] ${ctx.targetName} starting`, {
    args: ctx.args,
    timestamp: new Date().toISOString(),
  });

  try {
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      const duration = performance.now() - start;
      console.log(`[${traceId}] ${ctx.targetName} completed`, {
        duration: `${duration.toFixed(2)}ms`,
        resultType: typeof value,
      });

      // Record metrics
      recordMetric(`service.${ctx.targetName}`, duration);

      return value;
    });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[${traceId}] ${ctx.targetName} failed`, {
      duration: `${duration.toFixed(2)}ms`,
      error: error.message,
      stack: error.stack,
    });

    // Record error metrics
    recordError(`service.${ctx.targetName}`, error);
    throw error;
  }
});

// Validate service method arguments
before(serviceMethods)((ctx) => {
  if (ctx.args.length === 0) {
    throw new Error(`${ctx.targetName} requires arguments`);
  }

  // Validate required string IDs
  const firstArg = ctx.args[0];
  if (typeof firstArg === "string" && !firstArg.trim()) {
    throw new Error(`${ctx.targetName} requires non-empty string ID`);
  }
});
```

## API Rate Limiting & Caching

Advanced API protection with rate limiting, caching, and retry logic.

```typescript
// api/product.controller.ts
@Controller("/api/products")
export class ProductController {
  @Get("/:id")
  async getProduct(@Param("id") id: string): Promise<Product> {
    return await this.productService.getById(id);
  }

  @Post("/")
  async createProduct(@Body() data: CreateProductData): Promise<Product> {
    return await this.productService.create(data);
  }

  @Get("/search")
  async searchProducts(@Query() params: SearchParams): Promise<Product[]> {
    return await this.productService.search(params);
  }
}
```

```typescript
// aspects/api-protection.ts
import { pointcut, around, macro } from "metadrama";
import { Type } from "@sinclair/typebox";

const apiMethods = pointcut.classes.withDecorator("Controller").methods;

// Rate limiting
const rateLimiter = new Map<string, { count: number; reset: number }>();

around(apiMethods)((ctx) => {
  const clientId = getClientId(); // Extract from request context
  const key = `${clientId}:${ctx.targetName}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window
  const maxRequests = 100;

  const current = rateLimiter.get(key);
  if (current && now < current.reset) {
    if (current.count >= maxRequests) {
      throw new Error(`Rate limit exceeded for ${ctx.targetName}`);
    }
    current.count++;
  } else {
    rateLimiter.set(key, { count: 1, reset: now + windowMs });
  }

  return ctx.proceed(...ctx.args);
});

// Intelligent caching for read operations
macro
  .memoize({
    ttlMs: 300_000, // 5 minutes
    key: (id, ...params) => {
      if (typeof id === "string") return `product:${id}`;
      return `product:search:${JSON.stringify(params)}`;
    },
    maxSize: 10_000,
  })
  .applyTo(
    pointcut.classes.withDecorator("Controller").methods.name(/^get|search/)
  );

// Retry for external dependencies
macro
  .retry({
    max: 3,
    backoff: "exp",
    baseMs: 100,
    retryable: (error) => {
      // Only retry on network/timeout errors
      return (
        error.code === "ECONNRESET" ||
        error.code === "TIMEOUT" ||
        (error.status >= 500 && error.status < 600)
      );
    },
  })
  .applyTo(
    pointcut.classes
      .name(/Service$/)
      .methods.where(
        (method) =>
          method.name.includes("external") || method.name.includes("api")
      )
  );

// Validation for API inputs
const productSchema = Type.Object({
  args: Type.Tuple([
    Type.Union([
      Type.String(), // ID parameter
      Type.Object({
        // Body/query data
        name: Type.Optional(Type.String()),
        category: Type.Optional(Type.String()),
        price: Type.Optional(Type.Number({ minimum: 0 })),
      }),
    ]),
  ]),
});

macro
  .validate({
    schema: productSchema,
    mode: "args",
  })
  .applyTo(apiMethods);
```

## Database Transaction Management

Automatic transaction wrapping with rollback on errors.

```typescript
// services/order.service.ts
export class OrderService {
  async createOrder(data: CreateOrderData): Promise<Order> {
    // Multiple database operations that need to be atomic
    const order = await this.db.orders.create(data);
    await this.db.inventory.reserve(data.items);
    await this.db.payments.process(data.payment);
    await this.emailService.sendConfirmation(order.id);
    return order;
  }

  async cancelOrder(id: string): Promise<void> {
    const order = await this.db.orders.findById(id);
    await this.db.orders.update(id, { status: "cancelled" });
    await this.db.inventory.release(order.items);
    await this.db.payments.refund(order.paymentId);
  }

  async updateInventory(updates: InventoryUpdate[]): Promise<void> {
    for (const update of updates) {
      await this.db.inventory.adjust(update.productId, update.quantity);
      await this.db.auditLog.record("inventory_update", update);
    }
  }
}
```

```typescript
// aspects/transactions.ts
import { pointcut, around } from "metadrama";

const transactionalMethods = pointcut.classes
  .name(/Service$/)
  .methods.where(
    (method) =>
      method.name.includes("create") ||
      method.name.includes("update") ||
      method.name.includes("delete") ||
      method.name.includes("cancel")
  );

around(transactionalMethods)((ctx) => {
  return withTransaction(async (trx) => {
    // Set transaction context for database operations
    const originalDb = global.db;
    global.db = trx;

    try {
      const result = await ctx.proceed(...ctx.args);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      console.error(`Transaction rolled back for ${ctx.targetName}:`, error);
      throw error;
    } finally {
      // Restore original database context
      global.db = originalDb;
    }
  });
});

// Prevent concurrent modifications
const lockManager = new Map<string, Promise<any>>();

around(
  pointcut.classes
    .name(/Service$/)
    .methods.where(
      (m) => m.name.includes("update") || m.name.includes("modify")
    )
)((ctx) => {
  const lockKey = `${ctx.targetName}:${ctx.args[0]}`; // Assume first arg is ID

  if (lockManager.has(lockKey)) {
    throw new Error(`Concurrent modification detected for ${lockKey}`);
  }

  const operation = (async () => {
    try {
      return await ctx.proceed(...ctx.args);
    } finally {
      lockManager.delete(lockKey);
    }
  })();

  lockManager.set(lockKey, operation);
  return operation;
});
```

## Performance Optimization

Comprehensive performance monitoring and optimization.

```typescript
// services/analytics.service.ts
export class AnalyticsService {
  async generateReport(params: ReportParams): Promise<Report> {
    const data = await this.collectData(params);
    const processed = await this.processData(data);
    return await this.formatReport(processed);
  }

  async collectData(params: ReportParams): Promise<RawData[]> {
    // Expensive data collection
    const queries = this.buildQueries(params);
    return await Promise.all(queries.map((q) => this.executeQuery(q)));
  }

  async processData(data: RawData[]): Promise<ProcessedData> {
    // CPU-intensive processing
    return this.aggregateAndTransform(data);
  }

  async executeExpensiveQuery(query: string): Promise<QueryResult> {
    return await this.database.execute(query);
  }
}
```

```typescript
// aspects/performance.ts
import { pointcut, around, macro } from "metadrama";

const expensiveMethods = pointcut.classes
  .name(/Service$/)
  .methods.where(
    (method) =>
      method.name.includes("generate") ||
      method.name.includes("process") ||
      method.name.includes("expensive")
  );

// Performance monitoring with detailed metrics
around(expensiveMethods)((ctx) => {
  const startTime = performance.now();
  const startMem = process.memoryUsage();

  console.log(`🚀 Starting ${ctx.targetName}`, {
    args: ctx.args.map((arg) =>
      typeof arg === "object" ? Object.keys(arg) : typeof arg
    ),
    timestamp: new Date().toISOString(),
  });

  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    const endTime = performance.now();
    const endMem = process.memoryUsage();
    const duration = endTime - startTime;

    const memoryDelta = {
      rss: (endMem.rss - startMem.rss) / 1024 / 1024,
      heapUsed: (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024,
      external: (endMem.external - startMem.external) / 1024 / 1024,
    };

    const metrics = {
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: Object.entries(memoryDelta)
        .map(
          ([key, value]) =>
            `${key}: ${value > 0 ? "+" : ""}${value.toFixed(2)}MB`
        )
        .join(", "),
    };

    if (duration > 1000) {
      console.warn(`🐌 Slow operation ${ctx.targetName}`, metrics);
    } else {
      console.log(`✅ Completed ${ctx.targetName}`, metrics);
    }

    // Store metrics for analysis
    recordPerformanceMetric(ctx.targetName, {
      duration,
      memoryUsage: memoryDelta,
      timestamp: Date.now(),
    });

    return value;
  });
});

// Aggressive caching for expensive operations
macro
  .memoize({
    ttlMs: 1800_000, // 30 minutes
    key: (...args) => `expensive:${JSON.stringify(args)}`,
    maxSize: 1000,
  })
  .applyTo(expensiveMethods);

// Intelligent retry with backoff for unreliable operations
macro
  .retry({
    max: 5,
    backoff: "exp",
    baseMs: 1000,
    maxDelayMs: 30_000,
    retryable: (error) => {
      // Retry on temporary failures but not on business logic errors
      return (
        error.code === "ECONNRESET" ||
        error.code === "TIMEOUT" ||
        error.message.includes("temporary") ||
        (error.status >= 500 && error.status < 600)
      );
    },
  })
  .applyTo(
    pointcut.classes
      .name(/Service$/)
      .methods.where(
        (m) => m.name.includes("query") || m.name.includes("fetch")
      )
  );
```

## Security & Authorization

Role-based access control and audit logging.

```typescript
// controllers/admin.controller.ts
@Controller("/admin")
export class AdminController {
  @RequireRole("admin")
  async deleteUser(@Param("id") id: string): Promise<void> {
    return await this.userService.delete(id);
  }

  @RequireRole("admin", "moderator")
  async banUser(@Param("id") id: string): Promise<void> {
    return await this.userService.ban(id);
  }

  @RequirePermission("users:read")
  async getUsers(@Query() params: UserQuery): Promise<User[]> {
    return await this.userService.search(params);
  }

  @RequirePermission("users:write")
  async updateUserRole(
    @Param("id") id: string,
    @Body() data: RoleData
  ): Promise<User> {
    return await this.userService.updateRole(id, data);
  }
}
```

```typescript
// aspects/security.ts
import { pointcut, before, around, after } from "metadrama";

const protectedMethods = pointcut.classes.methods.withDecorator(/^Require/);

// Authorization checking
before(protectedMethods)((ctx) => {
  const currentUser = getCurrentUser(); // Extract from request context
  if (!currentUser) {
    throw new UnauthorizedError("Authentication required");
  }

  // Extract required roles/permissions from decorator
  const decorators = getMethodDecorators(ctx.targetName);
  const roleDecorator = decorators.find((d) => d.name === "RequireRole");
  const permissionDecorator = decorators.find(
    (d) => d.name === "RequirePermission"
  );

  if (roleDecorator) {
    const requiredRoles = roleDecorator.args;
    const hasRole = requiredRoles.some((role) =>
      currentUser.roles.includes(role)
    );
    if (!hasRole) {
      throw new ForbiddenError(`Requires one of: ${requiredRoles.join(", ")}`);
    }
  }

  if (permissionDecorator) {
    const requiredPermission = permissionDecorator.args[0];
    if (!currentUser.permissions.includes(requiredPermission)) {
      throw new ForbiddenError(`Requires permission: ${requiredPermission}`);
    }
  }
});

// Audit logging for sensitive operations
const sensitiveOperations = pointcut.classes.methods.where(
  (method) =>
    method.name.includes("delete") ||
    method.name.includes("ban") ||
    method.name.includes("updateRole") ||
    method.name.includes("admin")
);

around(sensitiveOperations)((ctx) => {
  const currentUser = getCurrentUser();
  const auditEntry = {
    id: crypto.randomUUID(),
    userId: currentUser?.id,
    action: ctx.targetName,
    timestamp: new Date().toISOString(),
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
    args: sanitizeArgs(ctx.args), // Remove sensitive data
  };

  console.log("🔒 Security audit:", auditEntry);

  try {
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      // Log successful completion
      auditLogger.log({
        ...auditEntry,
        status: "success",
        result: sanitizeResult(value),
      });
      return value;
    });
  } catch (error) {
    // Log failed attempts
    auditLogger.log({
      ...auditEntry,
      status: "failure",
      error: error.message,
    });
    throw error;
  }
});

// Rate limiting for sensitive operations
const rateLimitedOperations =
  pointcut.classes.methods.withDecorator(/^Require/);

const operationCounts = new Map<string, { count: number; reset: number }>();

before(rateLimitedOperations)((ctx) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return; // Will be caught by authorization

  const key = `${currentUser.id}:${ctx.targetName}`;
  const now = Date.now();
  const windowMs = 300_000; // 5 minutes
  const maxOperations = 10;

  const current = operationCounts.get(key);
  if (current && now < current.reset) {
    if (current.count >= maxOperations) {
      throw new TooManyRequestsError(
        `Too many ${ctx.targetName} operations. Try again later.`
      );
    }
    current.count++;
  } else {
    operationCounts.set(key, { count: 1, reset: now + windowMs });
  }
});
```

## Testing Support

Comprehensive testing utilities with mock injection and test data management.

```typescript
// test/service.test.ts
import { pointcut, around, before, after } from "metadrama";
import { describe, it, expect, beforeEach } from "vitest";

describe("UserService with aspects", () => {
  beforeEach(() => {
    // Reset all aspects and mocks
    resetAspects();
    clearMocks();
  });

  it("should log service calls in test mode", async () => {
    const logs: string[] = [];

    // Test-specific logging aspect
    around(pointcut.classes.name("UserService").methods)((ctx) => {
      logs.push(`Called ${ctx.targetName} with ${ctx.args.length} args`);
      return ctx.proceed(...ctx.args);
    });

    const service = new UserService(mockDb, mockCache);
    await service.getUser("123");

    expect(logs).toContain("Called getUser with 1 args");
  });

  it("should inject test mocks automatically", async () => {
    const testData = { id: "123", name: "Test User" };

    // Mock injection aspect
    before(pointcut.classes.name(/Service$/).methods)((ctx) => {
      if (ctx.targetName === "getUser" && ctx.args[0] === "123") {
        // Replace with mock data
        ctx.args = [testData];
      }
    });

    const service = new UserService(mockDb, mockCache);
    const result = await service.getUser("123");

    expect(result).toEqual(testData);
  });

  it("should validate test performance", async () => {
    const timings: number[] = [];

    // Performance tracking for tests
    around(pointcut.classes.name("UserService").methods)((ctx) => {
      const start = performance.now();
      const result = ctx.proceed(...ctx.args);

      return ctx.wrap(result, (value) => {
        timings.push(performance.now() - start);
        return value;
      });
    });

    const service = new UserService(mockDb, mockCache);
    await service.getUser("123");

    expect(timings[0]).toBeLessThan(100); // Should be fast in tests
  });
});
```

```typescript
// test/aspects/test-aspects.ts
import { pointcut, around, before } from "metadrama";

// Global test setup for consistent mocking
export function setupTestAspects() {
  // Auto-mock external dependencies in tests
  const externalCalls = pointcut.functions.where(
    (fn) =>
      fn.name.includes("fetch") ||
      fn.name.includes("http") ||
      fn.name.includes("api")
  );

  before(externalCalls)((ctx) => {
    if (process.env.NODE_ENV === "test") {
      // Replace with mock data based on call signature
      const mockResponse = generateMockResponse(ctx.targetName, ctx.args);
      if (mockResponse) {
        // Skip actual call and return mock
        return mockResponse;
      }
    }
  });

  // Test data validation
  const dataServices = pointcut.classes.name(/Service$/).methods;

  after(dataServices)((ctx) => {
    if (process.env.NODE_ENV === "test" && ctx.result) {
      // Validate that test data matches expected schemas
      validateTestData(ctx.targetName, ctx.result);
    }
  });

  // Performance budgets for tests
  const performanceCritical = pointcut.classes.methods.where((method) =>
    method.decorators.includes("PerformanceCritical")
  );

  around(performanceCritical)((ctx) => {
    const start = performance.now();
    const result = ctx.proceed(...ctx.args);

    return ctx.wrap(result, (value) => {
      const duration = performance.now() - start;
      const budget = getPerformanceBudget(ctx.targetName);

      if (duration > budget) {
        throw new Error(
          `Performance budget exceeded: ${ctx.targetName} took ${duration}ms, budget was ${budget}ms`
        );
      }

      return value;
    });
  });
}

function generateMockResponse(methodName: string, args: any[]): any {
  // Generate contextual mock data based on method name and arguments
  const mockData = {
    fetchUser: { id: args[0], name: "Test User", email: "test@example.com" },
    fetchProducts: [{ id: "1", name: "Test Product", price: 99.99 }],
    sendEmail: { messageId: "mock-123", status: "sent" },
  };
  return mockData[methodName];
}

function validateTestData(methodName: string, data: any): void {
  // Ensure test data has required structure
  if (methodName.includes("User") && data) {
    if (!data.id || !data.name) {
      throw new Error(`Invalid user data structure in ${methodName}`);
    }
  }
}

function getPerformanceBudget(methodName: string): number {
  const budgets = {
    getUserById: 50,
    searchUsers: 200,
    generateReport: 5000,
  };
  return budgets[methodName] || 1000;
}
```

## Build Integration

Custom build pipeline with aspect-aware optimizations.

```typescript
// build.config.ts
import { defineConfig } from "vite";
import { metadrama } from "metadrama/plugin/vite";

export default defineConfig({
  plugins: [
    metadrama({
      // Production optimizations
      removeDebugAspects: true,
      inlineSimpleAdvice: true,

      // Performance monitoring
      generatePerformanceReport: true,
      trackTransformTime: true,

      // Custom transformations
      customMacros: {
        benchmark: {
          expand: (node) => generateBenchmarkCode(node),
          validate: (options) => validateBenchmarkOptions(options),
        },
      },

      // Build-time validations
      rules: [
        {
          name: "no-sync-in-async",
          check: (method) => {
            if (method.async && method.body.includes("sync")) {
              return {
                level: "warn",
                message: "Avoid synchronous operations in async methods",
              };
            }
          },
        },
        {
          name: "require-error-handling",
          check: (method) => {
            if (method.name.includes("api") && !method.body.includes("try")) {
              return {
                level: "error",
                message: "API methods must include error handling",
              };
            }
          },
        },
      ],
    }),
  ],

  build: {
    rollupOptions: {
      external: ["metadrama/runtime"],
    },
  },
});
```

These examples demonstrate MetaDrama's power in real-world scenarios. Each example can be combined and customized for your specific needs. The framework's aspect-oriented approach keeps cross-cutting concerns cleanly separated while maintaining type safety and performance.
