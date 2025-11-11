# Plugin Development Guidelines

## Plugin Architecture Principles

Each build tool plugin should be:

1. **Self-contained** - No shared state between plugins
2. **Consistent** - Same API patterns across all plugins
3. **Defensive** - Handle errors gracefully with useful diagnostics
4. **Efficient** - Minimal overhead in the build process
5. **Debuggable** - Clear logging and error reporting

## Plugin Structure Template

```typescript
// src/plugin/{tool}.ts
export interface PluginOptions {
  // Common options across all plugins
  include?: string | string[]
  exclude?: string | string[]
  verbose?: boolean

  // Plugin-specific options
  [key: string]: any
}

export function create{Tool}Plugin(options: PluginOptions = {}): PluginType {
  const config = normalizeOptions(options)

  return {
    name: "metadrama",

    // Plugin-specific methods
    transform(code: string, id: string) {
      if (!shouldTransform(id, config)) return null

      try {
        return transformWithMetaDrama(code, id, config)
      } catch (error) {
        return handleTransformError(error, id)
      }
    }
  }
}

function normalizeOptions(options: PluginOptions): NormalizedOptions {
  return {
    include: Array.isArray(options.include) ? options.include : [options.include || "**/*.ts"],
    exclude: Array.isArray(options.exclude) ? options.exclude : [options.exclude || "node_modules/**"],
    verbose: options.verbose ?? false,
    ...options
  }
}

function shouldTransform(id: string, config: NormalizedOptions): boolean {
  // Check file extensions
  if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return false

  // Check include/exclude patterns
  const included = config.include.some(pattern => minimatch(id, pattern))
  const excluded = config.exclude.some(pattern => minimatch(id, pattern))

  return included && !excluded
}
```

## Error Handling Patterns

```typescript
// Consistent error handling across all plugins
function handleTransformError(error: Error, filename: string): TransformResult {
  // Map different error types to appropriate diagnostics
  if (error instanceof SyntaxError) {
    return createTransformResult(null, [
      {
        code: "MD1006",
        level: "error",
        message: `Syntax error in ${filename}: ${error.message}`,
        hint: "Check TypeScript syntax and ensure the file compiles",
      },
    ]);
  }

  if (error instanceof AspectError) {
    return createTransformResult(null, [
      {
        code: error.code,
        level: error.level,
        message: error.message,
        file: filename,
        hint: error.hint,
      },
    ]);
  }

  // Unknown errors
  return createTransformResult(null, [
    {
      code: "MD1000",
      level: "error",
      message: `Unexpected error in ${filename}: ${error.message}`,
      hint: "This may be a bug in MetaDrama. Please report it.",
    },
  ]);
}
```

## Build Tool Specific Patterns

### Vite Plugin

```typescript
export function metadramaVitePlugin(options: PluginOptions = {}) {
  return {
    name: "metadrama",

    configResolved(config) {
      // Access resolved vite config
      this.isProduction = config.command === "build";
    },

    transform(code: string, id: string) {
      // Vite-specific file filtering
      if (id.includes("node_modules")) return null;
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;

      const result = transformWithMetaDrama(code, id, {
        ...options,
        production: this.isProduction,
      });

      if (result.diagnostics.length > 0) {
        // Use Vite's warning system
        result.diagnostics.forEach((diagnostic) => {
          if (diagnostic.level === "error") {
            this.error(formatDiagnostic(diagnostic));
          } else {
            this.warn(formatDiagnostic(diagnostic));
          }
        });
      }

      return {
        code: result.code,
        map: result.sourcemap,
      };
    },
  };
}
```

### SWC Plugin

```typescript
// SWC plugins are different - they're Rust-based WASM modules
// This is the TypeScript interface for configuration

export interface SwcPluginConfig {
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
}

// The actual plugin is implemented in Rust and compiled to WASM
// This file provides TypeScript types and helper functions

export function createSwcConfig(options: SwcPluginConfig = {}): any {
  return {
    jsc: {
      experimental: {
        plugins: [
          [
            "@fajarnugraha37/metadrama/swc",
            {
              include: options.include || ["**/*.ts", "**/*.tsx"],
              exclude: options.exclude || ["node_modules/**"],
              verbose: options.verbose || false,
            },
          ],
        ],
      },
    },
  };
}
```

