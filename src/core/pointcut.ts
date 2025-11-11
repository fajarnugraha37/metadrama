import type { FnLike, Pointcut, Signature } from "./types";

type Predicate = (signature: Signature) => boolean;

const createPointcut = <T extends FnLike = FnLike>(
  kind: Pointcut<any>["kind"],
  description: string,
  predicate: Predicate
): Pointcut<T> => ({
  kind,
  describe: () => description,
  test: predicate,
});

const normalize = (rx: RegExp | string): RegExp => {
  return typeof rx === "string" ? new RegExp(`^${rx}$`) : rx;
};

interface MethodNamespace extends Pointcut<FnLike> {
  withDecorator(name: string): Pointcut<FnLike>;
  name(rx: RegExp | string): Pointcut<FnLike>;
  where(predicate: (signature: Signature) => boolean): Pointcut<FnLike>;
}

interface MethodSeed {
  ownerPredicate?: Predicate;
  description?: string;
}

const methodBasePredicate = (signature: Signature, seed?: MethodSeed) =>
  signature.kind === "method" &&
  (!seed?.ownerPredicate || seed.ownerPredicate(signature));

const createMethodNamespace = (seed?: MethodSeed): MethodNamespace => {
  const basePointcut = createPointcut<FnLike>(
    "method",
    seed?.description ?? "method:*",
    (signature) => methodBasePredicate(signature, seed)
  );

  const wrap = (description: string, predicate: Predicate) =>
    createPointcut<FnLike>(
      "method",
      description,
      (signature) =>
        methodBasePredicate(signature, seed) && predicate(signature)
    );

  return Object.assign(basePointcut, {
    withDecorator(name: string) {
      return wrap(`method@${name}`, (signature) =>
        signature.decorators.includes(name)
      );
    },
    name(rx: RegExp | string) {
      const matcher = normalize(rx);
      return wrap(`method:${matcher}`, (signature) =>
        matcher.test(signature.name)
      );
    },
    where(predicate: (signature: Signature) => boolean) {
      return wrap("method:where", predicate);
    },
  });
};

interface FunctionNamespace extends Pointcut<FnLike> {
  withDecorator(name: string): Pointcut<FnLike>;
  name(rx: RegExp | string): Pointcut<FnLike>;
  where(predicate: (signature: Signature) => boolean): Pointcut<FnLike>;
}

const createFunctionNamespace = (): FunctionNamespace => {
  const base = createPointcut<FnLike>(
    "function",
    "function:*",
    (signature) => signature.kind === "function"
  );
  const wrap = (description: string, predicate: Predicate) =>
    createPointcut<FnLike>(
      "function",
      description,
      (signature) => signature.kind === "function" && predicate(signature)
    );

  return Object.assign(base, {
    withDecorator(name: string) {
      return wrap(`fn@${name}`, (signature) =>
        signature.decorators.includes(name)
      );
    },
    name(rx: RegExp | string) {
      const matcher = normalize(rx);
      return wrap(`fn:${matcher}`, (signature) => matcher.test(signature.name));
    },
    where(predicate: (signature: Signature) => boolean) {
      return wrap("fn:where", predicate);
    },
  });
};

export const pointcut = {
  classes: {
    withDecorator(name: string) {
      const predicate: Predicate = (signature) =>
        signature.kind === "class" && signature.decorators.includes(name);
      const description = `class@${name}`;
      const pointcutRef = createPointcut("class", description, predicate);
      const methods = createMethodNamespace({
        ownerPredicate: (signature) =>
          signature.owner?.decorators.includes(name) ?? false,
        description: `${description}::method`,
      });
      return Object.assign(pointcutRef, { methods });
    },
    name(rx: RegExp | string) {
      const matcher = normalize(rx);
      const pointcutRef = createPointcut(
        "class",
        `class:${matcher}`,
        (signature) =>
          signature.kind === "class" && matcher.test(signature.name)
      );
      const methods = createMethodNamespace({
        ownerPredicate: (signature) =>
          matcher.test(signature.owner?.name ?? ""),
        description: `class:${matcher}::method`,
      });
      return Object.assign(pointcutRef, { methods });
    },
  },
  methods: createMethodNamespace(),
  functions: createFunctionNamespace(),
};

export type { MethodNamespace };
