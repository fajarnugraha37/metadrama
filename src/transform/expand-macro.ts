import MagicString from "magic-string";
import type { MacroPlan, TransformArtifact } from "./ir";

export const expandMacros = (
  artifact: TransformArtifact
): TransformArtifact => {
  if (!artifact.macros.length) {
    return artifact;
  }

  const magic = new MagicString(artifact.source);
  let transformedCode = artifact.code;

  for (const plan of artifact.macros) {
    const { signature, macroNames } = plan;

    for (const macroName of macroNames) {
      transformedCode = expandMacro(
        transformedCode,
        signature.name,
        macroName,
        signature
      );
    }
  }

  return {
    ...artifact,
    code: transformedCode,
    map: magic.generateMap().toString(),
  };
};

const expandMacro = (
  code: string,
  functionName: string,
  macroName: string,
  signature: any
): string => {
  switch (macroName) {
    case "memoize":
      return expandMemoizeMacro(code, functionName, signature);
    case "retry":
      return expandRetryMacro(code, functionName, signature);
    case "trace":
      return expandTraceMacro(code, functionName, signature);
    case "validate":
      return expandValidateMacro(code, functionName, signature);
    default:
      return code;
  }
};

const expandMemoizeMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  // For now, add a simple memoization wrapper
  const memoSymbol = `__memo_${functionName.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Find the function declaration and wrap it
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${
      functionName.split("#")[1] || functionName
    }\\s*\\([^)]*\\)\\s*{[^}]*})`,
    "g"
  );

  return code.replace(funcPattern, (match) => {
    return `
const ${memoSymbol} = new Map();
${match.replace(
  /^((?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{)/,
  `$1
  const cacheKey = JSON.stringify(arguments);
  if (${memoSymbol}.has(cacheKey)) {
    return ${memoSymbol}.get(cacheKey);
  }
  const originalResult = (function(...args) {`
)}
  const result = originalResult.apply(this, arguments);
  ${memoSymbol}.set(cacheKey, result);
  return result;
}).apply(this, arguments);`;
  });
};

const expandRetryMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  // Add retry logic around function calls
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${
      functionName.split("#")[1] || functionName
    }\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  return code.replace(
    funcPattern,
    `$1
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {`
  );
};

const expandTraceMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  // Add performance timing around function
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${
      functionName.split("#")[1] || functionName
    }\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  return code.replace(
    funcPattern,
    `$1
    const startTime = performance.now();
    console.log('[trace] entering ${functionName}');
    const originalFunction = function() {`
  );
};

const expandValidateMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  // Add parameter validation
  const funcPattern = new RegExp(
    `((?:async\\s+)?function\\s+${
      functionName.split("#")[1] || functionName
    }\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  return code.replace(
    funcPattern,
    `$1
    // TODO: Add validation logic based on schema`
  );
};

export const recordMacroPlan = (
  plans: MacroPlan[],
  signature: MacroPlan["signature"],
  macroName: string
) => {
  const existing = plans.find((plan) => plan.signature.name === signature.name);
  if (existing) {
    existing.macroNames.push(macroName);
  } else {
    plans.push({ signature, macroNames: [macroName] });
  }
};
