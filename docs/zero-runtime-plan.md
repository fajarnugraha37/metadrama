# Zero Runtime Overhead Implementation Plan

## 🎯 Executive Summary

MetaDrama currently uses TypeScript decorators and runtime weaving, which creates performance overhead. This plan outlines the transformation to **true zero runtime overhead** aspect-oriented programming through pure compile-time code generation.

## 🚨 Current State Analysis

### Runtime Overhead Sources

| Component      | Current Implementation             | Runtime Cost      | Bundle Impact   |
| -------------- | ---------------------------------- | ----------------- | --------------- |
| **Decorators** | `@Service()` → `_ts_decorate()`    | Reflection calls  | +2KB helper     |
| **Imports**    | `import { weaveFunction }`         | Module resolution | +15KB runtime   |
| **Weaving**    | `weaveMethod()` at startup         | Method patching   | Startup delay   |
| **Pointcuts**  | `pointcut.classes.withDecorator()` | Runtime parsing   | Memory overhead |

### Performance Impact

```bash
# Current MetaDrama output analysis
Bundle size increase: ~17KB
Startup overhead: ~5-10ms per woven method
Runtime memory: ~1KB per pointcut
Reflection calls: 2-5 per decorated class
```

## 🛠️ Implementation Strategy

### Phase 1: Marker System Design (Week 1-2)

#### Replace TypeScript Decorators

**Current Decorator Syntax:**

```typescript
@Service()
@Transactional()
class UserService {
  @Cache({ ttl: 300 })
  async getUser(id: string) {}
}
```

**New Compile-Time Markers:**

```typescript
/**
 * @metadrama:class Service,Transactional
 */
class UserService {
  /**
   * @metadrama:method Cache(ttl=300)
   */
  async getUser(id: string) {}
}
```

#### Marker Parser Implementation

```typescript
// src/transform/marker-parser.ts
export interface ClassMarker {
  type: "class";
  name: string;
  aspects: string[];
  line: number;
  column: number;
}

export interface MethodMarker {
  type: "method";
  name: string;
  macros: Array<{ name: string; options: Record<string, any> }>;
  line: number;
  column: number;
}

export function parseMarkers(source: string): {
  classes: ClassMarker[];
  methods: MethodMarker[];
} {
  // Parse JSDoc comments for @metadrama directives
  // Extract aspect and macro information
  // Return structured marker data
}
```

### Phase 2: Pure Code Generation Engine (Week 3-4)

#### Method Body Transformation

**Input Method:**

```typescript
/**
 * @metadrama:method Cache(ttl=300),Retry(max=3)
 */
async getUser(id: string): Promise<User> {
  return await this.db.findById(id);
}
```

**Generated Output:**

```javascript
async getUser(id) {
  // Generated cache key
  const __cache_key = `getUser_${JSON.stringify([id])}`;

  // Generated cache check
  if (__method_cache.has(__cache_key)) {
    const __entry = __method_cache.get(__cache_key);
    if (Date.now() - __entry.timestamp < 300000) {
      return __entry.value;
    }
    __method_cache.delete(__cache_key);
  }

  // Generated retry logic
  let __attempt = 0;
  const __max_retries = 3;

  while (__attempt <= __max_retries) {
    try {
      __attempt++;

      // Original method body
      const __result = await this.db.findById(id);

      // Generated cache store
      __method_cache.set(__cache_key, {
        value: __result,
        timestamp: Date.now()
      });

      return __result;

    } catch (__error) {
      if (__attempt > __max_retries) {
        throw __error;
      }

      // Generated backoff delay
      const __delay = 100 * Math.pow(2, __attempt - 1);
      await new Promise(resolve => setTimeout(resolve, __delay));
    }
  }
}
```

#### Code Generation Architecture

