// Test file to check syntax
export function testFunction() {
  const classWithDecoratorPattern = /@(\w+)\s*\(\)\s*\n\s*class\s+(\w+)/g;
  let classMatches: RegExpExecArray | null;
  const source = "test";

  while ((classMatches = classWithDecoratorPattern.exec(source)) !== null) {
    const decoratorName = classMatches[1]!;
    const className = classMatches[2]!;

    // Find methods in this class
    const classStartIndex = classMatches.index;

    // Find the start of the class body (opening brace)
    const classBodyStart = source.indexOf("{", classStartIndex);
    if (classBodyStart === -1) continue;

    // Find the matching closing brace by counting braces
    let braceCount = 1;
    let i = classBodyStart + 1;
    while (i < source.length && braceCount > 0) {
      if (source[i] === "{") {
        braceCount++;
      } else if (source[i] === "}") {
        braceCount--;
      }
      i++;
    }

    if (braceCount > 0) continue; // Unmatched braces

    const classBody = source.slice(classBodyStart, i);

    const methodPattern = /(async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
    let methodMatches: RegExpExecArray | null;

    while ((methodMatches = methodPattern.exec(classBody)) !== null) {
      const methodName = methodMatches[2]!;
      const isAsync = !!methodMatches[1];

      // Skip constructor and common non-method patterns
      if (methodName === "constructor" || methodName === "class") continue;
    }
  }

  return "done";
}
