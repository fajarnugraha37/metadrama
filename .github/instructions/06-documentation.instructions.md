# Documentation and Developer Experience Guidelines

## Documentation Philosophy

MetaDrama's documentation should be:

1. **Example-First** - Show, don't just tell
2. **Progressive Complexity** - Start simple, build to advanced
3. **Searchable** - Easy to find specific information
4. **Actionable** - Every example should work copy-paste
5. **Contextual** - Explain why, not just how

## Writing Style Guidelines

### Tone and Voice

- **Playful but Professional** - Humor that enhances understanding
- **Conversational** - Write like talking to a colleague
- **Confident but Humble** - Acknowledge complexity while being helpful
- **Inclusive** - Accessible to developers of all experience levels

````markdown
<!-- ✅ Good: Engaging and informative -->

## Smart Caching with Memoize

Tired of expensive function calls slowing down your app? The `memoize` macro
transforms your methods into lightning-fast cached versions at compile time.

```typescript
// Before: Slow database lookup every time
async function getUser(id: string): Promise<User> {
  return await db.users.findById(id); // Hits DB every call 😢
}

// After: Cached goodness
macro.memoize({ ttlMs: 300_000 }).applyTo(pointcut.functions.name("getUser"));
// Now it's cached for 5 minutes! 🚀
```
````

<!-- ❌ Bad: Dry and hard to follow -->

## Memoization Macro

The memoization macro provides caching functionality for function invocations
through compile-time transformation of the target method signatures.

```typescript
macro.memoize(options: MemoizeOptions).applyTo(pointcut: Pointcut)
```

````

### Code Examples Standards

```typescript
// ✅ Good: Complete, runnable examples with context
// service/user.service.ts
@Service()
export class UserService {
  constructor(private db: DatabaseService) {}

  async getUser(id: string): Promise<User> {
    return await this.db.findById(id)
  }
}

// aspect.config.ts
const services = pointcut.classes.withDecorator("Service").methods

// Add intelligent caching to getter methods
macro.memoize({
  ttlMs: 300_000,  // 5 minutes
  key: (id) => `user:${id}`
}).applyTo(services.name(/^get/))

// ❌ Bad: Incomplete fragments without context
macro.memoize().applyTo(pointcut.functions.name("getUser"))
````

## API Documentation Structure

### Function/Method Documentation

````typescript
/**
 * Creates a pointcut that targets methods by decorator name.
 *
 * @example Basic usage
 * ```typescript
 * // Target all methods in @Service decorated classes
 * const serviceMethods = pointcut.classes.withDecorator("Service").methods
 * ```
 *
 * @example With additional filtering
 * ```typescript
 * // Target only async getter methods in services
 * const asyncGetters = pointcut.classes
 *   .withDecorator("Service")
 *   .methods
 *   .name(/^get/)
 *   .async
 * ```
 *
 * @param decoratorName - The decorator name to match (without @)
 * @returns A pointcut builder for further refinement
 *
 * @see {@link MethodSelector} for available method filters
 * @since 1.0.0
 */
withDecorator(decoratorName: string): ClassMatchBuilder
````

### Error Documentation

````markdown
## Error Code: MD1003

**Message**: Transform failed: unable to parse decorated class

**Cause**: The transformer encountered a class with invalid decorator syntax or structure.

**Common Scenarios**:

- Missing decorator parentheses: `@Service` instead of `@Service()`
- Invalid decorator arguments: `@Service(123)` where string expected
- Malformed class syntax

**Fix**:

1. Check decorator syntax matches expected pattern
2. Ensure class is properly structured TypeScript
3. Verify decorators are imported correctly

**Example**:

```typescript
// ❌ Bad: Missing parentheses
@Service
class UserService {}

// ✅ Good: Proper decorator syntax
@Service()
class UserService {}
```
````

````

## Tutorial Structure

### Progressive Learning Path
1. **Getting Started** (5 minutes)
   - Installation and basic setup
   - First aspect (simple logging)
   - See immediate results

2. **Core Concepts** (15 minutes)
   - Pointcuts, advice, macros
   - Transform pipeline overview
   - Build tool integration

3. **Practical Patterns** (30 minutes)
   - Common use cases with solutions
   - Real-world examples
   - Performance considerations

4. **Advanced Techniques** (60 minutes)
   - Custom macros
   - Complex pointcuts
   - Plugin development

### Tutorial Template
```markdown
# Tutorial: Adding Smart Retry Logic

> **Goal**: Learn to automatically retry failed API calls using MetaDrama's retry macro
> **Time**: 10 minutes
> **Prerequisites**: Basic TypeScript knowledge

## What You'll Build

By the end of this tutorial, your external API calls will automatically retry with exponential backoff:

```typescript
// This method will retry up to 3 times with smart backoff
async function fetchUserProfile(id: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}
````

## Step 1: Identify Retry Candidates

First, let's find methods that make external calls...

[Step-by-step instructions with code examples]

## Step 2: Apply Retry Macro

Now we'll add retry logic using a simple macro...

## Step 3: Test and Validate

Let's verify our retry logic works...

## What You Learned

- How to identify good candidates for retry logic
- Using the retry macro with custom configuration
- Testing retry behavior in development

## Next Steps

- [Advanced Retry Patterns](./advanced-retry.md)
- [Custom Retry Strategies](./custom-retry.md)
- [Error Handling Best Practices](./error-handling.md)

````

## Interactive Documentation

### Playground Examples
```typescript
// Each example should be directly runnable in the playground
export const examples = {
  basicLogging: {
    title: "Basic Method Logging",
    description: "Add console logging to all service methods",
    code: `
      const services = pointcut.classes.withDecorator("Service").methods

      before(services)((ctx) => {
        console.log(\`🚀 Starting \${ctx.targetName}\`, ctx.args)
      })

      after(services)((ctx) => {
        if (ctx.error) {
          console.error(\`❌ \${ctx.targetName} failed\`, ctx.error)
        } else {
          console.log(\`✅ \${ctx.targetName} succeeded\`)
        }
      })
    `,
    tags: ["beginner", "logging", "debugging"]
  },

  smartCaching: {
    title: "Smart Method Caching",
    description: "Add TTL-based caching to expensive operations",
    code: `
      const expensiveMethods = pointcut.classes.methods.where(method =>
        method.name.includes("calculate") ||
        method.name.includes("process") ||
        method.decorators.includes("Expensive")
      )

      macro.memoize({
        ttlMs: 600_000, // 10 minutes
        key: (...args) => \`cache:\${JSON.stringify(args)}\`,
        maxSize: 1000
      }).applyTo(expensiveMethods)
    `,
    tags: ["performance", "caching", "intermediate"]
  }
}
````

### Error Guide Format

````markdown
# Troubleshooting Guide

## Common Issues

### "No targets found for pointcut"

**Symptoms**: Your aspects aren't being applied, no generated code

**Debugging Steps**:

1. Check if your pointcut matches any methods:
   ```bash
   metadrama check --explain MD1001
   ```
````

2. Test your pointcut in isolation:

   ```typescript
   console.log(pointcut.classes.withDecorator("Service").methods.describe());
   ```

3. Verify decorator names match exactly:
   ```typescript
   // Case sensitive!
   pointcut.classes.withDecorator("service"); // ❌ Wrong case
   pointcut.classes.withDecorator("Service"); // ✅ Correct
   ```

**Solutions**:

- Use broader pointcuts during development: `pointcut.classes.methods`
- Check decorator imports and usage
- Verify files are being processed by the transformer

````

## Developer Experience Principles

### Error Messages
```typescript
// ✅ Good: Helpful error with context and solution
{
  code: "MD1008",
  level: "error",
  message: "Pointcut selector 'invalidMethod' is not recognized",
  file: "src/aspects.ts",
  span: { line: 15, column: 42 },
  hint: "Available methods: withDecorator(), name(), where(). Did you mean 'name()'?",
  docs: "https://metadrama.dev/docs/api-reference#pointcut-selectors"
}

// ❌ Bad: Cryptic error without help
{
  code: "ERR001",
  message: "Invalid selector"
}
````

### IDE Integration

```typescript
// Provide rich TypeScript definitions for great IntelliSense
interface PointcutBuilder {
  /**
   * Target classes with specific decorators
   * @example pointcut.classes.withDecorator("Service")
   */
  classes: ClassSelector;

  /**
   * Target standalone functions
   * @example pointcut.functions.name(/^fetch/)
   */
  functions: FunctionSelector;

  /**
   * Target methods within classes
   * @example pointcut.methods.async
   */
  methods: MethodSelector;
}
```

### CLI Experience

```bash
# Provide helpful, colorized output
$ metadrama build

🎭 MetaDrama v1.0.0

📁 Scanning src/ for aspects...
   ✅ Found 3 advice registrations
   ✅ Found 2 macro applications

🔄 Transforming files...
   ✅ src/services/user.service.ts (2 aspects applied)
   ✅ src/api/orders.controller.ts (1 macro expanded)
   ⚠️  src/legacy/old.service.ts (no matches for pointcut)

📊 Results:
   • 15 files processed
   • 8 methods enhanced with aspects
   • 0 errors, 1 warning
   • Completed in 1.2s

💡 Tip: Use --verbose to see detailed transformation info
```

## Documentation Maintenance

### Content Review Process

1. **Accuracy Check** - All examples must compile and run
2. **Freshness Review** - Update for new features and API changes
3. **User Feedback** - Incorporate questions and confusion points
4. **Performance Update** - Keep benchmarks and claims current

### Automation

```typescript
// Test all documentation examples in CI
describe("Documentation Examples", () => {
  const exampleFiles = glob("docs/**/*.md");

  for (const file of exampleFiles) {
    test(`Examples in ${file} should compile`, () => {
      const examples = extractCodeBlocks(file, "typescript");

      for (const example of examples) {
        expect(() => compile(example.code)).not.toThrow();
      }
    });
  }
});
```

Remember: Great documentation is the difference between a tool and a beloved framework. Make every interaction delightful! 📚