```typescript
// src/transform/code-generator.ts
export interface GenerationContext {
  file: string;
  method: MethodSignature;
  markers: MethodMarker[];
  originalBody: string;
  imports: Set<string>;
}

export class CodeGenerator {
  generateMethod(ctx: GenerationContext): string {
    let generatedBody = "";

    // Phase 1: Generate setup code (cache declarations, etc.)
    generatedBody += this.generateSetup(ctx.markers);

    // Phase 2: Generate macro wrappers (retry, memoize, etc.)
    generatedBody += this.generateMacroWrappers(ctx.markers, ctx.originalBody);

    // Phase 3: Generate advice code (before, after, around)
    generatedBody += this.generateAdviceCode(ctx.markers, ctx.originalBody);

    // Phase 4: Inline original method body
    generatedBody += this.inlineOriginalBody(ctx.originalBody);

    return generatedBody;
  }

  private generateMacroWrappers(
    markers: MethodMarker[],
    originalBody: string
  ): string {
    // Generate inline implementations for each macro
  }

  private generateAdviceCode(
    markers: MethodMarker[],
    originalBody: string
  ): string {
    // Generate inline advice implementations
  }
}
```

### Phase 3: Macro System Overhaul (Week 5-6)

#### Memoize Macro

**Configuration:**

```typescript
macro.memoize({
  ttl: 300_000,
  maxSize: 1000,
  key: (id) => `user:${id}`,
});
```

**Generated Code:**

```javascript
// Generated at class level
const __memoize_getUser_cache = new Map();
const __memoize_getUser_config = { ttl: 300000, maxSize: 1000 };

async getUser(id) {
  // Generated cache key function
  const __cache_key = `user:${id}`;

  // Generated cache lookup
  if (__memoize_getUser_cache.has(__cache_key)) {
    const __entry = __memoize_getUser_cache.get(__cache_key);
    if (Date.now() - __entry.timestamp < __memoize_getUser_config.ttl) {
      return __entry.value;
    }
    __memoize_getUser_cache.delete(__cache_key);
  }

  // Generated cache size management
  if (__memoize_getUser_cache.size >= __memoize_getUser_config.maxSize) {
    const __oldest = [...__memoize_getUser_cache.entries()]
      .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
    __memoize_getUser_cache.delete(__oldest[0]);
  }

  // Original method execution
  const __result = /* original method body */;

  // Generated cache storage
  __memoize_getUser_cache.set(__cache_key, {
    value: __result,
    timestamp: Date.now()
  });

  return __result;
}
```

#### Retry Macro

**Configuration:**

```typescript
macro.retry({
  max: 3,
  backoff: "exponential",
  baseMs: 100,
  retryIf: (error) => error.code === "NETWORK_ERROR",
});
```

**Generated Code:**

```javascript
async apiCall(endpoint) {
  let __attempt = 0;
  const __max_attempts = 3;
  const __base_delay = 100;

  while (__attempt <= __max_attempts) {
    try {
      __attempt++;

      // Original method body
      return /* original method implementation */;

    } catch (__error) {
      // Generated retry condition
      const __should_retry = (__error.code === 'NETWORK_ERROR');

      if (__attempt > __max_attempts || !__should_retry) {
        throw __error;
      }

      // Generated exponential backoff
      const __delay = __base_delay * Math.pow(2, __attempt - 1);
      await new Promise(resolve => setTimeout(resolve, __delay));
    }
  }
}
```

#### Validation Macro

**Configuration:**

```typescript
macro.validate({
  schema: UserSchema,
  mode: "args",
  throwOnError: true,
});
```

**Generated Code:**

```javascript
// Generated schema compilation (at module level)
const __validate_processUser_schema = /* compiled TypeBox validator */;

processUser(userData, options) {
  // Generated validation logic
  const __args_to_validate = [userData, options];

  if (!__validate_processUser_schema.Check(__args_to_validate)) {
    const __errors = [...__validate_processUser_schema.Errors(__args_to_validate)];
    throw new ValidationError(`Invalid arguments: ${__errors.map(e => e.message).join(', ')}`);
  }

  // Original method body
  return /* original implementation */;
}
```

### Phase 4: Advice System Transformation (Week 7)

#### Around Advice

**Current Runtime System:**

