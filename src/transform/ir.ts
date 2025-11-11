import type { Signature } from "../core/types";

export interface AdvicePlan {
  signature: Signature;
  adviceIds: string[];
}

export interface MacroPlan {
  signature: Signature;
  macroNames: string[];
}

export interface TransformArtifact {
  file: string;
  source: string;
  code: string;
  map?: string;
  advice: AdvicePlan[];
  macros: MacroPlan[];
}
