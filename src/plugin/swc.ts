import fs from "node:fs/promises";

import { transform } from "@swc/core";

import { registry } from "../core/registry";
import { timer } from "../core/diagnostics";
import type { TransformArtifact, AdvicePlan, MacroPlan } from "../transform/ir";
import { createSignature } from "../transform/selectors";
import { expandMacros } from "../transform/expand-macro";
import { weave } from "../transform/weave";

export interface SwcTransformResult {
  code: string;
  source: string;
  map?: string;
  diagnostics: ReturnType<typeof registry.getDiagnostics>;
}

export const transformWithSwc = async (
  source: string,
  file: string
): Promise<SwcTransformResult> => {
  // Better approach: look for class declarations with decorators and their methods
  const advicePlans: AdvicePlan[] = [];
  const macroPlans: MacroPlan[] = [];

  // Find classes with decorators
  const classWithDecoratorPattern = /@(\w+)\s*\(\)\s*\n\s*class\s+(\w+)/g;
  let classMatches: RegExpExecArray | null;

  while ((classMatches = classWithDecoratorPattern.exec(source)) !== null) {
    const decoratorName = classMatches[1]!;
    const className = classMatches[2]!;

    console.debug(
      `Found decorated class: @${decoratorName} class ${className}`
    );

    // Find methods in this class
    const classStartIndex = classMatches.index;
    const classEndPattern = new RegExp(`class\\s+${className}[^}]*}`, "s");
    const classMatch = source.slice(classStartIndex).match(classEndPattern);

    if (classMatch) {
      const classBody = classMatch[0];
      const methodPattern = /(async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
      let methodMatches: RegExpExecArray | null;

      while ((methodMatches = methodPattern.exec(classBody)) !== null) {
        const methodName = methodMatches[2]!;
        const isAsync = !!methodMatches[1];

        // Skip constructor and common non-method patterns
        if (methodName === "constructor" || methodName === "class") continue;

        console.debug(
          `Found method: ${className}#${methodName} (async: ${isAsync})`
        );

        const signature = createSignature(
          "method",
          `${className}#${methodName}`,
          file,
          [], // method decorators - could be enhanced
          {
            async: isAsync,
            parameters: [],
            owner: {
              name: className,
              decorators: [decoratorName],
            },
          }
        );

        // Find matching advice
        const matchingAdvice = registry.findAdvice(signature);
        if (matchingAdvice.length > 0) {
          console.debug(
            `Found matching advice for ${signature.name}:`,
            matchingAdvice.map((a) => a.id)
          );
          advicePlans.push({
            signature,
            adviceIds: matchingAdvice.map((a) => a.id),
          });
        }

        // Find matching macros
        const matchingMacros = registry.findMacros(signature);
        if (matchingMacros.length > 0) {
          console.debug(
            `Found matching macros for ${signature.name}:`,
            matchingMacros.map((m) => m.name)
          );
          macroPlans.push({
            signature,
            macroNames: matchingMacros.map((m) => m.name),
          });
        }
      }
    }
  }

  // Do the base TypeScript to JavaScript transformation
  const swcResult = await transform(source, {
    filename: file,
    sourceMaps: true,
    jsc: {
      parser: {
        syntax: "typescript",
        decorators: true,
        tsx: file.endsWith(".tsx"),
      },
      target: "es2022",
    },
    module: {
      type: "es6",
    },
  });

  const artifact: TransformArtifact = {
    file,
    source,
    code: swcResult.code,
    map: swcResult.map ?? undefined,
    advice: advicePlans,
    macros: macroPlans,
  };

  const expanded = expandMacros(artifact);
  const woven = weave(expanded);

  return {
    code: woven.code,
    source,
    map: woven.map,
    diagnostics: registry.getDiagnostics(),
  };
};

export const transformFile = async (
  file: string
): Promise<SwcTransformResult> => {
  const source = await fs.readFile(file, "utf8");
  return transformWithSwc(source, file);
};