```typescript
around(pointcut.classes.withMarker("Service").methods)((ctx) => {
  const start = performance.now();
  const result = ctx.proceed(...ctx.args);
  return ctx.wrap(result, (value) => {
    console.log(`${ctx.targetName} took ${performance.now() - start}ms`);
    return value;
  });
});
```

**Generated Inline Implementation:**

```javascript
async serviceMethod(param1, param2) {
  // Generated advice - performance timing
  const __advice_start = performance.now();

  try {
    // Original method body execution
    const __result = /* original method implementation */;

    // Generated async result handling
    if (__result && typeof __result.then === 'function') {
      return __result.then(__value => {
        const __duration = performance.now() - __advice_start;
        console.log(`serviceMethod took ${__duration}ms`);
        return __value;
      });
    }

    // Generated sync result handling
    const __duration = performance.now() - __advice_start;
    console.log(`serviceMethod took ${__duration}ms`);
    return __result;

  } catch (__error) {
    const __duration = performance.now() - __advice_start;
    console.log(`serviceMethod failed after ${__duration}ms`);
    throw __error;
  }
}
```

### Phase 5: Build System Integration (Week 8)

#### Transformer Pipeline

```typescript
// src/transform/zero-runtime-transformer.ts
export class ZeroRuntimeTransformer {
  async transform(file: string, source: string): Promise<TransformResult> {
    // Step 1: Parse markers
    const markers = parseMarkers(source);

    // Step 2: Analyze pointcut matches
    const matches = this.resolvePointcuts(markers);

    // Step 3: Generate transformation plan
    const plan = this.createTransformPlan(matches);

    // Step 4: Execute pure code generation
    const result = this.generateCode(source, plan);

    return {
      code: result.code,
      map: result.sourceMap,
      imports: [], // Always empty - no runtime imports!
      diagnostics: result.diagnostics,
    };
  }

  private resolvePointcuts(markers: ParsedMarkers): PointcutMatch[] {
    // Compile-time pointcut resolution
    // No runtime pointcut evaluation
  }

  private generateCode(source: string, plan: TransformPlan): GeneratedCode {
    // Pure code generation with inlined implementations
    // Zero runtime dependencies
  }
}
```

#### Build Tool Integration

**SWC Plugin Update:**

```typescript
// src/plugin/swc-zero-runtime.ts
export function createZeroRuntimePlugin(): SwcPlugin {
  return {
    name: "metadrama-zero-runtime",
    transform(code: string, filename: string) {
      const transformer = new ZeroRuntimeTransformer();
      const result = transformer.transform(filename, code);

      // Validate zero runtime overhead
      if (result.imports.length > 0) {
        throw new Error("Zero runtime violated: generated code has imports");
      }

      return result;
    },
  };
}
```

## 🧪 Validation & Testing Strategy

### Zero Runtime Overhead Tests

```typescript
// tests/zero-runtime.test.ts
describe("Zero Runtime Overhead Validation", () => {
  test("generated code has zero MetaDrama imports", () => {
    const result = transform(sourceWithAspects);

    expect(result.code).not.toContain('from "@fajarnugraha37/metadrama"');
    expect(result.code).not.toContain("import");
    expect(result.code).not.toContain("require");
  });

  test("generated code has zero reflection", () => {
    const result = transform(sourceWithDecorators);

    expect(result.code).not.toContain("Reflect.decorate");
    expect(result.code).not.toContain("Object.getOwnPropertyDescriptor");
    expect(result.code).not.toContain("_ts_decorate");
  });

  test("performance matches hand-written equivalent", async () => {
    const generatedFn = compileGenerated(sourceWithMemoize);
    const handWrittenFn = createHandWrittenMemoized();

    const generatedTime = await benchmark(generatedFn);
    const handWrittenTime = await benchmark(handWrittenFn);

    expect(generatedTime).toBeLessThanOrEqual(handWrittenTime * 1.05); // 5% tolerance
  });
});
```

### Bundle Size Validation

