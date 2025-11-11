import ts from "typescript";
import { registry } from "../core/registry";
import { createSignature } from "../transform/selectors";
import { expandMacros } from "../transform/expand-macro";
import { weave } from "../transform/weave";
import type { TransformArtifact, AdvicePlan, MacroPlan } from "../transform/ir";
import { timer } from "../core/diagnostics";

export const createTsPatchTransformer =
  (): ts.TransformerFactory<ts.SourceFile> => {
    return (context) => {
      return (sourceFile): ts.SourceFile => {
        return timer("MD_TSPATCH", `Transform ${sourceFile.fileName}`, () => {
          const advicePlans: AdvicePlan[] = [];
          const macroPlans: MacroPlan[] = [];

          // Visit each node to find decorated classes and their methods
          const visitor = (node: ts.Node): ts.Node => {
            if (ts.isClassDeclaration(node) && node.name) {
              const className = node.name.text;
              const decorators: string[] = [];

              // Extract decorators from modifiers (TypeScript 5.x)
              if (node.modifiers) {
                for (const modifier of node.modifiers) {
                  if (ts.isDecorator(modifier)) {
                    let decoratorName: string | undefined;

                    if (ts.isCallExpression(modifier.expression)) {
                      if (ts.isIdentifier(modifier.expression.expression)) {
                        decoratorName = modifier.expression.expression.text;
                      }
                    } else if (ts.isIdentifier(modifier.expression)) {
                      decoratorName = modifier.expression.text;
                    }

                    if (decoratorName) {
                      decorators.push(decoratorName);
                    }
                  }
                }
              }

              if (decorators.length > 0) {
                console.debug(
                  `[TS-PATCH] Found decorated class: @${decorators[0]} class ${className}`
                );

                // Process each method in the class
                for (const member of node.members) {
                  if (
                    ts.isMethodDeclaration(member) &&
                    ts.isIdentifier(member.name)
                  ) {
                    const methodName = member.name.text;

                    // Skip constructor
                    if (methodName === "constructor") continue;

                    const isAsync =
                      member.modifiers?.some(
                        (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
                      ) ?? false;

                    console.debug(
                      `[TS-PATCH] Found method: ${className}#${methodName} (async: ${isAsync})`
                    );

                    // Create signature for pointcut matching
                    const signature = createSignature(
                      "method",
                      methodName,
                      sourceFile.fileName,
                      decorators,
                      {
                        async: isAsync,
                        parameters: member.parameters.map((param) =>
                          ts.isIdentifier(param.name)
                            ? param.name.text
                            : param.name.getText()
                        ),
                        owner: {
                          name: className,
                          decorators,
                        },
                      }
                    );

                    // Find matching advice
                    const matchingAdvice = registry.findAdvice(signature);
                    if (matchingAdvice.length > 0) {
                      console.debug(
                        `[TS-PATCH] Found matching advice for ${signature.name}:`,
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
                        `[TS-PATCH] Found matching macros for ${signature.name}:`,
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
            }

            return ts.visitEachChild(node, visitor, context);
          };

          // Visit the source file to collect transformation plans
          const visitedFile = ts.visitNode(
            sourceFile,
            visitor
          ) as ts.SourceFile;

          // If no transformations needed, return the visited file
          if (advicePlans.length === 0 && macroPlans.length === 0) {
            return visitedFile;
          }

          // Apply transformations through our pipeline
          const printer = ts.createPrinter({
            newLine: ts.NewLineKind.LineFeed,
            removeComments: false,
            omitTrailingSemicolon: false,
          });

          const originalCode = printer.printFile(visitedFile);

          const artifact: TransformArtifact = {
            file: sourceFile.fileName,
            source: originalCode,
            code: originalCode,
            map: undefined,
            advice: advicePlans,
            macros: macroPlans,
          };

          // Apply macro expansion first
          const expanded = expandMacros(artifact);

          // Then apply advice weaving
          const woven = weave(expanded);

          // Parse the transformed code back into TypeScript AST
          try {
            const transformedSourceFile = ts.createSourceFile(
              sourceFile.fileName,
              woven.code,
              sourceFile.languageVersion,
              true,
              ts.ScriptKind.TS
            );

            console.debug(
              `[TS-PATCH] Successfully transformed ${sourceFile.fileName}`
            );
            return transformedSourceFile;
          } catch (error) {
            // If parsing fails, log error and return original
            console.error(
              `[TS-PATCH] Failed to parse transformed code:`,
              error
            );
            registry.recordDiagnostic({
              code: "MD1008",
              level: "error",
              message: `TypeScript transformer failed to parse transformed code: ${
                error instanceof Error ? error.message : String(error)
              }`,
              file: sourceFile.fileName,
              hint: "Check that macro and advice transformations generate valid TypeScript syntax",
            });

            return visitedFile;
          }
        });
      };
    };
  };

export const registerTsPatch = () => {
  console.log("[TS-PATCH] Metadrama TypeScript transformer registered");
  return createTsPatchTransformer;
};
