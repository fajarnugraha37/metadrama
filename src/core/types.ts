export type AnyFunction = (...args: any[]) => any;
export type AnyConstructor = new (...args: any[]) => any;
export type FnLike = AnyFunction;

export type SignatureKind = "class" | "method" | "function";

export interface Signature {
  kind: SignatureKind;
  name: string;
  decorators: string[];
  file: string;
  async: boolean;
  generator: boolean;
  parameters: string[];
  returnType?: string;
  thisType?: string;
  owner?: {
    name: string;
    decorators: string[];
  };
}

export interface Pointcut<T extends FnLike> {
  kind: SignatureKind;
  test(signature: Signature): boolean;
  describe(): string;
}

export interface InvocationContext<This, Args extends unknown[]> {
  readonly targetName: string;
  readonly thisArg: This;
  readonly args: Args;
  readonly metadata?: Record<string, unknown>;
}

export interface BeforeContext<This, Args extends unknown[]>
  extends InvocationContext<This, Args> {
  setMetadata(key: string, value: unknown): void;
}

export interface AfterContext<This, Args extends unknown[], Return>
  extends InvocationContext<This, Args> {
  readonly result: Return;
  setMetadata(key: string, value: unknown): void;
}

export interface AroundContext<This, Args extends unknown[], Return>
  extends InvocationContext<This, Args> {
  proceed: (...nextArgs: Args) => Return | Promise<Return>;
  wrap<Result>(
    value: Result | Promise<Result>,
    tap: (value: Result) => Result
  ): Result | Promise<Result>;
}

export type BeforeImplementation<This, Args extends unknown[]> = (
  ctx: BeforeContext<This, Args>
) => void | Promise<void>;
export type AfterImplementation<This, Args extends unknown[], Return> = (
  ctx: AfterContext<This, Args, Return>
) => void | Promise<void>;
export type AroundImplementation<This, Args extends unknown[], Return> = (
  ctx: AroundContext<This, Args, Return>
) => Return | Promise<Return>;

export interface MacroApplication {
  readonly name: string;
  readonly params?: unknown;
  applyTo(pointcut: Pointcut<AnyFunction>): void;
}

export interface MacroFactory<TOptions = unknown> {
  (options?: TOptions): MacroApplication;
}

export interface ImportGraphLayer {
  readonly name: string;
  readonly edges: Set<string>;
  imports(layerName: string): boolean;
}

export interface ImportGraph {
  layers: Map<string, ImportGraphLayer>;
  addEdge(from: string, to: string): void;
  layer(name: string): ImportGraphLayer;
}

export interface RuleResult {
  code: string;
  message: string;
  file?: string;
  location?: { line: number; column: number };
}

export interface RuleContext {
  graph: ImportGraph;
  fail(message: string, file?: string): RuleResult;
}

export type RuleImplementation = (ctx: RuleContext) => void;

export type ParametersOf<T> = T extends (...args: infer P) => any ? P : never;
export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;
export type ThisParameterOf<T> = T extends (
  this: infer This,
  ...args: any[]
) => any
  ? This
  : ThisParameterType<T>;
