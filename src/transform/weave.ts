import MagicString from "magic-string";
import type { TransformArtifact, AdvicePlan } from "./ir";
import { registry } from "../core/registry";
import { timer, codeframe } from "../core/diagnostics";

export interface WeaveResult extends TransformArtifact {}

export const weave = (artifact: TransformArtifact): WeaveResult => {
  if (!artifact.advice.length) {
    return artifact;
  }

  return timer("MD_WEAVE", `Weave advice into ${artifact.file}`, () => {
    let transformedCode = artifact.code;

    for (const plan of artifact.advice) {
      const { signature, adviceIds } = plan;

      // Get the actual advice implementations from registry
      const adviceRecords = adviceIds
        .map((id) => registry.findAdvice(signature).find((a) => a.id === id))
        .filter(
          (advice): advice is NonNullable<typeof advice> => advice != null
        );

      for (const advice of adviceRecords) {
        try {
          // Reconstruct qualified name for weaving
          const qualifiedName = signature.owner
            ? `${signature.owner.name}#${signature.name}`
            : signature.name;

          transformedCode = weaveAdvice(
            transformedCode,
            qualifiedName,
            advice.kind,
            advice.id
          );
        } catch (error) {
          registry.recordDiagnostic({
            code: "MD1007",
            level: "error",
            message: `Failed to weave ${advice.kind} advice into ${
              signature.name
            }: ${error instanceof Error ? error.message : String(error)}`,
            file: artifact.file,
            hint: "Check method signature and ensure advice is compatible with method type",
          });
        }
      }
    }

    return {
      ...artifact,
      code: transformedCode,
    };
  });
};

const weaveAdvice = (
  code: string,
  functionName: string,
  adviceKind: "before" | "after" | "around",
  adviceId: string
): string => {
  switch (adviceKind) {
    case "before":
      return weaveBefore(code, functionName, adviceId);
    case "after":
      return weaveAfter(code, functionName, adviceId);
    case "around":
      return weaveAround(code, functionName, adviceId);
    default:
      return code;
  }
};

const weaveBefore = (
  code: string,
  functionName: string,
  adviceId: string
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    const context = codeframe(code, 0, code.length > 100 ? 100 : code.length);
    throw new Error(
      `Invalid function name format: ${functionName}. Expected format: ClassName#methodName\n\n${context}`
    );
  }

  // Find the method definition
  const methodSignaturePattern = new RegExp(
    `async\\s+${methodName}\\s*\\([^)]*\\)\\s*{`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    const context = codeframe(code, 0, code.length > 200 ? 200 : code.length);
    throw new Error(
      `Could not find method ${methodName} in transpiled code\n\n${context}`
    );
  }

  const startIndex = match.index;
  const signatureEnd = startIndex + match[0].length;

  // Find the matching closing brace
  let braceCount = 1;
  let endIndex = signatureEnd;

  while (endIndex < code.length && braceCount > 0) {
    if (code[endIndex] === "{") {
      braceCount++;
    } else if (code[endIndex] === "}") {
      braceCount--;
    }
    endIndex++;
  }

  if (braceCount > 0) {
    const context = codeframe(
      code,
      startIndex,
      Math.min(startIndex + 300, code.length)
    );
    throw new Error(
      `Could not find matching closing brace for ${methodName}. Method may have syntax errors.\n\n${context}`
    );
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the new method with before advice
  const newMethod = `async ${methodName}(location) {
        // Before advice: ${adviceId}
        console.log('[before] entering ${methodName} with arguments:', JSON.stringify(arguments));
        const __start = performance.now();
        
        // Original method body
        ${originalBody.trim()}
    }`;

  console.debug(`Weaving before advice into ${methodName}`);

  return code.slice(0, startIndex) + newMethod + code.slice(endIndex);
};

