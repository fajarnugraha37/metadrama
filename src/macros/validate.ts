import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface ValidateOptions<TSchema = unknown> {
  schema: TSchema;
  project?: (args: unknown[], result?: unknown) => unknown;
  mode?: "args" | "result" | "both";
}

export const validateRuntime = <F extends (...args: any[]) => any>(
  fn: F,
  options: ValidateOptions
): F => {
  const {
    schema,
    project = (args: unknown[]) => ({ args }),
    mode = "args",
  } = options;
  let compiler: { Check(value: unknown): boolean };

  try {
    const { TypeCompiler } =
      require("@sinclair/typebox/compiler") as typeof import("@sinclair/typebox/compiler");
    compiler = TypeCompiler.Compile(schema as any);
  } catch (error) {
    throw new Error(
      "validate macro requires @sinclair/typebox to be installed"
    );
  }

  const ensureValid = (payload: unknown) => {
    if (!compiler.Check(payload)) {
      throw new Error("validate macro rejected payload");
    }
  };

  const wrapped = function (
    this: unknown,
    ...args: Parameters<F>
  ): ReturnType<F> {
    if (mode === "args" || mode === "both") {
      ensureValid(project(args));
    }
    const value = fn.apply(this, args);
    if ((mode === "result" || mode === "both") && value instanceof Promise) {
      return value.then((resolved) => {
        ensureValid(project(args, resolved));
        return resolved;
      }) as ReturnType<F>;
    }
    if (mode === "result" || mode === "both") {
      ensureValid(project(args, value));
    }
    return value;
  };

  return wrapped as F;
};
