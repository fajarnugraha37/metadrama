export interface TraceOptions {
  label?: string;
  logger?: (message: string, payload: Record<string, unknown>) => void;
}

export const traceRuntime = <F extends (...args: any[]) => any>(
  fn: F,
  options: TraceOptions = {}
): F => {
  const label = options.label ?? fn.name ?? "anonymous";
  const logger =
    options.logger ??
    ((message: string, payload: Record<string, unknown>) =>
      console.debug(message, payload));

  const wrapped = function (
    this: unknown,
    ...args: Parameters<F>
  ): ReturnType<F> {
    const start = performance.now();
    logger(`[trace:start] ${label}`, { args });
    try {
      const value = fn.apply(this, args);
      if (value instanceof Promise) {
        return value
          .then((resolved) => {
            logger(`[trace:resolve] ${label}`, {
              duration: performance.now() - start,
              result: resolved,
            });
            return resolved;
          })
          .catch((error) => {
            logger(`[trace:reject] ${label}`, {
              duration: performance.now() - start,
              error,
            });
            throw error;
          }) as any;
      }
      logger(`[trace:return] ${label}`, {
        duration: performance.now() - start,
        result: value,
      });
      return value;
    } catch (error) {
      logger(`[trace:throw] ${label}`, {
        duration: performance.now() - start,
        error,
      });
      throw error;
    }
  };

  return wrapped as F;
};
