import fs from "node:fs/promises";

import { transform } from "@swc/core";

import { registry } from "../core/registry";
import type { TransformArtifact } from "../transform/ir";
import { expandMacros } from "../transform/expand-macro";
import { weave } from "../transform/weave";

export interface SwcTransformResult {
  code: string;
  source: string;
  map?: string;
  diagnostics: ReturnType<typeof registry.getDiagnostics>;
}

export const transformWithSwc = async (
  source: string,
  file: string
): Promise<SwcTransformResult> => {
  const swcResult = await transform(source, {
    filename: file,
    sourceMaps: true,
    jsc: {
      parser: {
        syntax: "typescript",
        decorators: true,
        tsx: file.endsWith(".tsx"),
      },
      target: "es2022",
    },
    module: {
      type: "es6",
    },
  });

  const artifact: TransformArtifact = {
    file,
    source,
    code: swcResult.code,
    map: swcResult.map ?? undefined,
    advice: [],
    macros: [],
  };

  const expanded = expandMacros(artifact);
  const woven = weave(expanded);

  return {
    code: woven.code,
    source,
    map: woven.map,
    diagnostics: registry.getDiagnostics(),
  };
};

export const transformFile = async (
  file: string
): Promise<SwcTransformResult> => {
  const source = await fs.readFile(file, "utf8");
  return transformWithSwc(source, file);
};
