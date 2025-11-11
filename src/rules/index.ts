import type { Rule } from "eslint";

import { registry } from "../core/registry";
import type { ImportGraph, RuleResult } from "../core/types";
import { createGraph } from "./imports-graph";

export const runRules = (graph: ImportGraph = createGraph()): RuleResult[] => {
  const results: RuleResult[] = [];
  for (const [code, impl] of registry.getRules()) {
    impl({
      graph,
      fail(message, file) {
        const result: RuleResult = { code, message, file };
        results.push(result);
        return result;
      },
    });
  }
  return results;
};

const trackMetadramaBindings = (context: Rule.RuleContext) => {
  const bindings = new Map<string, string>();
  return {
    inspectImport(node: any) {
      if (node.source?.value !== "@fajarnugraha37/metadrama") {
        return;
      }
      for (const specifier of node.specifiers ?? []) {
        if (specifier.imported && specifier.local) {
          bindings.set(
            specifier.local.name,
            specifier.imported.name ?? specifier.local.name
          );
        }
      }
    },
    hasLocal(name: string, imported?: string) {
      if (!bindings.has(name)) {
        return false;
      }
      if (!imported) {
        return true;
      }
      return bindings.get(name) === imported;
    },
  };
};

const noDeadAdvice: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure advice helpers are invoked with implementations.",
    },
    messages: {
      missingImpl:
        "Calling {{name}} without invoking the returned function leaves advice inactive.",
    },
  },
  create(context) {
    const tracker = trackMetadramaBindings(context);
    return {
      ImportDeclaration(node) {
        tracker.inspectImport(node);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier") {
          return;
        }
        if (
          !tracker.hasLocal(node.callee.name) ||
          !["before", "after", "around"].includes(node.callee.name)
        ) {
          return;
        }
        if (node.parent?.type !== "CallExpression") {
          context.report({
            node,
            messageId: "missingImpl",
            data: { name: node.callee.name },
          });
        }
      },
    };
  },
};

const validPointcut: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Pointcuts should receive a non-empty matcher." },
    messages: {
      emptyMatcher: "Pointcut matcher must not be empty.",
    },
  },
  create(context) {
    const tracker = trackMetadramaBindings(context);
    return {
      ImportDeclaration(node) {
        tracker.inspectImport(node);
      },
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") {
          return;
        }
        const property = node.callee.property;
        if (
          property.type !== "Identifier" ||
          !["name", "withDecorator"].includes(property.name)
        ) {
          return;
        }
        const identifier = node.callee.object;
        if (
          identifier.type !== "Identifier" ||
          !tracker.hasLocal(identifier.name, "pointcut")
        ) {
          return;
        }
        const arg = node.arguments[0];
        if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") {
          return;
        }
        if (arg.value.trim() === "") {
          context.report({ node: arg, messageId: "emptyMatcher" });
        }
      },
    };
  },
};

const noBannedImports: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent disallowed import patterns to protect architecture boundaries.",
    },
    schema: [
      {
        type: "object",
        properties: {
          patterns: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    ],
    messages: {
      banned: 'Import "{{source}}" matches banned pattern {{pattern}}.',
    },
  },
  create(context) {
    const patterns = (context.options?.[0]?.patterns as string[]) ?? [];
    const matchers = patterns.map((pattern) => new RegExp(pattern));
    return {
      ImportDeclaration(node) {
        const source = node.source.value as string;
        for (const matcher of matchers) {
          if (matcher.test(source)) {
            context.report({
              node: node.source,
              messageId: "banned",
              data: { source, pattern: matcher.source },
            });
            break;
          }
        }
      },
    };
  },
};

export const eslintPlugin = {
  rules: {
    "no-dead-advice": noDeadAdvice,
    "valid-pointcut": validPointcut,
    "no-banned-imports": noBannedImports,
  },
};

export { createGraph } from "./imports-graph";
