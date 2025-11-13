# 🎭 MetaDrama

> _"When your code needs more drama than your personal life"_

MetaDrama is the aspect-oriented programming framework for developers who think decorators are cool but wish they could do more than just look pretty. Think of it as giving your TypeScript superpowers, but without the radioactive spider bite.

Inspired by the elegance of C macros (but safer), the power of C++ templates (but comprehensible), the flexibility of Rust macros (but less intimidating), and the magic of Zig's comptime (but with semicolons), MetaDrama brings compile-time transformations to the JavaScript ecosystem because apparently we needed another way to make our build process more complex.

_Disclaimer: Side effects may include increased productivity, cleaner code architecture, and the sudden urge to add aspects to everything. Use responsibly._

## 📦 Installation

Because apparently we can't just copy-paste code anymore:

```bash
# If you're team Bun (the cool kids)
bun install @fajarnugraha37/metadrama

# If you're still using npm (we don't judge... much)
npm install @fajarnugraha37/metadrama

# If yarn is your jam
yarn add @fajarnugraha37/metadrama

# If you're using pnpm (respect!)
pnpm add @fajarnugraha37/metadrama
```

> **Fun fact**: The package weighs less than your average node_modules folder, but delivers more punch than a caffeinated developer on Monday morning.

## 🤔 Why This Library?

Great question! Here's why MetaDrama exists (other than the fact that we love making things unnecessarily complicated):

### 🎯 **Separation of Concerns, Actually**

- Tired of sprinkling `console.log` everywhere like confetti? Use aspects.
- Sick of copy-pasting the same try-catch blocks? We got you.
- Want to add caching without turning your business logic into spaghetti? Say no more.

### 🚀 **Compile-Time Magic** _(Coming in v0.2.0)_

- ⚠️ **Current**: Has runtime overhead (TypeScript decorators + reflection)
- 🎯 **Target**: True zero runtime overhead (pure code generation)
- Transform your code at build time like a responsible adult
- Type-safe transformations because `any` is not a type, Karen

### 🎪 **For the Drama**

- Your code deserves to be as dramatic as your coding sessions at 3 AM
- Aspect-oriented programming sounds way cooler than "adding logging everywhere"
- Because sometimes you need to weave magic into mundane methods

### 🛠️ **Developer Experience That Doesn't Suck**

- IntelliSense that actually works (revolutionary, we know)
- Error messages that explain what went wrong instead of just judging you
- Playground for testing ideas without breaking everything

## 🔮 Features (aka "What Makes Us Special")

### 🎭 **Compile-Time Transformations**

Transform your code before it hits the browser, because runtime is for runtime things, not compile-time things. Revolutionary concept, we know.

### 🎯 **Pointcut Matching**

Target methods with surgical precision. Like a sniper, but for code. And less violent.

### 🕸️ **Advice System**

Wrap your methods in before/after/around advice. It's like middleware, but for everything, everywhere, all at once.

### ⚡ **Macro Expansion**

Built-in macros for common patterns because writing the same code 47 times builds character, but we're not sadists.

### 🔒 **TypeScript Integration**

Full type safety because `TypeError: Cannot read property 'x' of undefined` is so 2019.

### 🌍 **Multi-Platform Support**

Works with SWC, Vite, Bun, and TypeScript compiler. We're equal opportunity enablers.

### 🏗️ **Architecture Rules**

Enforce your team's coding standards automatically, because code reviews are for catching logic bugs, not arguing about naming conventions.

### � Quick Start (Get Your Hands Dirty)

Because theory is boring and you want to see the magic happen:

```typescript
/** @meta */
import { pointcut, around, macro } from "@fajarnugraha37/metadrama";

// Target all methods in classes decorated with @Service
const services = pointcut.classes.withDecorator("Service").methods;

// Add logging around service calls (because debugging is half the job)
around(services)((ctx) => {
  const start = performance.now();
  console.log(`🚀 Starting ${ctx.targetName} with`, ctx.args);

  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    const duration = performance.now() - start;
    console.log(`✅ ${ctx.targetName} completed in ${duration.toFixed(2)}ms`);
    return value;
  });
});

// Add smart caching to getter methods (because network calls are expensive)
macro
  .memoize({
    ttlMs: 300_000, // 5 minutes
    key: (...args) => `cache:${JSON.stringify(args)}`,
  })
  .applyTo(services.name(/^(get|fetch)/));

// Add retry logic to external API calls (because the internet is unreliable)
macro
  .retry({
    max: 3,
    backoff: "exp",
    retryable: (error) => error.code !== "AUTH_FAILED",
  })
  .applyTo(pointcut.functions.name(/api/i));
```

