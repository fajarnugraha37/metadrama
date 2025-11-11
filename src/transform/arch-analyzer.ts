import path from "node:path";

import type { ImportGraph } from "../core/types";
import { createGraph } from "../rules/imports-graph";

const LAYERS = ["domain", "application", "infra"] as const;

type Layer = (typeof LAYERS)[number] | "shared";

const detectLayer = (filePath: string): Layer => {
  for (const layer of LAYERS) {
    if (filePath.includes(layer)) {
      return layer;
    }
  }
  return "shared";
};

const extractImports = (source: string): string[] => {
  const matches = source.matchAll(/import[^'"`]+['"`]([^'"`]+)['"`]/g);
  const results: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      results.push(match[1]);
    }
  }
  return results;
};

const resolveLayer = (specifier: string, file: string): Layer => {
  if (specifier.startsWith(".")) {
    const target = path.join(path.dirname(file), specifier);
    return detectLayer(target);
  }
  return specifier.includes("infra")
    ? "infra"
    : specifier.includes("domain")
    ? "domain"
    : "shared";
};

export const analyzeProjectImports = (
  files: Array<{ file: string; source: string }>
): ImportGraph => {
  const graph = createGraph();
  for (const entry of files) {
    const fromLayer = detectLayer(entry.file);
    for (const specifier of extractImports(entry.source)) {
      const toLayer = resolveLayer(specifier, entry.file);
      graph.addEdge(fromLayer, toLayer);
    }
  }
  return graph;
};
