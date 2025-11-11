import { randomUUID } from "node:crypto";

import type {
  AfterImplementation,
  AroundImplementation,
  BeforeImplementation,
  Pointcut,
  Signature,
  RuleImplementation,
  RuleResult,
} from "./types";

export type AdviceKind = "before" | "after" | "around";

interface AdviceRecord {
  id: string;
  kind: AdviceKind;
  pointcut: Pointcut<any>;
  handler:
    | BeforeImplementation<any, any>
    | AfterImplementation<any, any, any>
    | AroundImplementation<any, any, any>;
}

interface MacroRecord {
  id: string;
  name: string;
  pointcut: Pointcut<any>;
  options?: unknown;
}

export interface DiagnosticEntry {
  code: string;
  level: "error" | "warn" | "info";
  message: string;
  file?: string;
  span?: { line: number; column: number };
  hint?: string;
  durationMs?: number;
}

export class Registry {
  private advice: AdviceRecord[] = [];
  private macros: MacroRecord[] = [];
  private rules: Map<string, RuleImplementation> = new Map();
  private diagnostics: DiagnosticEntry[] = [];

  registerAdvice(
    kind: AdviceKind,
    pointcut: Pointcut<any>,
    handler: AdviceRecord["handler"]
  ): string {
    const id = randomUUID();
    this.advice.push({ id, kind, pointcut, handler });
    return id;
  }

  registerMacro(
    name: string,
    pointcut: Pointcut<any>,
    options?: unknown
  ): string {
    const id = randomUUID();
    const record: MacroRecord = { id, name, pointcut };
    if (options) {
      record.options = options;
    }
    this.macros.push(record);
    return id;
  }

  registerRule(name: string, implementation: RuleImplementation): void {
    this.rules.set(name, implementation);
  }

  recordDiagnostic(entry: DiagnosticEntry): void {
    this.diagnostics.push(entry);
  }

  getDiagnostics(): DiagnosticEntry[] {
    return [...this.diagnostics];
  }

  findAdvice(signature: Signature): AdviceRecord[] {
    return this.advice.filter(
      (record) =>
        record.pointcut.kind === signature.kind &&
        record.pointcut.test(signature)
    );
  }

  findMacros(signature: Signature): MacroRecord[] {
    return this.macros.filter((record) => record.pointcut.test(signature));
  }

  getRules(): [string, RuleImplementation][] {
    return [...this.rules.entries()];
  }

  reset() {
    this.advice = [];
    this.macros = [];
    this.rules.clear();
    this.diagnostics = [];
  }
}

export const registry = new Registry();
