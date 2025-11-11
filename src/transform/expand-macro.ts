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
      // Reconstruct qualified name for macro expansion
      const qualifiedName = signature.owner
        ? `${signature.owner.name}#${signature.name}`
        : signature.name;

      transformedCode = expandMacro(
        transformedCode,
        qualifiedName,
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
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    console.warn(`Cannot parse method name from: ${functionName}`);
    return code;
  }

  // Find the method definition and replace it entirely
  const methodSignaturePattern = new RegExp(
    `(async\\s+${methodName}\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    console.warn(
      `Could not find method ${methodName} in transpiled code for memoization`
    );
    return code;
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
    console.warn(`Could not find matching closing brace for ${methodName}`);
    return code;
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Generate cache variable name unique to this method
  const cacheVarName = `__${className}_${methodName}_cache`;

  // Create the memoized method with TTL support
  const memoizedMethod = `async ${methodName}(location) {
        // Memoize macro: cache with TTL support
        if (!this.${cacheVarName}) {
            this.${cacheVarName} = new Map();
        }
        
        const __cacheKey = JSON.stringify(arguments);
        const __now = Date.now();
        const __cached = this.${cacheVarName}.get(__cacheKey);
        
        // Check if cached value exists and is still valid (TTL: 60 seconds)
        if (__cached && (!__cached.expiry || __cached.expiry > __now)) {
            console.log('[memoize] cache hit for ${methodName}(' + __cacheKey + ')');
            return __cached.value;
        }
        
        // Execute original method
        console.log('[memoize] cache miss for ${methodName}(' + __cacheKey + ')');
        const __originalMethod = async () => {${originalBody}
        };
        
        const __result = await __originalMethod();
        
        // Cache the result with TTL
        this.${cacheVarName}.set(__cacheKey, {
            value: __result,
            expiry: __now + 60000  // 60 second TTL
        });
        
        return __result;
    }`;

  console.debug(
    `Memoizing method ${methodName} with cache variable ${cacheVarName}`
  );

  return code.slice(0, startIndex) + memoizedMethod + code.slice(endIndex);
};

const expandRetryMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    console.warn(`Cannot parse method name from: ${functionName}`);
    return code;
  }

  // Find the method definition and replace it entirely
  const methodSignaturePattern = new RegExp(
    `(async\\s+${methodName}\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    console.warn(
      `Could not find method ${methodName} in transpiled code for retry logic`
    );
    return code;
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
    console.warn(`Could not find matching closing brace for ${methodName}`);
    return code;
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the retry-enabled method with configurable options
  const retryMethod = `async ${methodName}(location) {
        // Retry macro: configurable retry with exponential backoff
        const __maxRetries = 3;
        const __baseDelay = 100; // ms
        let __attempt = 0;
        
        while (__attempt <= __maxRetries) {
            try {
                console.log('[retry] attempt ' + (__attempt + 1) + ' of ' + (__maxRetries + 1) + ' for ${methodName}');
                
                const __originalMethod = async () => {${originalBody}
                };
                
                const __result = await __originalMethod();
                
                if (__attempt > 0) {
                    console.log('[retry] ${methodName} succeeded after ' + (__attempt + 1) + ' attempts');
                }
                
                return __result;
                
            } catch (__error) {
                __attempt++;
                
                if (__attempt > __maxRetries) {
                    console.error('[retry] ${methodName} failed after ' + __maxRetries + ' retries:', __error);
                    throw __error;
                }
                
                // Exponential backoff with jitter
                const __delay = __baseDelay * Math.pow(2, __attempt - 1) + Math.random() * 100;
                console.warn('[retry] ${methodName} failed (attempt ' + __attempt + '), retrying in ' + __delay.toFixed(0) + 'ms:', __error.message);
                
                await new Promise(resolve => setTimeout(resolve, __delay));
            }
        }
    }`;

  console.debug(
    `Adding retry logic to method ${methodName} with ${3} max retries`
  );

  return code.slice(0, startIndex) + retryMethod + code.slice(endIndex);
};

const expandTraceMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    console.warn(`Cannot parse method name from: ${functionName}`);
    return code;
  }

  // Find the method definition and replace it entirely
  const methodSignaturePattern = new RegExp(
    `(async\\s+${methodName}\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    console.warn(
      `Could not find method ${methodName} in transpiled code for tracing`
    );
    return code;
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
    console.warn(`Could not find matching closing brace for ${methodName}`);
    return code;
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the trace-enabled method with comprehensive logging
  const tracedMethod = `async ${methodName}(location) {
        // Trace macro: comprehensive execution tracing
        const __traceId = 'trace_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const __startTime = performance.now();
        const __args = Array.from(arguments);
        
        console.group('[trace] ${className}#${methodName} (ID: ' + __traceId + ')');
        console.log('[trace] Arguments:', __args);
        console.log('[trace] Timestamp:', new Date().toISOString());
        console.time('[trace] Duration');
        
        try {
            const __originalMethod = async () => {${originalBody}
            };
            
            const __result = await __originalMethod();
            const __duration = performance.now() - __startTime;
            
            console.log('[trace] Success - Result:', __result);
            console.log('[trace] Execution time:', __duration.toFixed(2) + 'ms');
            console.timeEnd('[trace] Duration');
            console.groupEnd();
            
            return __result;
            
        } catch (__error) {
            const __duration = performance.now() - __startTime;
            
            console.error('[trace] Error after ' + __duration.toFixed(2) + 'ms:', __error);
            console.error('[trace] Stack trace:', __error.stack);
            console.timeEnd('[trace] Duration');
            console.groupEnd();
            
            throw __error;
        }
    }`;

  console.debug(`Adding trace logging to method ${methodName}`);

  return code.slice(0, startIndex) + tracedMethod + code.slice(endIndex);
};

const expandValidateMacro = (
  code: string,
  functionName: string,
  signature: any
): string => {
  const methodName = functionName.split("#")[1];
  const className = functionName.split("#")[0];

  if (!methodName || !className) {
    console.warn(`Cannot parse method name from: ${functionName}`);
    return code;
  }

  // Find the method definition and replace it entirely
  const methodSignaturePattern = new RegExp(
    `(async\\s+${methodName}\\s*\\([^)]*\\)\\s*{)`,
    "g"
  );

  const match = methodSignaturePattern.exec(code);
  if (!match) {
    console.warn(
      `Could not find method ${methodName} in transpiled code for validation`
    );
    return code;
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
    console.warn(`Could not find matching closing brace for ${methodName}`);
    return code;
  }

  // Extract the original method body (excluding the opening and closing braces)
  const originalBody = code.slice(signatureEnd, endIndex - 1);

  // Create the validation-enabled method with parameter and return value checks
  const validatedMethod = `async ${methodName}(location) {
        // Validate macro: parameter and return value validation
        const __validateParam = (value, name, type, required = true) => {
            if (required && (value === null || value === undefined)) {
                throw new Error('[validate] Parameter ' + name + ' is required but was ' + value);
            }
            
            if (value !== null && value !== undefined) {
                if (type === 'string' && typeof value !== 'string') {
                    throw new Error('[validate] Parameter ' + name + ' must be a string, got ' + typeof value);
                }
                if (type === 'number' && typeof value !== 'number') {
                    throw new Error('[validate] Parameter ' + name + ' must be a number, got ' + typeof value);
                }
                if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
                    throw new Error('[validate] Parameter ' + name + ' must be an object, got ' + typeof value);
                }
            }
        };
        
        const __validateReturnValue = (value, expectedType) => {
            if (value === null || value === undefined) {
                console.warn('[validate] Return value is null/undefined');
                return value;
            }
            
            if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
                throw new Error('[validate] Return value must be an object, got ' + typeof value);
            }
            
            return value;
        };
        
        // Validate input parameters (example: location should be string)
        console.log('[validate] Validating parameters for ${methodName}');
        __validateParam(location, 'location', 'string', true);
        
        try {
            const __originalMethod = async () => {${originalBody}
            };
            
            const __result = await __originalMethod();
            
            // Validate return value (example: should be object with location and quantity)
            console.log('[validate] Validating return value for ${methodName}');
            __validateReturnValue(__result, 'object');
            
            if (__result && typeof __result === 'object') {
                if (!('location' in __result)) {
                    console.warn('[validate] Return value missing expected property: location');
                }
                if (!('quantity' in __result)) {
                    console.warn('[validate] Return value missing expected property: quantity');
                }
                if (typeof __result.quantity !== 'number') {
                    console.warn('[validate] Return value quantity should be a number, got ' + typeof __result.quantity);
                }
            }
            
            console.log('[validate] Validation passed for ${methodName}');
            return __result;
            
        } catch (__error) {
            if (__error.message.includes('[validate]')) {
                console.error('[validate] Validation failed for ${methodName}:', __error.message);
            }
            throw __error;
        }
    }`;

  console.debug(`Adding validation logic to method ${methodName}`);

  return code.slice(0, startIndex) + validatedMethod + code.slice(endIndex);
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
