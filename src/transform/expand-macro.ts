import type { MacroPlan, TransformArtifact } from "./ir";

export const expandMacros = (
  artifact: TransformArtifact
): TransformArtifact => {
  if (!artifact.macros.length) {
    return artifact;
  }
  // Placeholder: macros are compile-time only. In this scaffold we simply annotate the plan.
  return artifact;
};

export const recordMacroPlan = (
  plans: MacroPlan[],
  signature: MacroPlan["signature"],
  macroName: string
) => {
  const existing = plans.find((plan) => plan.signature.name === signature.name);
  if (existing) {
    existing.macroNames.push(macroName);
  } else {
    plans.push({ signature, macroNames: [macroName] });
  }
};
