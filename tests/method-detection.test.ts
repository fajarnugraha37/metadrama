import { describe, it, expect } from "vitest";

describe("Method Detection Debug", () => {
  it("should find all methods in class", () => {
    const source = `
function Service() {
  return (target) => target;
}

@Service()
class InventoryService {
  async getStock(location) {
    return { location, quantity: 5 };
  }
  
  async updateStock(location, quantity) {
    return { success: true };
  }
}`;

    // Test the same regex pattern we use in the SWC transform
    const classWithDecoratorPattern = /@(\w+)\(\)\s*class\s+(\w+)/g;
    let classMatches: RegExpExecArray | null;

    while ((classMatches = classWithDecoratorPattern.exec(source)) !== null) {
      const decoratorName = classMatches[1]!;
      const className = classMatches[2]!;

      console.log(
        `Found decorated class: @${decoratorName} class ${className}`
      );

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
      console.log("Class body:", classBody);

      const methodPattern = /(async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
      let methodMatches: RegExpExecArray | null;

      const foundMethods: string[] = [];

      while ((methodMatches = methodPattern.exec(classBody)) !== null) {
        const methodName = methodMatches[2]!;
        const isAsync = !!methodMatches[1];

        // Skip constructor and common non-method patterns
        if (methodName === "constructor" || methodName === "class") continue;

        foundMethods.push(`${methodName}${isAsync ? " (async)" : ""}`);
        console.log(
          `Found method: ${className}#${methodName} (async: ${isAsync})`
        );
      }

      expect(foundMethods).toContain("getStock (async)");
      expect(foundMethods).toContain("updateStock (async)");
    }
  });
});