### TypeScript Compiler Plugin (ts-patch)

```typescript
export function createTsPatchTransformer(
  program: ts.Program,
  config?: PluginConfig
) {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sourceFile: ts.SourceFile) => {
      if (!shouldTransform(sourceFile.fileName, config)) {
        return sourceFile;
      }

      try {
        const result = transformSourceFile(
          sourceFile,
          program,
          context,
          config
        );

        // Emit diagnostics to TypeScript's diagnostic system
        if (result.diagnostics.length > 0) {
          emitDiagnostics(program, result.diagnostics);
        }

        return result.sourceFile;
      } catch (error) {
        emitError(program, error, sourceFile.fileName);
        return sourceFile;
      }
    };
  };
}
```

### Bun Plugin

```typescript
export function createBunPlugin(options: PluginOptions = {}): BunPlugin {
  return {
    name: "metadrama",

    setup(build) {
      // Filter files using Bun's filter system
      build.onLoad(
        {
          filter: /\.(ts|tsx)$/,
          namespace: "file",
        },
        async (args) => {
          if (!shouldTransform(args.path, options)) {
            return undefined; // Let Bun handle normally
          }

          const source = await Bun.file(args.path).text();
          const result = transformWithMetaDrama(source, args.path, options);

          return {
            contents: result.code,
            loader: "ts",
          };
        }
      );
    },
  };
}
```

## Testing Plugin Integrations

```typescript
// Plugin tests should verify integration with build tools
describe("Vite Plugin Integration", () => {
  test("should transform files during vite build", async () => {
    const viteConfig = {
      plugins: [metadramaVitePlugin()],
      build: { write: false }, // Don't write to disk
    };

    const result = await build(viteConfig);

    expect(result.output[0].code).toContain("// MetaDrama transformed");
    expect(result.output[0].code).not.toContain("pointcut.");
  });

  test("should emit vite warnings for diagnostics", async () => {
    const mockViteContext = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const plugin = metadramaVitePlugin();
    const transform = plugin.transform.bind(mockViteContext);

    transform("invalid aspect code", "test.ts");

    expect(mockViteContext.warn).toHaveBeenCalled();
  });
});
```

## Plugin Configuration Validation

```typescript
// Validate plugin options and provide helpful error messages
function validatePluginOptions(options: any): PluginOptions {
  const errors: string[] = [];

  if (
    options.include &&
    !Array.isArray(options.include) &&
    typeof options.include !== "string"
  ) {
    errors.push("'include' must be a string or array of strings");
  }

  if (
    options.exclude &&
    !Array.isArray(options.exclude) &&
    typeof options.exclude !== "string"
  ) {
    errors.push("'exclude' must be a string or array of strings");
  }

  if (options.verbose && typeof options.verbose !== "boolean") {
    errors.push("'verbose' must be a boolean");
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid plugin options:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return options as PluginOptions;
}
```

## Performance Considerations

```typescript
// Cache transforms to avoid redundant work
const transformCache = new Map<
  string,
  { mtime: number; result: TransformResult }
>();

function cachedTransform(
  code: string,
  filename: string,
  options: PluginOptions
): TransformResult {
  const stat = fs.statSync(filename);
  const cached = transformCache.get(filename);

  if (cached && cached.mtime >= stat.mtimeMs) {
    return cached.result;
  }

  const result = transformWithMetaDrama(code, filename, options);
  transformCache.set(filename, { mtime: stat.mtimeMs, result });

  return result;
}

// Clean up cache periodically
setInterval(() => {
  if (transformCache.size > 1000) {
    transformCache.clear();
  }
}, 60000);
```

## Plugin Documentation

Each plugin should include:

1. **Installation instructions** - How to add to build config
2. **Configuration options** - All available settings with examples
3. **Troubleshooting guide** - Common issues and solutions
4. **Performance notes** - Expected impact on build times
5. **Integration examples** - Real-world usage patterns

Remember: Plugins are the bridge between MetaDrama and the developer's workflow. They should feel natural and provide clear feedback when things go wrong! 🔧