```typescript
// tests/bundle-size.test.ts
test("bundle size impact is zero", async () => {
  const originalCode = `
    export class UserService {
      async getUser(id: string) {
        return await this.db.findById(id);
      }
    }
  `;

  const aspectCode = `
    /**
     * @metadrama:class Service
     */
    export class UserService {
      /**
       * @metadrama:method Cache(ttl=300)
       */
      async getUser(id: string) {
        return await this.db.findById(id);
      }
    }
  `;

  const originalSize = (await bundle(originalCode)).size;
  const aspectSize = (await bundle(transform(aspectCode))).size;

  // Generated code should only add the actual implementation overhead
  // No MetaDrama runtime should be included
  expect(aspectSize - originalSize).toBeLessThan(500); // Only cache logic
});
```

## 📈 Success Metrics

### Performance Benchmarks

| Metric                  | Current (v0.1.0)    | Target (v0.2.0)      | Improvement  |
| ----------------------- | ------------------- | -------------------- | ------------ |
| **Bundle Size**         | +17KB runtime       | +0KB runtime         | -17KB (100%) |
| **Startup Time**        | +5-10ms per method  | +0ms                 | -10ms (100%) |
| **Memory Usage**        | +1KB per pointcut   | +0KB                 | -1KB (100%)  |
| **Runtime Performance** | 95% of hand-written | 100% of hand-written | +5%          |

### Feature Completeness

- [ ] All current macros work with zero runtime overhead
- [ ] All current advice types work with pure generation
- [ ] All current pointcut selectors work at compile-time
- [ ] Source maps maintain full debugging capability
- [ ] TypeScript types preserved through transformation

## 🚀 Migration Strategy

### Backward Compatibility Plan

1. **Parallel Implementation** (Phase 5.1)

   - Build new zero-runtime system alongside current one
   - Feature flag: `"zeroRuntime": true` in config
   - Allow gradual migration per project

2. **Migration Tooling** (Phase 5.2)

   ```bash
   # Automated migration command
   metadrama migrate --to-zero-runtime src/

   # Converts @decorators to /** @metadrama */ markers
   # Updates aspect configurations for new system
   # Provides migration report
   ```

3. **Documentation & Examples** (Phase 5.3)

   - Comprehensive migration guide
   - Before/after examples for all features
   - Performance comparison documentation
   - Troubleshooting guide for edge cases

4. **Deprecation Timeline** (Phase 5.4)
   - v0.2.0: Zero runtime system available, decorator system deprecated
   - v0.3.0: Decorator system removed, zero runtime only
   - 6-month transition period with clear warnings

### User Communication Plan

```markdown
## Migration Notice: Zero Runtime Overhead in v0.2.0

MetaDrama v0.2.0 introduces **true zero runtime overhead** through pure compile-time code generation.

### What's Changing:

- `@Service()` decorators → `/** @metadrama:class Service */` markers
- Runtime imports eliminated → Pure JavaScript output
- Performance improvement → 100% equivalent to hand-written code

### Migration Steps:

1. Run `metadrama migrate --to-zero-runtime`
2. Update build configuration
3. Test generated output
4. Deploy with confidence

### Timeline:

- Now: v0.1.x with runtime overhead (deprecated)
- Q2 2025: v0.2.0 with zero runtime overhead
- Q4 2025: v0.3.0 removes old system entirely
```

## 🎯 Implementation Timeline

| Week      | Focus           | Deliverables                 | Success Criteria           |
| --------- | --------------- | ---------------------------- | -------------------------- |
| **1-2**   | Marker System   | Parser, AST updates          | Can parse all marker types |
| **3-4**   | Code Generation | Core generator engine        | Can generate basic methods |
| **5-6**   | Macro Overhaul  | Inline macro implementations | All macros work inline     |
| **7**     | Advice System   | Inline advice generation     | All advice types work      |
| **8**     | Integration     | Build tools, testing         | Full pipeline works        |
| **9-10**  | Validation      | Performance testing          | Meets all success criteria |
| **11-12** | Documentation   | Migration guides             | Ready for release          |

---

**Result**: MetaDrama v0.2.0 will be the first truly zero-runtime-overhead aspect-oriented programming framework for JavaScript/TypeScript! 🎭✨
