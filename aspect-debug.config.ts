import { pointcut, around, macro, rule } from "@fajarnugraha37/metadrama";

console.log("Loading aspect config...");

const services = pointcut.classes.withDecorator("Service").methods;
console.log("Created services pointcut:", services);

around(services)((ctx) => {
  console.log("AROUND ADVICE EXECUTING");
  const start = performance.now();
  const pending = ctx.proceed(...ctx.args);
  const done = (value: unknown) => {
    console.debug("[svc]", ctx.targetName, performance.now() - start, "ms");
    return value;
  };
  return pending instanceof Promise ? pending.then(done) : done(pending);
});

console.log("Registered around advice");

macro
  .retry({ max: 3, backoff: "exp", baseMs: 50 })
  .applyTo(services.name(/^(get|fetch)/));

console.log("Applied retry macro");

rule("no-domain-leak", ({ graph, fail }) => {
  if (graph.layer("domain").imports("infra")) {
    fail("domain -> infra not allowed");
  }
});

console.log("Registered rule");
