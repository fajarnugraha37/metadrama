const METADATA = Symbol.for("metadrama:metadata");

export interface TargetMetadata {
  decorators: Set<string>;
  tags: Map<string, unknown>;
}

export const ensureMetadata = (target: object): TargetMetadata => {
  if (!(METADATA in target)) {
    Object.defineProperty(target, METADATA, {
      value: {
        decorators: new Set<string>(),
        tags: new Map<string, unknown>(),
      },
      enumerable: false,
      configurable: false,
    });
  }
  return (target as any)[METADATA];
};

export const addDecorator = (target: object, name: string) => {
  ensureMetadata(target).decorators.add(name);
};

export const getDecorators = (target: object): string[] => [
  ...ensureMetadata(target).decorators,
];

export const tag = (target: object, key: string, value: unknown) => {
  ensureMetadata(target).tags.set(key, value);
};

export const getTag = <T = unknown>(
  target: object,
  key: string
): T | undefined => {
  return ensureMetadata(target).tags.get(key) as T | undefined;
};
