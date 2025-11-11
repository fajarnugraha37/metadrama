# Getting Started with MetaDrama

A step-by-step guide to get up and running with MetaDrama in your TypeScript project.

## Prerequisites

- Node.js 18+ or Bun 1.0+
- TypeScript 4.9+
- A supported build tool (SWC, TypeScript Compiler, Vite, or Bun)

## Quick Setup

### 1. Installation

```bash
# Using Bun (recommended)
bun add @fajarnugraha37/metadrama

# Using npm
npm install @fajarnugraha37/metadrama

# Using yarn
yarn add @fajarnugraha37/metadrama
```

### 2. Choose Your Build Integration

#### Option A: SWC (Recommended)

Create or update your `.swcrc`:

```json
{
  "jsc": {
    "target": "es2020",
    "parser": {
      "syntax": "typescript",
      "decorators": true
    },
    "experimental": {
      "plugins": [["@fajarnugraha37/metadrama/swc", {}]]
    }
  }
}
```

#### Option B: TypeScript Compiler with ts-patch

First install ts-patch:

```bash
bun add -D ts-patch
```

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false,
    "plugins": [{ "transform": "@fajarnugraha37/metadrama/ts-patch" }]
  }
}
```

Prepare TypeScript:

```bash
npx ts-patch install
```

#### Option C: Vite

Update your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { metadramaVitePlugin } from "@fajarnugraha37/metadrama/vite";

export default defineConfig({
  plugins: [metadramaVitePlugin()],
});
```

#### Option D: Bun

Update your `bunfig.toml`:

```toml
[build]
plugins = ["@fajarnugraha37/metadrama/bun-esbuild"]
```

### 3. Create Aspect Configuration

Create `aspect.config.ts` in your project root:

```typescript
/** @meta */
import {
  pointcut,
  around,
  before,
  after,
  macro,
} from "@fajarnugraha37/metadrama";

// Example: Add timing to service methods
const serviceMethods = pointcut.classes.withDecorator("Service").methods;

around(serviceMethods)((ctx) => {
  const start = performance.now();
  console.log(`Starting ${ctx.targetName}`);

  const result = ctx.proceed(...ctx.args);

  return ctx.wrap(result, (value) => {
    const duration = performance.now() - start;
    console.log(`${ctx.targetName} completed in ${duration.toFixed(2)}ms`);
    return value;
  });
});

// Example: Add caching to getter methods
const getterMethods = serviceMethods.name(/^get/);

macro.memoize({ ttlMs: 60000 }).applyTo(getterMethods);
```

### 4. Write Your Code

Create a service with decorators:

```typescript
// services/user-service.ts
@Service()
export class UserService {
  async getUser(id: string) {
    // This will be enhanced with timing and caching
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { id, name: "John Doe", email: "john@example.com" };
  }

  async createUser(userData: any) {
    // This will be enhanced with timing
    console.log("Creating user:", userData);
    return { id: "new-id", ...userData };
  }
}

function Service() {
  return (target: any) => target;
}
```

### 5. Build and Run

```bash
# Build with your chosen tool
bun run build    # or npm run build
                # or npx swc src -d dist
                # or npx tsc

# Run your application
bun run start    # or npm start
```

## Expected Output

When you run your application, you should see output like:

```
Starting getUser
[memoize] cache miss for getUser("user-123")
getUser completed in 102.34ms

Starting getUser
[memoize] cache hit for getUser("user-123")
getUser completed in 0.12ms

Starting createUser
Creating user: { name: "Jane Doe", email: "jane@example.com" }
createUser completed in 5.67ms
```

## Next Steps

### Explore Examples

Check out the included examples:

```bash
# Basic usage
cd examples/basic && bun run dev

# Macro demonstrations
cd examples/macros && bun run dev

# Performance tracing
cd examples/trace && bun run dev

# Retry patterns
cd examples/retry && bun run dev
```

### Learn More

- [Usage Guide](./usage.md) - Comprehensive usage documentation
- [Architecture](./architecture.md) - How MetaDrama works internally
- [Recipes](./recipes/) - Common patterns and advanced techniques
- [API Reference](../src/index.ts) - Complete API documentation

### Interactive Playground

Start the interactive playground to experiment with MetaDrama:

```bash
bun run playground
# Visit http://localhost:4173
```

## Troubleshooting

### Common Issues

1. **Decorators not being detected**

   - Ensure `aspect.config.ts` has the `/** @meta */` pragma at the top
   - Verify your build tool is properly configured
   - Check that decorators are enabled in TypeScript config

2. **TypeScript errors**

   - Make sure `experimentalDecorators: true` is set
   - Verify MetaDrama types are properly imported

3. **Build tool integration issues**
   - Check plugin order in build configuration
   - Ensure SWC experimental plugins are enabled
   - Verify file extensions are properly handled

### Getting Help

- Check the [examples](../examples/) for working code
- Review [test files](../tests/) for usage patterns
- Open an issue on GitHub for bug reports
- Join our Discord community for questions

## What's Next?

Now that you have MetaDrama working, explore these advanced features:

- **Multiple advice types**: Combine before, after, and around advice
- **Complex pointcuts**: Use regex patterns and conditional filters
- **Custom macros**: Create your own compile-time transformations
- **Performance monitoring**: Track and optimize your application
- **Architecture rules**: Enforce coding standards with compile-time checks

Happy coding with MetaDrama! 🎭
