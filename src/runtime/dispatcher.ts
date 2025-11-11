import type { AroundImplementation, Signature } from "../core/types";
import { registry } from "../core/registry";
import {
  createAfterContext,
  createAroundContext,
  createBeforeContext,
} from "../core/context";

const isPromise = (value: unknown): value is Promise<any> =>
  typeof (value as any)?.then === "function";

export function weaveFunction<T extends (...args: any[]) => any>(
  fn: T,
  signature: Signature
): T {
  const advice = registry.findAdvice(signature);
  if (!advice.length) {
    return fn;
  }

  const before = advice.filter((entry) => entry.kind === "before");
  const after = advice.filter((entry) => entry.kind === "after");
  const around = advice.filter((entry) => entry.kind === "around");

  const wrapped = function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> {
    const thisArg = this;
    const metadata: Record<string, unknown> = {};

    let beforeChain: Promise<void> | undefined;
    for (const entry of before) {
      const ctx = createBeforeContext(signature.name, thisArg, args, metadata);
      const result = (entry.handler as any)(ctx);
      if (isPromise(result)) {
        beforeChain = (beforeChain ?? Promise.resolve()).then(() => result);
      }
    }

    const invoke = () => {
      let invokeChain: (
        callArgs: Parameters<T>
      ) => ReturnType<T> | Promise<ReturnType<T>> = (callArgs) =>
        fn.apply(thisArg, callArgs);

      for (const entry of [...around].reverse()) {
        const next = invokeChain;
        invokeChain = (callArgs) => {
          const ctx = createAroundContext(
            signature.name,
            thisArg,
            callArgs,
            (...nextArgs: Parameters<T>) => {
              const actual = nextArgs.length ? nextArgs : callArgs;
              return next(actual);
            },
            metadata
          );
          return (
            entry.handler as AroundImplementation<
              any,
              Parameters<T>,
              ReturnType<T>
            >
          )(ctx);
        };
      }

      const value = invokeChain(args);
      const finalize = (resolved: ReturnType<T>) => {
        let afterChain: Promise<void> | undefined;
        for (const entry of after) {
          const ctx = createAfterContext(
            signature.name,
            thisArg,
            args,
            resolved,
            metadata
          );
          const result = (entry.handler as any)(ctx);
          if (isPromise(result)) {
            afterChain = (afterChain ?? Promise.resolve()).then(() => result);
          }
        }
        if (afterChain) {
          return afterChain.then(() => resolved) as any;
        }
        return resolved;
      };

      return isPromise(value) ? value.then(finalize) : finalize(value);
    };

    if (beforeChain) {
      return beforeChain.then(invoke) as any;
    }
    return invoke();
  };

  return wrapped as T;
}

export function describeAdvice(signature: Signature) {
  return registry
    .findAdvice(signature)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      target: signature.name,
    }));
}
