import type { Pointcut, Signature, SignatureKind } from "../core/types";

export const createSignature = (
  kind: SignatureKind,
  name: string,
  file: string,
  decorators: string[] = [],
  options: Partial<Signature> = {}
): Signature => ({
  kind,
  name,
  file,
  decorators,
  async: options.async ?? false,
  generator: options.generator ?? false,
  parameters: options.parameters ?? [],
  returnType: options.returnType,
  thisType: options.thisType,
  owner: options.owner,
});

export const matchesPointcut = (signature: Signature, pc: Pointcut<any>) =>
  pc.test(signature);
