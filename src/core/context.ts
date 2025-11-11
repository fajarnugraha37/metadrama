import type { AfterContext, AroundContext, BeforeContext } from "./types";

type MetadataBucket = Record<string, unknown>;

const setMeta = (bag: MetadataBucket, key: string, value: unknown) => {
  bag[key] = value;
};

export function createBeforeContext<This, Args extends unknown[]>(
  targetName: string,
  thisArg: This,
  args: Args,
  metadata: MetadataBucket = {}
): BeforeContext<This, Args> {
  return {
    targetName,
    thisArg,
    args,
    metadata,
    setMetadata(key, value) {
      setMeta(metadata, key, value);
    },
  };
}

export function createAfterContext<This, Args extends unknown[], Return>(
  targetName: string,
  thisArg: This,
  args: Args,
  result: Return,
  metadata: MetadataBucket = {}
): AfterContext<This, Args, Return> {
  return {
    targetName,
    thisArg,
    args,
    result,
    metadata,
    setMetadata(key, value) {
      setMeta(metadata, key, value);
    },
  };
}

export function createAroundContext<This, Args extends unknown[], Return>(
  targetName: string,
  thisArg: This,
  args: Args,
  invoke: (...nextArgs: Args) => Return | Promise<Return>,
  metadata: MetadataBucket = {}
): AroundContext<This, Args, Return> {
  const wrapped = {
    targetName,
    thisArg,
    args,
    metadata,
    proceed: (...nextArgs: Args) => {
      const actualArgs = (nextArgs.length ? nextArgs : args) as Args;
      return invoke(...actualArgs);
    },
    wrap<Result>(
      value: Result | Promise<Result>,
      tap: (value: Result) => Result
    ): Result | Promise<Result> {
      if (value instanceof Promise) {
        return value.then((resolved) => tap(resolved));
      }
      return tap(value);
    },
  };
  return wrapped;
}
