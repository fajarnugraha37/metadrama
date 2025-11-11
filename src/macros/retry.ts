const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as any)?.then === "function";

export interface RetryOptions {
  max: number;
  backoff?: "exp" | "linear" | "none";
  baseMs?: number;
  retryable?: (error: unknown) => boolean;
}

const computeDelay = (attempt: number, options: RetryOptions): number => {
  const base = options.baseMs ?? 25;
  switch (options.backoff) {
    case "exp":
      return base * Math.pow(2, attempt);
    case "linear":
      return base * (attempt + 1);
    default:
      return base;
  }
};

export const retryRuntime = <F extends (...args: any[]) => any>(
  fn: F,
  options: RetryOptions
): F => {
  if (!options || typeof options.max !== "number") {
    throw new Error("retry macro requires a { max } option");
  }

  const wrapped = async function (
    this: unknown,
    ...args: Parameters<F>
  ): Promise<ReturnType<F>> {
    let attempt = 0;
    while (true) {
      try {
        const value = fn.apply(this, args);
        return isPromise(value)
          ? ((await value) as ReturnType<F>)
          : (value as ReturnType<F>);
      } catch (error) {
        const shouldRetry =
          (!options.retryable || options.retryable(error)) &&
          attempt < options.max;
        if (!shouldRetry) {
          throw error;
        }
        const wait = computeDelay(attempt, options);
        if (wait > 0) {
          await delay(wait);
        }
        attempt += 1;
      }
    }
  };

  return wrapped as unknown as F;
};
