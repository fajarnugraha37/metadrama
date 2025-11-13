import type { Signature } from "../core/types";
import type {
  ExtendedClassMarker,
  ExtendedMethodMarker,
  ExtendedFunctionMarker,
} from "./marker-parser";
import type { PointcutMatch } from "./pointcut-resolver";

/**
 * Pure code generation engine for zero runtime overhead
 *
 * This generates methods with fully inlined aspect logic,
 * eliminating all runtime imports and dependencies.
 */

export interface GenerationContext {
  signature: Signature;
  originalBody: string;
  originalParameters: string[];
  returnType?: string;
  matchedAdvice: string[];
  matchedMacros: string[];
  className?: string;
  sourceFile: string;
}

export interface GeneratedCode {
  code: string;
  imports: string[];
  globals: string[];
  sourceMap?: string;
}

export interface CodeGenerationOptions {
  preserveComments: boolean;
  generateSourceMaps: boolean;
  optimizeOutput: boolean;
}

/**
 * Code generator for zero runtime overhead transformations
 */
export class CodeGenerator {
  private options: CodeGenerationOptions;
  private generatedGlobals: Set<string> = new Set();

  constructor(options: Partial<CodeGenerationOptions> = {}) {
    this.options = {
      preserveComments: options.preserveComments ?? true,
      generateSourceMaps: options.generateSourceMaps ?? true,
      optimizeOutput: options.optimizeOutput ?? true,
    };
  }

  /**
   * Generate a complete method with inlined aspects
   */
  generateMethod(context: GenerationContext): GeneratedCode {
    const { signature, originalBody, matchedAdvice, matchedMacros } = context;

    let generatedCode = "";
    let setupCode = "";
    let teardownCode = "";

    // Generate macro implementations first (they wrap the original body)
    const macroWrappedBody = this.generateMacroWrappers(context, originalBody);

    // Generate advice implementations
    const adviceWrappedBody = this.generateAdviceWrappers(
      context,
      macroWrappedBody
    );

    // Generate method signature
    const methodSignature = this.generateMethodSignature(context);

    // Combine all parts
    generatedCode = `${methodSignature} {
${this.indent(adviceWrappedBody, 2)}
}`;

    return {
      code: generatedCode,
      imports: [], // Zero imports for zero runtime overhead
      globals: Array.from(this.generatedGlobals),
      sourceMap: undefined, // TODO: Implement source map generation
    };
  }

  /**
   * Generate macro wrappers that inline directly into method body
   */
  private generateMacroWrappers(
    context: GenerationContext,
    body: string
  ): string {
    let wrappedBody = body;

    for (const macroName of context.matchedMacros) {
      wrappedBody = this.generateMacroWrapper(macroName, context, wrappedBody);
    }

    return wrappedBody;
  }

  /**
   * Generate a specific macro wrapper
   */
  private generateMacroWrapper(
    macroName: string,
    context: GenerationContext,
    body: string
  ): string {
    switch (macroName.toLowerCase()) {
      case "cache":
      case "memoize":
        return this.generateMemoizeWrapper(context, body);

      case "retry":
        return this.generateRetryWrapper(context, body);

      case "trace":
        return this.generateTraceWrapper(context, body);

      case "validate":
        return this.generateValidateWrapper(context, body);

      default:
        console.warn(`Unknown macro: ${macroName}`);
        return body;
    }
  }

  /**
   * Generate memoization wrapper with inline cache management
   */
  private generateMemoizeWrapper(
    context: GenerationContext,
    body: string
  ): string {
    const methodId = this.generateMethodId(context);
    const cacheVarName = `__memoize_${methodId}_cache`;
    const configVarName = `__memoize_${methodId}_config`;

    // Add global cache declaration
    this.generatedGlobals.add(`const ${cacheVarName} = new Map();`);
    this.generatedGlobals.add(
      `const ${configVarName} = { ttl: 300000, maxSize: 1000 }; // Default config`
    );

    return `
// Generated memoization wrapper
const __cache_key = JSON.stringify([${context.originalParameters.join(", ")}]);

// Check cache
if (${cacheVarName}.has(__cache_key)) {
  const __entry = ${cacheVarName}.get(__cache_key);
  if (Date.now() - __entry.timestamp < ${configVarName}.ttl) {
    return __entry.value;
  }
  ${cacheVarName}.delete(__cache_key);
}

// Execute original method and cache result
const __executeAndCache = ${context.signature.async ? "async " : ""}() => {
${this.indent(body, 2)}
};

const __result = ${context.signature.async ? "await " : ""}__executeAndCache();

// Store in cache
${cacheVarName}.set(__cache_key, {
  value: __result,
  timestamp: Date.now()
});

// Cache size management
if (${cacheVarName}.size > ${configVarName}.maxSize) {
  const __oldest = [...${cacheVarName}.entries()]
    .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
  ${cacheVarName}.delete(__oldest[0]);
}

return __result;`;
  }

  /**
   * Generate retry wrapper with inline retry logic
   */
  private generateRetryWrapper(
    context: GenerationContext,
    body: string
  ): string {
    return `
// Generated retry wrapper  
let __attempt = 0;
const __max_attempts = 3; // Default config
const __base_delay = 100; // Default config

while (__attempt <= __max_attempts) {
  try {
    __attempt++;
    
    // Original method execution
    const __executeOriginal = ${context.signature.async ? "async " : ""}() => {
${this.indent(body, 6)}
    };
    
    return ${context.signature.async ? "await " : ""}__executeOriginal();
    
  } catch (__error) {
    if (__attempt > __max_attempts) {
      throw __error;
    }
    
    // Exponential backoff delay
    const __delay = __base_delay * Math.pow(2, __attempt - 1);
    ${
      context.signature.async
        ? "await new Promise(resolve => setTimeout(resolve, __delay));"
        : "// Sync retry - no delay"
    }
  }
}`;
  }

