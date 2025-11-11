import { rule, runRules, createGraph } from "@fajarnugraha37/metadrama";

rule("no-domain-infra", ({ graph, fail }) => {
  if (graph.layer("domain").imports("infra")) {
    fail("domain layer must not import infra");
  }
});

const graph = createGraph();
graph.addEdge("domain", "application");
graph.addEdge("application", "infra");
graph.addEdge("domain", "infra");

const results = runRules(graph);

if (results.length) {
  console.error("[rules-example] violations detected:");
  for (const result of results) {
    console.error(`  - ${result.code}: ${result.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("[rules-example] all architecture rules passed");
}
