import MagicString from "magic-string";
import type { TransformArtifact, AdvicePlan } from "./ir";
import { registry } from "../core/registry";

export interface WeaveResult extends TransformArtifact {}

export const weave = (artifact: TransformArtifact): WeaveResult => {
  if (!artifact.advice.length) {
    return artifact;
  }

  const magic = new MagicString(artifact.source);
  let transformedCode = artifact.code;

  for (const plan of artifact.advice) {
    const { signature, adviceIds } = plan;

    // Get the actual advice implementations from registry
    const adviceRecords = adviceIds
      .map((id) => registry.findAdvice(signature).find((a) => a.id === id))
      .filter((advice): advice is NonNullable<typeof advice> => advice != null);

    for (const advice of adviceRecords) {
      transformedCode = weaveAdvice(
        transformedCode,
        signature.name,
        advice.kind,
        advice.id
      );
    }
  }

  return {
    ...artifact,
    code: transformedCode,
    map: magic.generateMap().toString(),
  };
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
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  return code.replace(
    funcPattern,
    `$1
    // Before advice: ${adviceId}
    const __beforeCtx = {
      targetName: '${functionName}',
      thisArg: this,
      args: Array.from(arguments),
      metadata: {}
    };
    // Execute before advice here
    `
  );
};

const weaveAfter = (
  code: string,
  functionName: string,
  adviceId: string
): string => {
  // This is more complex as we need to wrap the return statements
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*{)([^}]*)(})`,
    "s"
  );

  return code.replace(funcPattern, (match, start, body, end) => {
    const wrappedBody = body.replace(
      /return\s+([^;]+);?/g,
      `
      const __result = $1;
      const __afterCtx = {
        targetName: '${functionName}',
        thisArg: this,
        args: Array.from(arguments),
        result: __result,
        metadata: {}
      };
      // Execute after advice here
      return __result;`
    );

    return start + wrappedBody + end;
  });
};

const weaveAround = (
  code: string,
  functionName: string,
  adviceId: string
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    console.warn(`Cannot parse method name from: ${functionName}`);
    return code;
  }

  // Look for the method definition in the transpiled JavaScript
  // Pattern: async methodName(params) {
  const methodPattern = new RegExp(
    `(async\\s+${methodName}\\s*\\([^)]*\\)\\s*{)([\\s\\S]*?)^(\\s*})`,
    "gm"
  );

  const match = code.match(methodPattern);
  if (!match) {
    console.warn(`Could not find method ${methodName} in transpiled code`);
    return code;
  }

  console.debug(`Weaving around advice into ${methodName}`);

  return code.replace(methodPattern, (match, start, body, end) => {
    return `${start}
        // Around advice: ${adviceId}
        const __start = performance.now();
        console.log('[advice] entering ${methodName}');
        
        const __originalMethod = (async function() {
            ${body.trim()}
        }).bind(this);
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] ${methodName} took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] ${methodName} failed:', error);
            throw error;
        }
    ${end}`;
  });
};
