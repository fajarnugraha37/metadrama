import type { Signature, Pointcut } from "../core/types";
import type {
  ExtendedClassMarker,
  ExtendedMethodMarker,
  ExtendedFunctionMarker,
} from "./marker-parser";

/**
 * Compile-time pointcut resolution system
 *
 * This replaces runtime pointcut evaluation with build-time matching
 * to achieve zero runtime overhead in MetaDrama v0.2.0+
 */

export interface PointcutMatch {
  signature: Signature;
  matchedAdvice: string[];
  matchedMacros: string[];
  marker: ExtendedClassMarker | ExtendedMethodMarker | ExtendedFunctionMarker;
}

export interface PointcutResolutionResult {
  matches: PointcutMatch[];
  diagnostics: {
    unmatchedAdvice: string[];
    unmatchedMacros: string[];
    warnings: string[];
  };
}

/**
 * Compile-time pointcut resolver
 */
export class PointcutResolver {
  private registeredAdvice: Map<
    string,
    { pointcut: Pointcut<any>; id: string }
  > = new Map();
  private registeredMacros: Map<
    string,
    { pointcut: Pointcut<any>; name: string }
  > = new Map();

  /**
   * Register advice with pointcuts for build-time resolution
   */
  registerAdvice(id: string, pointcut: Pointcut<any>): void {
    this.registeredAdvice.set(id, { pointcut, id });
  }

  /**
   * Register macro with pointcuts for build-time resolution
   */
  registerMacro(name: string, pointcut: Pointcut<any>): void {
    this.registeredMacros.set(name, { pointcut, name });
  }

  /**
   * Resolve all pointcuts at build time
   */
  resolve(
    classes: ExtendedClassMarker[],
    methods: ExtendedMethodMarker[],
    functions: ExtendedFunctionMarker[]
  ): PointcutResolutionResult {
    const matches: PointcutMatch[] = [];
    const unmatchedAdvice = new Set(this.registeredAdvice.keys());
    const unmatchedMacros = new Set(this.registeredMacros.keys());
    const warnings: string[] = [];

    // Process class methods
    for (const classMarker of classes) {
      const classMethods = methods.filter((method) =>
        this.isMethodInClass(method, classMarker)
      );

      for (const methodMarker of classMethods) {
        const signature = this.createMethodSignature(methodMarker, classMarker);
        const match = this.matchPointcuts(signature, methodMarker);

        if (match.matchedAdvice.length > 0 || match.matchedMacros.length > 0) {
          matches.push(match);

          // Remove from unmatched sets
          match.matchedAdvice.forEach((id) => unmatchedAdvice.delete(id));
          match.matchedMacros.forEach((name) => unmatchedMacros.delete(name));
        }
      }
    }

    // Process standalone functions
    for (const functionMarker of functions) {
      const signature = this.createFunctionSignature(functionMarker);
      const match = this.matchPointcuts(signature, functionMarker);

      if (match.matchedAdvice.length > 0 || match.matchedMacros.length > 0) {
        matches.push(match);

        // Remove from unmatched sets
        match.matchedAdvice.forEach((id) => unmatchedAdvice.delete(id));
        match.matchedMacros.forEach((name) => unmatchedMacros.delete(name));
      }
    }

    // Process orphaned methods (methods without class markers)
    const orphanMethods = methods.filter(
      (method) => !classes.some((cls) => this.isMethodInClass(method, cls))
    );

    for (const methodMarker of orphanMethods) {
      // Create a signature without class context
      const signature = this.createOrphanMethodSignature(methodMarker);
      const match = this.matchPointcuts(signature, methodMarker);

      if (match.matchedAdvice.length > 0 || match.matchedMacros.length > 0) {
        matches.push(match);

        // Remove from unmatched sets
        match.matchedAdvice.forEach((id) => unmatchedAdvice.delete(id));
        match.matchedMacros.forEach((name) => unmatchedMacros.delete(name));
      }
    }

    return {
      matches,
      diagnostics: {
        unmatchedAdvice: Array.from(unmatchedAdvice),
        unmatchedMacros: Array.from(unmatchedMacros),
        warnings,
      },
    };
  }

  /**
   * Check if a method belongs to a class
   */
  private isMethodInClass(
    method: ExtendedMethodMarker,
    classMarker: ExtendedClassMarker
  ): boolean {
    // Method must be after class declaration
    return method.methodStart > classMarker.classStart;
  }

  /**
   * Create signature for a method within a class
   */
  private createMethodSignature(
    method: ExtendedMethodMarker,
    classMarker: ExtendedClassMarker
  ): Signature {
    return {
      kind: "method",
      name: method.methodName,
      decorators: [], // Markers don't use decorators
      file: "unknown", // Will be set by caller
      async: method.isAsync,
      generator: false,
      parameters: [], // Could be enhanced to parse actual parameters
      owner: {
        name: classMarker.className,
        decorators: classMarker.aspects,
      },
    };
  }

  /**
   * Create signature for a standalone function
   */
  private createFunctionSignature(func: ExtendedFunctionMarker): Signature {
    return {
      kind: "function",
      name: func.functionName,
      decorators: [], // Markers don't use decorators
      file: "unknown", // Will be set by caller
      async: func.isAsync,
      generator: false,
      parameters: [], // Could be enhanced to parse actual parameters
    };
  }

  /**
   * Create signature for an orphaned method (no class context)
   */
  private createOrphanMethodSignature(method: ExtendedMethodMarker): Signature {
    return {
      kind: "method",
      name: method.methodName,
      decorators: [],
      file: "unknown",
      async: method.isAsync,
      generator: false,
      parameters: [],
      // No owner for orphaned methods
    };
  }

  /**
   * Match pointcuts against a signature
   */
  private matchPointcuts(
    signature: Signature,
    marker: ExtendedClassMarker | ExtendedMethodMarker | ExtendedFunctionMarker
  ): PointcutMatch {
    const matchedAdvice: string[] = [];
    const matchedMacros: string[] = [];

    // Test against registered advice pointcuts
    for (const [id, { pointcut }] of this.registeredAdvice) {
      if (pointcut.test(signature)) {
        matchedAdvice.push(id);
      }
    }

    // Test against registered macro pointcuts
    for (const [name, { pointcut }] of this.registeredMacros) {
      if (pointcut.test(signature)) {
        matchedMacros.push(name);
      }
    }

    return {
      signature,
      matchedAdvice,
      matchedMacros,
      marker,
    };
  }

  /**
   * Create a signature resolver that can be used by the code generator
   */
  createSignatureResolver() {
    return {
      resolveMethodSignature: (
        method: ExtendedMethodMarker,
        classMarker?: ExtendedClassMarker
      ) => {
        if (classMarker) {
          return this.createMethodSignature(method, classMarker);
        } else {
          return this.createOrphanMethodSignature(method);
        }
      },

      resolveFunctionSignature: (func: ExtendedFunctionMarker) => {
        return this.createFunctionSignature(func);
      },
    };
  }

  /**
   * Get statistics about registered pointcuts
   */
  getStatistics() {
    return {
      totalAdvice: this.registeredAdvice.size,
      totalMacros: this.registeredMacros.size,
      adviceIds: Array.from(this.registeredAdvice.keys()),
      macroNames: Array.from(this.registeredMacros.keys()),
    };
  }

  /**
   * Clear all registered pointcuts (for testing)
   */
  clear(): void {
    this.registeredAdvice.clear();
    this.registeredMacros.clear();
  }
}

/**
 * Global pointcut resolver instance
 */
export const globalPointcutResolver = new PointcutResolver();
