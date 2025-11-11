# Security and Best Practices Guidelines

## Security Principles

MetaDrama performs code generation and transformation, which requires careful security considerations:

1. **Input Validation** - Never trust user-provided code or configurations
2. **Code Injection Prevention** - Sanitize all generated code
3. **Dependency Security** - Minimize and audit external dependencies
4. **Build Security** - Ensure transformations don't introduce vulnerabilities
5. **Runtime Safety** - Generated code should be safe by default

## Code Generation Security

### Template Security

```typescript
// ✅ Good: Safe template generation with escaping
function generateSafeCode(
  userInput: string,
  context: GenerationContext
): string {
  const sanitized = sanitizeIdentifier(userInput);
  const escaped = escapeStringLiteral(userInput);

  return `
    const ${sanitized}_cache = new Map()
    console.log("Processing: ${escaped}")
  `;
}

function sanitizeIdentifier(input: string): string {
  // Only allow valid JavaScript identifiers
  return input.replace(/[^a-zA-Z0-9_$]/g, "_");
}

function escapeStringLiteral(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// ❌ Bad: Direct template interpolation (code injection risk)
function generateUnsafeCode(userInput: string): string {
  return `
    const ${userInput}_cache = new Map()  // Injection risk!
    console.log("${userInput}")           // XSS risk if in browser!
  `;
}
```

### AST-Based Generation (Preferred)

```typescript
// ✅ Better: Use AST nodes instead of string templates
function generateSafeASTCode(name: string, value: string): ts.Statement[] {
  return [
    ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(sanitizeIdentifier(name + "_cache")),
            undefined,
            undefined,
            ts.factory.createNewExpression(
              ts.factory.createIdentifier("Map"),
              undefined,
              []
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
  ];
}
```

## Dependency Security

### Minimal Dependencies

```typescript
// ✅ Good: Lazy loading optional dependencies
function createValidator(schema: TSchema) {
  try {
    // Only load when actually needed
    const { TypeCompiler } = require("@sinclair/typebox/compiler");
    return TypeCompiler.Compile(schema);
  } catch (error) {
    throw new Error(
      "TypeBox is required for validation macros. Install @sinclair/typebox"
    );
  }
}

// ✅ Good: Provide alternatives for security-sensitive operations
function createHash(input: string): string {
  try {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(input).digest("hex");
  } catch {
    // Fallback for environments without crypto
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(16);
  }
}
```

### Dependency Auditing

```bash
# Regular security audits
npm audit --audit-level=moderate
bun audit

# Pin dependency versions
"dependencies": {
  "@sinclair/typebox": "0.32.15"  # Exact version, not ^0.32.15
}
```

## Runtime Security

### Safe Code Generation

```typescript
// ✅ Generate safe runtime helpers
function generateMemoizeHelper(options: MemoizeOptions): string {
  // Validate options to prevent injection
  const ttl = Number(options.ttlMs) || 0;
  const maxSize = Number(options.maxSize) || 0;

  if (ttl < 0 || maxSize < 0) {
    throw new Error("Invalid memoize options: values must be non-negative");
  }

  // Generate safe code with validated values
  return `
    function createMemoizeCache() {
      const cache = new Map()
      const ttl = ${ttl}
      const maxSize = ${maxSize}
      
      return {
        get(key) {
          const entry = cache.get(key)
          if (!entry) return undefined
          
          if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
            cache.delete(key)
            return undefined
          }
          
          return entry.value
        },
        
        set(key, value) {
          if (maxSize > 0 && cache.size >= maxSize) {
            const firstKey = cache.keys().next().value
            cache.delete(firstKey)
          }
          
          cache.set(key, { value, timestamp: Date.now() })
        }
      }
    }
  `;
}
```

### Memory Safety

```typescript
// Prevent memory leaks in generated code
function generateCleanupCode(): string {
  return `
    // Auto-cleanup for long-running processes
    if (typeof process !== 'undefined' && process.on) {
      const caches = new Set()
      
      process.on('exit', () => {
        caches.forEach(cache => cache.clear())
      })
      
      // Register cache for cleanup
      function registerCache(cache) {
        caches.add(cache)
      }
    }
  `;
}
```

## Configuration Security

### Safe Configuration Loading

```typescript
// ✅ Validate configuration schemas
interface SafeConfig {
  include?: string[];
  exclude?: string[];
  macros?: {
    memoize?: { defaultTTL?: number };
    retry?: { maxAttempts?: number };
  };
}

function loadConfig(configPath: string): SafeConfig {
  try {
    const rawConfig = require(configPath);
    return validateConfig(rawConfig);
  } catch (error) {
    throw new Error(
      `Failed to load config from ${configPath}: ${error.message}`
    );
  }
}

function validateConfig(config: any): SafeConfig {
  const errors: string[] = [];

  if (config.include && !Array.isArray(config.include)) {
    errors.push("include must be an array");
  }

  if (
    config.macros?.memoize?.defaultTTL &&
    (typeof config.macros.memoize.defaultTTL !== "number" ||
      config.macros.memoize.defaultTTL < 0)
  ) {
    errors.push("defaultTTL must be a non-negative number");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join(", ")}`);
  }

  return config as SafeConfig;
}
```

### Environment Variable Security

```typescript
// ✅ Safe environment variable handling
function getSecureEnvValue(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  // Validate environment variables
  if (key.includes("PATH") && !isValidPath(value)) {
    throw new Error(`Invalid path in environment variable ${key}`);
  }

  return value;
}