### CLI Commands That Actually Work

```bash
# Compile your project with aspect weaving
metadrama build

# Check your aspects and rules (like a linter, but smarter)
metadrama check

# Open the playground (because testing is important)
metadrama playground

# Pro tip: Target specific directories
metadrama build src/api packages/ui --outDir=dist
metadrama check src/services --explain MD1003
```

## 🧠 Core Concepts (The Important Stuff)

Understanding these concepts will make you dangerous (in a good way):

### 🎯 **Pointcuts**

Think of these as CSS selectors, but for your code. Target specific classes, methods, or functions with surgical precision.

```typescript
// Target all service methods
pointcut.classes.withDecorator("Service").methods;

// Target async getter methods (because specificity matters)
pointcut.classes.methods.name(/^get/).async;

// Target methods that match your weird naming conventions
pointcut.functions.where((fn) => fn.name.includes("Legacy"));
```

### 🎭 **Aspects**

The advice you give to your code. Like a life coach, but for functions.

- **`before`**: Execute before the method (validation, logging, setup)
- **`after`**: Execute after the method (cleanup, metrics, notifications)
- **`around`**: Wrap the entire method (caching, retries, transactions)

### ⚡ **Macros**

Compile-time code generation that eliminates boilerplate. Because life's too short to write the same pattern 47 times.

- **`memoize`**: Intelligent caching with TTL and custom key generation
- **`retry`**: Configurable retry logic with backoff strategies
- **`trace`**: Performance monitoring and debugging
- **`validate`**: Schema validation using TypeBox

### 🏗️ **Transform Pipeline**

Your code goes through a transformation journey:

1. **Parse** - We read your aspects and pointcuts
2. **Match** - Find target methods using your selectors
3. **Transform** - Weave aspects into your code
4. **Generate** - Emit transformed JavaScript/TypeScript

## 📚 Usage Catalog (Your Recipe Book)

Different flavors for different needs:

### 🍰 **Sweet & Simple**

```typescript
// Basic logging aspect
before(pointcut.classes.name("UserService").methods)((ctx) => {
  console.log(`Calling ${ctx.targetName}`, ctx.args);
});
```

### 🌶️ **Spicy Advanced**

```typescript
// Advanced caching with custom logic
around(pointcut.classes.methods.name(/^get/))((ctx) => {
  const cacheKey = `${ctx.targetName}:${JSON.stringify(ctx.args)}`;
  const cached = cache.get(cacheKey);

  if (cached && !isStale(cached)) {
    return cached.value;
  }

  const result = ctx.proceed(...ctx.args);
  return ctx.wrap(result, (value) => {
    cache.set(cacheKey, { value, timestamp: Date.now() });
    return value;
  });
});
```

### 🔥 **Nuclear Option**

```typescript
// Transaction management with rollback
around(pointcut.classes.withDecorator("Transactional").methods)((ctx) => {
  return withTransaction(async (tx) => {
    try {
      const result = await ctx.proceed(...ctx.args);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  });
});
```

## 🌍 Real World Scenarios

Because toy examples are cute, but real code pays the bills:

### 🏢 **Enterprise API Gateway**

```typescript
// Rate limiting + auth + logging + metrics in 15 lines
const apiMethods = pointcut.classes.withDecorator("Controller").methods;

macro.trace({ threshold: 1000 }).applyTo(apiMethods);
macro.retry({ max: 3, backoff: "exp" }).applyTo(apiMethods.name(/external/i));

before(apiMethods)((ctx) => {
  validateAuth(getCurrentUser());
  enforceRateLimit(ctx.targetName);
});
```

### 🛒 **E-commerce Service Layer**

```typescript
// Caching + validation + audit logging
const orderMethods = pointcut.classes.name("OrderService").methods;

macro.memoize({ ttlMs: 60_000 }).applyTo(orderMethods.name(/^get/));
macro.validate({ schema: orderSchema }).applyTo(orderMethods.name("create"));

after(orderMethods.name(/(create|update|delete)/))((ctx) => {
  auditLogger.log({
    action: ctx.targetName,
    userId: getCurrentUser().id,
    data: sanitize(ctx.args),
  });
});
```

### 📊 **Analytics Pipeline**

