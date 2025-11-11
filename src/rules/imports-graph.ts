import type { ImportGraph, ImportGraphLayer } from "../core/types";

class Layer implements ImportGraphLayer {
  readonly edges = new Set<string>();
  constructor(readonly name: string) {}

  imports(layerName: string): boolean {
    return this.edges.has(layerName);
  }
}

export class BasicImportGraph implements ImportGraph {
  layers = new Map<string, ImportGraphLayer>();

  addEdge(from: string, to: string): void {
    const source = this.layer(from);
    source.edges.add(to);
  }

  layer(name: string): ImportGraphLayer {
    if (!this.layers.has(name)) {
      this.layers.set(name, new Layer(name));
    }
    return this.layers.get(name) as ImportGraphLayer;
  }
}

export const createGraph = () => new BasicImportGraph();
