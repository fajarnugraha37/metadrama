import type { TransformArtifact } from "./ir";

export interface WeaveResult extends TransformArtifact {}

export const weave = (artifact: TransformArtifact): WeaveResult => {
  // At this stage the SWC transform already produced `artifact.code`.
  // We simply tag metadata for downstream tooling.
  return artifact;
};