```typescript
// Performance monitoring + error tracking
const analyticsJobs = pointcut.classes.name(/Job$/).methods;

around(analyticsJobs)((ctx) => {
  const span = startSpan(ctx.targetName);

  try {
    const result = ctx.proceed(...ctx.args);
    return ctx.wrap(result, (value) => {
      span.setStatus("success");
      metrics.increment(`job.${ctx.targetName}.success`);
      return value;
    });
  } catch (error) {
    span.setStatus("error", error.message);
    metrics.increment(`job.${ctx.targetName}.error`);
    throw error;
  } finally {
    span.end();
  }
});
```

## 👨‍🍳 Cookbook (Quick Wins)

Bite-sized solutions for common problems:

### 🎯 **Method Performance Tracking**

```typescript
macro
  .trace({
    threshold: 500,
    logger: (msg, data) => data.duration > 500 && console.warn("Slow!", msg),
  })
  .applyTo(
    pointcut.classes.methods.where((m) => m.decorators.includes("Critical"))
  );
```

### 🔄 **Smart Retry Logic**

```typescript
macro
  .retry({
    max: 5,
    backoff: "exp",
    retryable: (error) => error.status >= 500 || error.code === "TIMEOUT",
  })
  .applyTo(pointcut.functions.name(/fetch|api|http/i));
```

### 💾 **Intelligent Caching**

```typescript
macro
  .memoize({
    ttlMs: 600_000, // 10 minutes
    key: (userId, ...params) => `user:${userId}:${params.join(":")}`,
    maxSize: 1000,
  })
  .applyTo(pointcut.classes.methods.name(/^(get|find|fetch)/));
```

### ✅ **Input Validation**

```typescript
import { Type } from "@sinclair/typebox";

macro
  .validate({
    schema: Type.Object({
      args: Type.Tuple([Type.String(), Type.Number()]),
    }),
  })
  .applyTo(pointcut.functions.name("processPayment"));
```

### 🔐 **Authorization Guards**

```typescript
before(pointcut.classes.methods.withDecorator("RequireAuth"))((ctx) => {
  const user = getCurrentUser();
  if (!user || !hasPermission(user, ctx.targetName)) {
    throw new UnauthorizedError("Access denied");
  }
});
```

## 📖 API Reference

Complete documentation for when you need the nitty-gritty details:

### 🎯 **Core APIs**