function isValidPath(path: string): boolean {
  // Basic path validation
  return !path.includes("../") && !path.includes("..\\");
}
```

## Error Handling Security

### Secure Error Messages

```typescript
// ✅ Don't leak sensitive information in errors
function createSecureDiagnostic(
  error: Error,
  context: TransformContext
): DiagnosticEntry {
  // Strip potentially sensitive information
  const safeMessage = sanitizeErrorMessage(error.message);
  const safeStack =
    process.env.NODE_ENV === "development" ? error.stack : undefined;

  return {
    code: "MD1000",
    level: "error",
    message: safeMessage,
    file: context.fileName,
    // Don't include full file paths in production
    hint:
      process.env.NODE_ENV === "development"
        ? `Full error: ${error.message}`
        : "Run with NODE_ENV=development for detailed errors",
  };
}

function sanitizeErrorMessage(message: string): string {
  // Remove potential file paths and sensitive data
  return message
    .replace(/\/[^\s]+/g, "[path]") // Unix paths
    .replace(/[A-Z]:\\[^\s]+/g, "[path]") // Windows paths
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[ip]"); // IP addresses
}
```

## Build Security

### Plugin Security

```typescript
// ✅ Secure plugin loading
function loadPlugin(pluginPath: string): MetaDramaPlugin {
  // Only allow plugins from trusted locations
  const trustedPaths = [
    "node_modules/@metadrama/",
    "node_modules/metadrama-plugin-",
  ];

  const isTrusted = trustedPaths.some((trusted) =>
    pluginPath.includes(trusted)
  );

  if (!isTrusted && process.env.NODE_ENV === "production") {
    throw new Error(`Untrusted plugin path: ${pluginPath}`);
  }

  try {
    const plugin = require(pluginPath);
    return validatePlugin(plugin);
  } catch (error) {
    throw new Error(`Failed to load plugin ${pluginPath}: ${error.message}`);
  }
}

function validatePlugin(plugin: any): MetaDramaPlugin {
  const required = ["name", "version", "transform"];
  const missing = required.filter((prop) => !plugin[prop]);

  if (missing.length > 0) {
    throw new Error(
      `Plugin missing required properties: ${missing.join(", ")}`
    );
  }

  return plugin as MetaDramaPlugin;
}
```

### File System Security

```typescript
// ✅ Safe file operations
function safeReadFile(filePath: string): string {
  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  const cwd = process.cwd();

  if (!resolved.startsWith(cwd)) {
    throw new Error(`File access outside working directory: ${filePath}`);
  }

  // Check file extension whitelist
  const allowedExtensions = [".ts", ".tsx", ".js", ".jsx"];
  const ext = path.extname(resolved);

  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return fs.readFileSync(resolved, "utf-8");
}
```

## Security Testing

### Security Test Cases

```typescript
describe("Security Tests", () => {
  test("should prevent code injection in macro generation", () => {
    const maliciousInput = '"; alert("xss"); //';

    expect(() => {
      generateMemoizeHelper({
        key: maliciousInput as any,
      });
    }).toThrow("Invalid macro option");
  });

  test("should sanitize file paths in error messages", () => {
    const error = new Error("/home/user/.ssh/private_key not found");
    const diagnostic = createSecureDiagnostic(error, mockContext);

    expect(diagnostic.message).not.toContain("/home/user/.ssh/");
    expect(diagnostic.message).toContain("[path]");
  });

  test("should prevent directory traversal in file access", () => {
    expect(() => {
      safeReadFile("../../../etc/passwd");
    }).toThrow("File access outside working directory");
  });
});
```

### Automated Security Checks

```typescript
// Add security linting rules
module.exports = {
  extends: ["@metadrama/eslint-config"],
  rules: {
    "security/detect-eval-with-expression": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
  },
};
```

## Security Incident Response

### Vulnerability Reporting

```markdown
## Security Policy

### Reporting Vulnerabilities

Please report security vulnerabilities to security@metadrama.dev

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

### Response Timeline

- Initial response: 48 hours
- Assessment: 7 days
- Fix deployment: 14 days for critical issues

### Disclosure Policy

- We practice coordinated disclosure
- Public disclosure after fix deployment
- Credit given to security researchers
```

Remember: Security is not optional - it's a fundamental requirement for any tool that transforms code! 🔒
