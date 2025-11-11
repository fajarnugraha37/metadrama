import { beforeEach, describe, expect, it } from "vitest";

import { rule, runRules } from "../src";
import { registry } from "../src/core/registry";
import { createGraph } from "../src/rules/imports-graph";

beforeEach(() => {
  registry.reset();
});

describe("rules", () => {
  it("flags banned edges", () => {
    rule("no-domain-infra", ({ graph, fail }) => {
      if (graph.layer("domain").imports("infra")) {
        fail("domain cannot import infra");
      }
    });

    const graph = createGraph();
    graph.addEdge("domain", "infra");
    const results = runRules(graph);
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("domain");
  });
});
