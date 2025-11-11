import fs from "node:fs/promises";
import path from "node:path";

import { transform, type Module } from "@swc/core";

import { registry } from "../core/registry";
import type { TransformArtifact, AdvicePlan, MacroPlan } from "../transform/ir";
import { createSignature, matchesPointcut } from "../transform/selectors";
import { expandMacros } from "../transform/expand-macro";
import { weave } from "../transform/weave";

export interface SwcTransformResult {
  code: string;
  source: string;
  map?: string;
  diagnostics: ReturnType<typeof registry.getDiagnostics>;
}

interface DecoratorInfo {
  name: string;
  line: number;
  column: number;
}

interface FunctionInfo {
  name: string;
  decorators: DecoratorInfo[];
  line: number;
  column: number;
  async: boolean;
  generator: boolean;
  parameters: string[];
  isMethod: boolean;
  className?: string;
  classDecorators?: DecoratorInfo[];
}

const extractDecorators = (decorators: any[]): DecoratorInfo[] => {
  if (!decorators) return [];

  return decorators
    .map((dec: any) => {
      if (dec.expression?.type === "Identifier") {
        return {
          name: dec.expression.value,
          line: dec.span?.start?.line ?? 0,
          column: dec.span?.start?.column ?? 0,
        };
      }
      if (
        dec.expression?.type === "CallExpression" &&
        dec.expression.callee?.type === "Identifier"
      ) {
        return {
          name: dec.expression.callee.value,
          line: dec.span?.start?.line ?? 0,
          column: dec.span?.start?.column ?? 0,
        };
      }
      return null;
    })
    .filter(Boolean) as DecoratorInfo[];
};

const extractFunctions = (ast: Module, file: string): FunctionInfo[] => {
  const functions: FunctionInfo[] = [];
  const classes = new Map<string, DecoratorInfo[]>();

  const visitNode = (node: any, currentClass?: string): void => {
    if (!node) return;

    // Handle class declarations
    if (node.type === "ClassDeclaration" && node.identifier) {
      const className = node.identifier.value;
      const decorators = extractDecorators(node.decorators);
      classes.set(className, decorators);

      // Visit class members
      if (node.body) {
        for (const member of node.body) {
          visitNode(member, className);
        }
      }
    }

    // Handle method definitions
    else if (node.type === "MethodDefinition" && currentClass) {
      if (node.key?.type === "Identifier") {
        const decorators = extractDecorators(node.decorators);
        const classDecorators = classes.get(currentClass);

        functions.push({
          name: `${currentClass}#${node.key.value}`,
          decorators,
          line: node.span?.start?.line ?? 0,
          column: node.span?.start?.column ?? 0,
          async: node.function?.async ?? false,
          generator: node.function?.generator ?? false,
          parameters:
            node.function?.params?.map((p: any) =>
              p.pat?.type === "Identifier" ? p.pat.value : "unknown"
            ) ?? [],
          isMethod: true,
          className: currentClass,
          classDecorators,
        });
      }
    }

    // Handle function declarations
    else if (node.type === "FunctionDeclaration" && node.identifier) {
      const decorators = extractDecorators(node.decorators);

      functions.push({
        name: node.identifier.value,
        decorators,
        line: node.span?.start?.line ?? 0,
        column: node.span?.start?.column ?? 0,
        async: node.async ?? false,
        generator: node.generator ?? false,
        parameters:
          node.params?.map((p: any) =>
            p.pat?.type === "Identifier" ? p.pat.value : "unknown"
          ) ?? [],
        isMethod: false,
      });
    }

    // Recursively visit child nodes
    if (typeof node === "object") {
      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((item) => visitNode(item, currentClass));
        } else if (child && typeof child === "object") {
          visitNode(child, currentClass);
        }
      }
    }
  };

  // Visit the AST
  if (ast.body) {
    ast.body.forEach((node) => visitNode(node));
  }

  return functions;
};

export const transformWithSwc = async (
  source: string,
  file: string
): Promise<SwcTransformResult> => {
  // First, parse the file to extract AST for analysis
  const parseResult = await transform(source, {
    filename: file,
    sourceMaps: false,
    jsc: {
      parser: {
        syntax: "typescript",
        decorators: true,
        tsx: file.endsWith(".tsx"),
      },
      target: "es2022",
      transform: {},
    },
    module: {
      type: "es6",
    },
    swcrc: false,
    isModule: true,
  });

  // Parse AST to extract function/method information
  const ast = JSON.parse(parseResult.code.replace(/^[^{]*/, "")) as Module;
  const functions = extractFunctions(ast, file);

  // Check if file has @meta pragma
  const hasMetaPragma = /\/\*\*\s*@meta\s*\*\//.test(source);

  // Create advice and macro plans by matching against registry
  const advicePlans: AdvicePlan[] = [];
  const macroPlans: MacroPlan[] = [];

  for (const func of functions) {
    // Create signature for this function/method
    const signature = createSignature(
      func.isMethod ? "method" : "function",
      func.name,
      file,
      func.decorators.map((d) => d.name),
      {
        async: func.async,
        generator: func.generator,
        parameters: func.parameters,
        owner: func.className
          ? {
              name: func.className,
              decorators: func.classDecorators?.map((d) => d.name) ?? [],
            }
          : undefined,
      }
    );

    // Find matching advice
    const matchingAdvice = registry.findAdvice(signature);
    if (matchingAdvice.length > 0) {
      advicePlans.push({
        signature,
        adviceIds: matchingAdvice.map((a) => a.id),
      });
    }

    // Find matching macros
    const matchingMacros = registry.findMacros(signature);
    if (matchingMacros.length > 0) {
      macroPlans.push({
        signature,
        macroNames: matchingMacros.map((m) => m.name),
      });
    }
  }

  // Now do the actual transformation
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
