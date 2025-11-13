import type {
  MarkerType,
  ParsedMarker,
  ClassMarker,
  MethodMarker,
  FunctionMarker,
  MacroConfig,
} from "./marker-syntax";

/**
 * Parses MetaDrama markers from TypeScript source code
 *
 * This replaces the decorator-based detection system with compile-time
 * JSDoc comment parsing to achieve zero runtime overhead.
 */
export class MarkerParser {
  private source: string;
  private filename: string;

  constructor(source: string, filename: string) {
    this.source = source;
    this.filename = filename;
  }

  /**
   * Parse all markers from the source code
   */
  public parseAll(): {
    classes: ExtendedClassMarker[];
    methods: ExtendedMethodMarker[];
    functions: ExtendedFunctionMarker[];
  } {
    const classes = this.parseClassMarkers();
    const methods = this.parseMethodMarkers();
    const functions = this.parseFunctionMarkers();

    return { classes, methods, functions };
  }

  /**
   * Parse class-level markers: @metradrama:class AspectName1,AspectName2
   */
  private parseClassMarkers(): ExtendedClassMarker[] {
    const markers: ExtendedClassMarker[] = [];

    // Pattern to match class markers followed by class declaration
    const pattern =
      /\/\*\*\s*\n?\s*@metradrama:class\s+([\w,\s]+)\s*\n?(?:\s*\*[^\n]*\n?)*\s*\*\/\s*\n?\s*(?:export\s+)?class\s+(\w+)/g;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(this.source)) !== null) {
      const [fullMatch, aspectsStr, className] = match;

      if (!aspectsStr || !className) continue;

      const aspects = aspectsStr
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      const position = this.getLineColumn(match.index);

      markers.push({
        type: "class",
        line: position.line,
        column: position.column,
        source: fullMatch,
        aspects,
        className,
        classStart: match.index + fullMatch.length - className.length,
      });
    }

    return markers;
  }

  /**
   * Parse method-level markers: @metradrama:method MacroName(options)
   */
  private parseMethodMarkers(): ExtendedMethodMarker[] {
    const markers: ExtendedMethodMarker[] = [];

    // Pattern to match method markers followed by method declaration
    const pattern =
      /\/\*\*\s*\n?\s*@metradrama:method\s+([\w(),="'\s,]+)\s*\n?(?:\s*\*[^\n]*\n?)*\s*\*\/\s*\n?\s*(?:(async)\s+)?(\w+)\s*\(/g;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(this.source)) !== null) {
      const [fullMatch, macrosStr, asyncKeyword, methodName] = match;

      if (!macrosStr || !methodName) continue;

      const macros = this.parseMacroConfigs(macrosStr);
      const position = this.getLineColumn(match.index);

      markers.push({
        type: "method",
        line: position.line,
        column: position.column,
        source: fullMatch,
        macros,
        methodName,
        isAsync: !!asyncKeyword,
        methodStart: match.index + fullMatch.length - methodName.length - 1,
      });
    }

    return markers;
  }

  /**
   * Parse function-level markers: @metradrama:function MacroName(options)
   */
  private parseFunctionMarkers(): ExtendedFunctionMarker[] {
    const markers: ExtendedFunctionMarker[] = [];

    // Pattern to match function markers followed by function declaration
    const pattern =
      /\/\*\*\s*\n?\s*@metradrama:function\s+([\w(),="'\s,]+)\s*\n?(?:\s*\*[^\n]*\n?)*\s*\*\/\s*\n?\s*(?:export\s+)?(?:(async)\s+)?function\s+(\w+)\s*\(/g;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(this.source)) !== null) {
      const [fullMatch, macrosStr, asyncKeyword, functionName] = match;

      if (!macrosStr || !functionName) continue;

      const macros = this.parseMacroConfigs(macrosStr);
      const position = this.getLineColumn(match.index);

      markers.push({
        type: "function",
        line: position.line,
        column: position.column,
        source: fullMatch,
        macros,
        functionName,
        isAsync: !!asyncKeyword,
        functionStart: match.index + fullMatch.length - functionName.length - 1,
      });
    }

    return markers;
  }

  /**
   * Parse macro configurations from string like "Cache(ttl=300,key="user"),Retry(max=3)"
   */
  private parseMacroConfigs(macrosStr: string): MacroConfig[] {
    const configs: MacroConfig[] = [];

    // Split by commas not inside parentheses
    const macroTokens = this.splitMacroTokens(macrosStr);

    for (const token of macroTokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      const config = this.parseSingleMacroConfig(trimmed);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Split macro tokens respecting parentheses nesting
   */
  private splitMacroTokens(str: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "(") {
        parenDepth++;
        current += char;
      } else if (char === ")") {
        parenDepth--;
        current += char;
      } else if (char === "," && parenDepth === 0) {
        tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse a single macro config like "Cache(ttl=300,key="user")"
   */
  private parseSingleMacroConfig(token: string): MacroConfig | null {
    const match = token.match(/^(\w+)(?:\(([^)]*)\))?$/);

    if (!match) {
      console.warn(`Invalid macro syntax: ${token}`);
      return null;
    }

    const [, name, optionsStr] = match;

    if (!name) {
      console.warn(`No macro name found in: ${token}`);
      return null;
    }

    const options: Record<string, any> = {};

    if (optionsStr) {
      const optionPairs = this.parseOptions(optionsStr);
      for (const [key, value] of optionPairs) {
        options[key] = value;
      }
    }

    return { name, options };
  }

  /**
   * Parse option pairs like "ttl=300,key="user",max=3"
   */
  private parseOptions(optionsStr: string): Array<[string, any]> {
    const pairs: Array<[string, any]> = [];

    // Split by commas not inside quotes
    const optionTokens = this.splitOptionTokens(optionsStr);

    for (const token of optionTokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      const [key, valueStr] = trimmed.split("=", 2);
      if (!key || valueStr === undefined) {
        console.warn(`Invalid option syntax: ${trimmed}`);
        continue;
      }

      const value = this.parseOptionValue(valueStr.trim());
      pairs.push([key.trim(), value]);
    }

    return pairs;
  }

  /**
   * Split option tokens respecting quote nesting
   */
  private splitOptionTokens(str: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (char === "," && !inQuotes) {
        tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse option value (string, number, boolean)
   */
  private parseOptionValue(valueStr: string): any {
    // String values
    if (
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))
    ) {
      return valueStr.slice(1, -1);
    }

    // Boolean values
    if (valueStr === "true") return true;
    if (valueStr === "false") return false;

    // Number values
    const numValue = Number(valueStr);
    if (!isNaN(numValue)) return numValue;

    // Default to string for complex expressions
    return valueStr;
  }

  /**
   * Get line and column position from character index
   */
  private getLineColumn(index: number): { line: number; column: number } {
    const lines = this.source.slice(0, index).split("\n");
    return {
      line: lines.length,
      column: lines[lines.length - 1]?.length ?? 0,
    };
  }

  /**
   * Find the class that contains a given method marker
   */
  public findContainingClass(
    methodMarker: MethodMarker & { methodStart: number },
    classMarkers: Array<ClassMarker & { className: string; classStart: number }>
  ): (ClassMarker & { className: string }) | null {
    // Find the class that contains this method (class start < method start)
    const containingClasses = classMarkers
      .filter((cls) => cls.classStart < methodMarker.methodStart)
      .sort((a, b) => b.classStart - a.classStart); // Sort by closest class start

    return containingClasses[0] || null;
  }

  /**
   * Validate marker syntax and return diagnostics
   */
  public validateMarkers(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { classes, methods, functions } = this.parseAll();

    // Validate class markers
    for (const classMarker of classes) {
      if (classMarker.aspects.length === 0) {
        warnings.push(
          `Empty aspects list in class marker at line ${classMarker.line}`
        );
      }
    }

    // Validate method markers
    for (const methodMarker of methods) {
      if (methodMarker.macros.length === 0) {
        warnings.push(
          `Empty macros list in method marker at line ${methodMarker.line}`
        );
      }

      // Check for unknown macro names
      const knownMacros = ["Cache", "Retry", "Trace", "Validate", "Memoize"];
      for (const macro of methodMarker.macros) {
        if (!knownMacros.includes(macro.name)) {
          warnings.push(
            `Unknown macro '${macro.name}' at line ${methodMarker.line}`
          );
        }
      }
    }

    return { errors, warnings };
  }
}

/**
 * Utility function to parse markers from source code
 */
export function parseMarkers(source: string, filename: string = "unknown") {
  const parser = new MarkerParser(source, filename);
  return parser.parseAll();
}

/**
 * Extended marker interfaces with additional parsed information
 */
export interface ExtendedClassMarker extends ClassMarker {
  className: string;
  classStart: number;
}

export interface ExtendedMethodMarker extends MethodMarker {
  methodName: string;
  isAsync: boolean;
  methodStart: number;
}

export interface ExtendedFunctionMarker extends FunctionMarker {
  functionName: string;
  isAsync: boolean;
  functionStart: number;
}
