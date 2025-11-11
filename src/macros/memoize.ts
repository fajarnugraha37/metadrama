export interface MemoizeOptions {
  ttlMs?: number;
  key?: (...args: unknown[]) => string;
}

interface CacheEntry<V> {
  value: V;
  expiry?: number;
}

export const memoizeRuntime = <F extends (...args: any[]) => any>(
  fn: F,
  options: MemoizeOptions = {}
): F => {
  const cache = new Map<string, CacheEntry<ReturnType<F>>>();
  const keyFn = options.key ?? ((...args: unknown[]) => JSON.stringify(args));

  const wrapped = function (
    this: unknown,
    ...args: Parameters<F>
  ): ReturnType<F> {
    const key = keyFn(...args);
    const existing = cache.get(key);
    const now = Date.now();
    if (existing && (!existing.expiry || existing.expiry > now)) {
      return existing.value;
    }

    const value = fn.apply(this, args);
    cache.set(key, {
      value,
      expiry: options.ttlMs ? now + options.ttlMs : undefined,
    });
    return value;
  };

  return wrapped as F;
};