  /**
   * Generate trace wrapper with inline performance monitoring
   */
  private generateTraceWrapper(
    context: GenerationContext,
    body: string
  ): string {
    const methodName = context.signature.name;

    return `
// Generated trace wrapper
const __trace_start = performance.now();
const __trace_id = Math.random().toString(36).slice(2, 8);

console.log(\`[trace:\${__trace_id}] ${methodName} starting\`);

try {
  // Original method execution
  const __executeWithTrace = ${context.signature.async ? "async " : ""}() => {
${this.indent(body, 4)}
  };
  
  const __result = ${
    context.signature.async ? "await " : ""
  }__executeWithTrace();
  
  const __duration = performance.now() - __trace_start;
  console.log(\`[trace:\${__trace_id}] ${methodName} completed in \${__duration.toFixed(2)}ms\`);
  
  return __result;
  
} catch (__error) {
  const __duration = performance.now() - __trace_start;
  console.log(\`[trace:\${__trace_id}] ${methodName} failed in \${__duration.toFixed(2)}ms\`);
  throw __error;
}`;
  }

  /**
   * Generate validation wrapper with inline validation
   */
  private generateValidateWrapper(
    context: GenerationContext,
    body: string
  ): string {
    return `
// Generated validation wrapper
// TODO: Schema compilation would happen here
const __validate_args = [${context.originalParameters.join(", ")}];

// Simple validation placeholder
if (__validate_args.some(arg => arg === undefined || arg === null)) {
  throw new Error('Validation failed: null or undefined arguments');
}

// Original method execution
const __executeValidated = ${context.signature.async ? "async " : ""}() => {
${this.indent(body, 2)}
};

return ${context.signature.async ? "await " : ""}__executeValidated();`;
  }

  /**
   * Generate advice wrappers (before, after, around)
   */
  private generateAdviceWrappers(
    context: GenerationContext,
    body: string
  ): string {
    let wrappedBody = body;

    // For now, generate generic performance advice
    if (context.matchedAdvice.length > 0) {
      wrappedBody = this.generateGenericAdvice(context, wrappedBody);
    }

    return wrappedBody;
  }

  /**
   * Generate generic advice wrapper
   */
  private generateGenericAdvice(
    context: GenerationContext,
    body: string
  ): string {
    const methodName = context.signature.name;

    return `
// Generated advice wrapper  
const __advice_start = performance.now();
console.log(\`[advice] → ${methodName}(\${[${context.originalParameters.join(
      ", "
    )}].join(', ')})\`);

try {
  // Original method body with macro wrappers
  const __result = ${context.signature.async ? "await " : ""}(() => {
${this.indent(body, 4)}
  })();
  
  const __duration = performance.now() - __advice_start;
  console.log(\`[advice] ← ${methodName} completed in \${__duration.toFixed(2)}ms\`);
  
  return __result;
  
} catch (__error) {
  const __duration = performance.now() - __advice_start;
  console.log(\`[advice] ✗ ${methodName} failed in \${__duration.toFixed(2)}ms\`);
  throw __error;
}`;
  }

  /**
   * Generate method signature
   */
  private generateMethodSignature(context: GenerationContext): string {
    const { signature, originalParameters } = context;

    const asyncKeyword = signature.async ? "async " : "";
    const parameters = originalParameters.join(", ");

    return `${asyncKeyword}${signature.name}(${parameters})`;
  }

  /**
   * Generate a unique method ID for caching
   */
  private generateMethodId(context: GenerationContext): string {
    const className = context.className || "global";
    const methodName = context.signature.name;
    return `${className}_${methodName}`.replace(/[^a-zA-Z0-9]/g, "_");
  }

  /**
   * Indent code by specified number of spaces
   */
  private indent(code: string, spaces: number): string {
    const indentation = " ".repeat(spaces);
    return code
      .split("\n")
      .map((line) => (line.trim() ? indentation + line : line))
      .join("\n");
  }

  /**
   * Generate complete class with transformed methods
   */
  generateClass(
    classMarker: ExtendedClassMarker,
    methods: ExtendedMethodMarker[],
    matches: PointcutMatch[]
  ): GeneratedCode {
    const className = classMarker.className;
    let classCode = `class ${className} {\n`;

    const globals: string[] = [];

    // Generate each method
    for (const method of methods) {
      const match = matches.find((m) => m.marker === method);
      if (match) {
        const context: GenerationContext = {
          signature: match.signature,
          originalBody: "// Original method body would be preserved here",
          originalParameters: [], // Would be parsed from source
          matchedAdvice: match.matchedAdvice,
          matchedMacros: match.matchedMacros,
          className: className,
          sourceFile: "unknown",
        };

        const generated = this.generateMethod(context);
        classCode += this.indent(generated.code, 2) + "\n\n";
        globals.push(...generated.globals);
      }
    }

    classCode += "}";

    return {
      code: classCode,
      imports: [],
      globals: Array.from(new Set(globals)),
    };
  }

  /**
   * Get all generated globals for file output
   */
  getGeneratedGlobals(): string[] {
    return Array.from(this.generatedGlobals);
  }

  /**
   * Clear generated globals (for new file)
   */
  clearGlobals(): void {
    this.generatedGlobals.clear();
  }
}