- **[Pointcuts](docs/api-reference.md#pointcutbuilder)** - Target selection with surgical precision
- **[Advice](docs/api-reference.md#advice-functions)** - before/after/around method interception
- **[Macros](docs/api-reference.md#macro-system)** - Compile-time code generation
- **[CLI](docs/api-reference.md#cli-commands)** - Build, check, and playground commands

### 🔧 **Type Definitions**

- **[Core Types](docs/api-reference.md#core-types)** - TypeScript interfaces and type definitions
- **[Context Objects](docs/api-reference.md#executioncontext)** - What you get in your advice functions
- **[Diagnostic Codes](docs/api-reference.md#diagnostic-codes)** - Error codes and explanations

### 🛠️ **Advanced APIs**

- **[Registry](docs/api-reference.md#registry)** - Direct advice and macro management
- **[Custom Transformers](docs/api-reference.md#custom-transformers)** - Build your own integrations
- **[Plugin Development](docs/api-reference.md#plugin-development)** - Extend MetaDrama

## 🚀 Future Roadmap (Where We're Going)

_Inspired by decades of metaprogramming evolution across languages_

### 🎯 **Near-Term Enhancements (Q1 2026)**

#### 🧬 **Advanced Macro System**

- **Procedural Macros**: Rust-style procedural macros for complex code generation
- **Conditional Compilation**: Zig comptime-inspired conditional compilation directives
- **Macro Composition**: Combine multiple macros with dependency resolution

```typescript
// Coming: Procedural macros
macro.procedural("benchmark", (node) => {
  return generateBenchmarkSuite(node, {
    iterations: 1000,
    warmup: 100,
    profiles: ["memory", "cpu"],
  });
});

// Coming: Conditional compilation
#if(DEBUG);
macro.trace().applyTo(allMethods);
#endif;

#if(FEATURE_CACHE);
macro.memoize().applyTo(expensiveMethods);
#endif;
```

#### 🎭 **Enhanced Pointcut Language**

- **Pattern Matching**: More sophisticated pattern matching inspired by functional languages
- **Temporal Logic**: Select methods based on call sequences and temporal relationships
- **Dependency Analysis**: Target methods based on dependency graphs

```typescript
// Coming: Advanced pattern matching
pointcut.methods
  .pattern(Pattern.sequence(["validate", "transform", "save"]))
  .where((chain) => chain.every((m) => m.async));

// Coming: Temporal pointcuts
pointcut
  .callSequence()
  .starts(methods.name("begin"))
  .followedBy(methods.name(/process/))
  .endsWith(methods.name("commit"));
```

### � **Medium-Term Vision (2026)**

#### 🏗️ **Meta-Architecture System**

Drawing from C++ template metaprogramming and advanced type-level programming:

- **Architecture DSL**: Domain-specific language for describing system architectures
- **Constraint Verification**: Compile-time verification of architectural constraints
- **Pattern Enforcement**: Automatic enforcement of design patterns and principles

```typescript
// Coming: Architecture constraints
architecture({
  layers: ["ui", "service", "data"],
  rules: [
    forbid("ui").dependsOn("data"),
    require("service").implements(Pattern.Repository),
    enforce(layers.data).satisfies(ACID.properties),
  ],
});
```

#### ⚡ **Performance Metaprogramming**

Inspired by Zig's comptime performance analysis:

- **Compile-Time Profiling**: Analyze performance characteristics at build time
- **Automatic Optimization**: AI-driven code optimization based on usage patterns
- **Memory Layout Control**: Fine-grained control over memory allocation patterns

```typescript
// Coming: Performance directives
@comptime.optimize("memory")
@comptime.inline(conditions.hotPath)
@comptime.vectorize(SIMD.auto)
class DataProcessor {
  @comptime.profile({ budget: "100ms", critical: true })
  async processLargeDataset(data: Float64Array) {}
}
```

### 🌟 **Long-Term Ambitions (2027+)**

#### 🧠 **AI-Assisted Metaprogramming**

- **Intelligent Aspect Suggestion**: AI suggests aspects based on code patterns
- **Automatic Performance Optimization**: ML-driven performance improvements
- **Bug Prevention**: Proactive aspect generation to prevent common issues

#### 🌍 **Cross-Language Integration**

- **WASM Bridge**: Seamless integration with Rust/C++ libraries via WebAssembly
- **Native Extensions**: C/Rust extensions for performance-critical paths
- **Protocol Generation**: Automatic API/protocol generation across languages

#### 🔮 **Quantum Metaprogramming** _(Because Why Not?)_

- **Superposition Compilation**: Explore multiple compilation strategies simultaneously
- **Entangled Aspects**: Aspects that affect each other across module boundaries
- **Quantum Debugging**: Schrödinger's debugger - observe bugs without affecting them

### 🎪 **The Meta-Meta Vision**

Ultimately, MetaDrama aims to become the **Lisp of the TypeScript world** - where the distinction between code and data, between program and program-generator, becomes beautifully blurred. We want to enable developers to think at the meta level, where:

- **Code writes code** (but responsibly)
- **Patterns become first-class citizens**
- **Architecture is expressed declaratively**
- **Performance is optimized automatically**
- **Bugs are prevented before they exist**

_"The best code is the code you don't have to write, but still somehow did." - Ancient MetaDrama Proverb_

---

### 🤝 **Want to Help Shape the Future?**

We're always looking for fellow metaprogramming enthusiasts! Whether you're:

- A C macro wizard who misses the power (but not the footguns)
- A C++ template metaprogrammer who wants cleaner syntax
- A Rust macro expert seeking new frontiers
- A Zig comptime aficionado looking for broader adoption
- Just someone who thinks code should be more dramatic

**Join us!** Open an issue with your ideas, or better yet, submit a PR. Let's make metaprogramming accessible to mere mortals while keeping the power that makes it exciting.

_"The future of programming is meta, and the future is now... well, it's coming soon."_

---

## 📚 Documentation Hub

- **[🚀 Getting Started](docs/getting-started.md)** - Your first steps with MetaDrama
- **[🏗️ Architecture Deep Dive](docs/architecture.md)** - How the magic works under the hood
- **[📖 Complete Usage Guide](docs/usage.md)** - Installation, configuration, and patterns
- **[🧠 Compile-Time vs Runtime](docs/space.md)** - Understanding the transformation process
- **[👨‍🍳 Recipe Collection](docs/recipes/index.md)** - Common patterns and solutions
- **[🌍 Real-World Examples](docs/examples.md)** - Complete implementations
- **[📖 API Reference](docs/api-reference.md)** - Complete API documentation

---

## 🛠️ Build Tool Integration

MetaDrama plays nice with your existing tools:

### TypeScript Compiler (ts-patch)

```json
{
  "compilerOptions": {
    "plugins": [{ "transform": "@fajarnugraha37/metadrama/ts-patch" }]
  }
}
```

### SWC

```json
{
  "jsc": {
    "experimental": {
      "plugins": [["@fajarnugraha37/metadrama/swc", {}]]
    }
  }
}
```

### Vite

```typescript
import { metadramaVitePlugin } from "@fajarnugraha37/metadrama/vite";

export default {
  plugins: [metadramaVitePlugin()],
};
```

### Bun

```toml
[build]
plugins = ["@fajarnugraha37/metadrama/bun-esbuild"]
```

---

## 🎯 Current Status

_"We don't say the P-word around here, but this thing is pretty solid"_

- ✅ **Core Framework** - Complete with comprehensive API
- ✅ **TypeScript Integration** - Full ts-patch transformer (87% coverage)
- ✅ **SWC Plugin** - Complete integration (95% coverage)
- ✅ **Advice System** - Before/after/around with context preservation
- ✅ **Macro System** - Memoize, retry, trace, validate macros
- ✅ **Test Suite** - 32/32 tests passing (62% overall coverage)
- ✅ **CLI Tools** - Build, check, and playground commands
- ✅ **Multi-Platform** - Works across all major build tools
- ✅ **Documentation** - Comprehensive guides and examples

_It's stable enough for your side projects and sophisticated enough for your day job._

---

## 🤝 Contributing

Found a bug? Want a feature? Think our jokes are terrible? We want to hear from you!

1. **Check existing issues** - Maybe someone beat you to it
2. **Open an issue** - Describe what you want or what's broken
3. **Submit a PR** - Code speaks louder than words
4. **Join discussions** - Share your metaprogramming war stories

**Pro tip**: If you're contributing a new macro or aspect pattern, include tests and examples. Future developers will thank you (and so will we).

---

## 📄 License

MIT License - Because sharing is caring, but attribution is nice.

See [LICENSE](LICENSE) for the boring legal stuff.

---

## 🙏 Acknowledgments

_Standing on the shoulders of giants (and occasionally stepping on their toes)_

Inspired by the metaprogramming traditions of:

- **C Macros** - For showing us the power (and the pain)
- **C++ Templates** - For pushing the boundaries of what's possible
- **Rust Macros** - For making metaprogramming approachable
- **Zig Comptime** - For proving compile-time can be elegant
- **Lisp** - For being meta before meta was cool

Special thanks to the TypeScript team for making this kind of transformation possible, and to the SWC team for creating a fast, extensible parser that doesn't make us cry.

## 🗺️ Roadmap to Zero Runtime Overhead

### Current State (v0.1.0): ⚠️ Has Runtime Overhead

```javascript
// ❌ What we generate now (still has overhead)
function _ts_decorate(decorators, target, key, desc) {
  /* reflection */
}
import { weaveFunction } from "@fajarnugraha37/metadrama"; // runtime import
UserService = _ts_decorate([Service()], UserService); // runtime weaving
```

### Target State (v0.2.0): ✅ Zero Runtime Overhead

```javascript
// ✅ What we will generate (pure JavaScript)
export class UserService {
  async getUser(id) {
    // All aspect logic compiled directly in
    const start = performance.now();
    console.log(`🚀 Starting getUser`, [id]);

    const result = await this.db.findById(id);

    console.log(
      `✅ getUser completed in ${(performance.now() - start).toFixed(2)}ms`
    );
    return result;
  }
}
// No imports, No decorators, No reflection, No runtime overhead
```

### 🎯 **Phase 5 Goals (Q1-Q2 2025)**

- [ ] **Pure Code Generation**: Eliminate all runtime imports and reflection
- [ ] **Compile-time Markers**: Replace `@decorators` with `/** @metadrama */` comments
- [ ] **Inline Everything**: Aspects and macros compiled directly into methods
- [ ] **Performance Parity**: Generated code matches hand-written performance
- [ ] **Bundle Size**: Zero MetaDrama footprint in production builds

### 📋 **Detailed Planning Documents**

- [**ROADMAP.md**](./ROADMAP.md) - Updated roadmap with Phase 5 zero runtime goals
- [**docs/zero-runtime-plan.md**](./docs/zero-runtime-plan.md) - Complete technical implementation plan
- [**docs/zero-runtime-tasks.md**](./docs/zero-runtime-tasks.md) - Detailed task breakdown and tracking
- [**docs/before_after.md**](./docs/before_after.md) - Current vs target transformation examples

---

_"Remember: With great metaprogramming power comes great debugging responsibility."_ 🕷️

---

**Made with ☕ and 🎭 by developers who think regular programming isn't dramatic enough.**
