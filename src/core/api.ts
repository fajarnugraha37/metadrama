import { after, around, before } from "./advice";
import { pointcut } from "./pointcut";
import { registry } from "./registry";
import type { RuleImplementation } from "./types";
import { macro } from "../macros";

export { pointcut, before, after, around, macro };

export const rule = (name: string, impl: RuleImplementation): void => {
  registry.registerRule(name, impl);
};

export function getDiagnostics() {
  return registry.getDiagnostics();
}
