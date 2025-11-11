import { registry } from "../core/registry";
import type { MacroApplication, Pointcut } from "../core/types";
import { memoizeRuntime, type MemoizeOptions } from "./memoize";
import { retryRuntime, type RetryOptions } from "./retry";
import { traceRuntime, type TraceOptions } from "./trace";
import { validateRuntime, type ValidateOptions } from "./validate";

const createMacroApplication = <T>(
  name: string,
  params?: T
): MacroApplication => {
  const applyTo = (pointcut: Pointcut<any>) => {
    registry.registerMacro(name, pointcut, params);
  };
  if (params) {
    return {
      name,
      params,
      applyTo,
    };
  }
  return {
    name,
    applyTo,
  };
};

export const macro = {
  memoize(options?: MemoizeOptions) {
    return createMacroApplication("memoize", options);
  },
  retry(options: RetryOptions) {
    return createMacroApplication("retry", options);
  },
  trace(options?: TraceOptions) {
    return createMacroApplication("trace", options);
  },
  validate<TSchema>(options: ValidateOptions<TSchema>) {
    return createMacroApplication("validate", options);
  },
};

export { memoizeRuntime, retryRuntime, traceRuntime, validateRuntime };