const weaveAfter = (
  code: string,
  functionName: string,
  adviceId: string
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    const context = codeframe(code, 0, code.length > 100 ? 100 : code.length);
    throw new Error(
      `Invalid function name format: ${functionName}. Expected format: ClassName#methodName\n\n${context}`
    );
  }

  // Find the method definition
  const methodSignaturePattern = new RegExp(
    `async\\s+${methodName}\\s*\\([^)]*\\)\\s*{`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    const context = codeframe(code, 0, code.length > 200 ? 200 : code.length);
    throw new Error(
      `Could not find method ${methodName} in transpiled code\n\n${context}`
    );
  }

  const startIndex = match.index;
  const signatureEnd = startIndex + match[0].length;

  // Find the matching closing brace
  let braceCount = 1;
  let endIndex = signatureEnd;

  while (endIndex < code.length && braceCount > 0) {
    if (code[endIndex] === "{") {
      braceCount++;
    } else if (code[endIndex] === "}") {
      braceCount--;
    }
    endIndex++;
  }

  if (braceCount > 0) {
    const context = codeframe(
      code,
      startIndex,
      Math.min(startIndex + 300, code.length)
    );
    throw new Error(
      `Could not find matching closing brace for ${methodName}. Method may have syntax errors.\n\n${context}`
    );
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the new method with after advice
  const newMethod = `async ${methodName}(location) {
        // After advice: ${adviceId}
        const __start = performance.now();
        let __result;
        let __error;
        
        try {
            // Original method body
            __result = (async () => {
                ${originalBody.trim()}
            })();
            
            if (__result instanceof Promise) {
                __result = await __result;
            }
        } catch (error) {
            __error = error;
        }
        
        // After advice execution
        const __duration = performance.now() - __start;
        console.log('[after] ${methodName} completed in ' + __duration.toFixed(2) + 'ms');
        
        if (__error) {
            console.error('[after] ${methodName} failed with error:', __error);
            throw __error;
        }
        
        console.log('[after] ${methodName} returned:', JSON.stringify(__result));
        return __result;
    }`;

  console.debug(`Weaving after advice into ${methodName}`);

  return code.slice(0, startIndex) + newMethod + code.slice(endIndex);
};

const weaveAround = (
  code: string,
  functionName: string,
  adviceId: string
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    const context = codeframe(code, 0, code.length > 100 ? 100 : code.length);
    throw new Error(
      `Invalid function name format: ${functionName}. Expected format: ClassName#methodName\n\n${context}`
    );
  }

  // Find the method definition and replace it entirely
  const methodSignaturePattern = new RegExp(
    `async\\s+${methodName}\\s*\\([^)]*\\)\\s*{`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    const context = codeframe(code, 0, code.length > 200 ? 200 : code.length);
    throw new Error(
      `Could not find method ${methodName} in transpiled code\n\n${context}`
    );
  }

  const startIndex = match.index;
  const signatureEnd = startIndex + match[0].length;

  // Find the matching closing brace
  let braceCount = 1;
  let endIndex = signatureEnd;

  while (endIndex < code.length && braceCount > 0) {
    if (code[endIndex] === "{") {
      braceCount++;
    } else if (code[endIndex] === "}") {
      braceCount--;
    }
    endIndex++;
  }

  if (braceCount > 0) {
    const context = codeframe(
      code,
      startIndex,
      Math.min(startIndex + 300, code.length)
    );
    throw new Error(
      `Could not find matching closing brace for ${methodName}. Method may have syntax errors.\n\n${context}`
    );
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the new method with advice
  const newMethod = `async ${methodName}(location) {
        // Around advice: ${adviceId}
        const __start = performance.now();
        console.log('[advice] entering ${methodName}');
        
        const __originalMethod = async () => {${originalBody}
        };
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] ${methodName} took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] ${methodName} failed:', error);
            throw error;
        }
    }`;

  console.debug(`Weaving around advice into ${methodName}`);

  return code.slice(0, startIndex) + newMethod + code.slice(endIndex);
};
