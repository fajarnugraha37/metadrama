import { pointcut, around, macro, rule } from "@fajarnugraha37/metadrama";

const services = pointcut.classes.withDecorator("Service").methods;

around(services)((ctx) => {
  const start = performance.now();
  const pending = ctx.proceed(...ctx.args);
  const done = (value: unknown) => {
    console.debug("[svc]", ctx.targetName, performance.now() - start, "ms");
    return value;
  };
  return pending instanceof Promise ? pending.then(done) : done(pending);
});

macro
  .retry({ max: 3, backoff: "exp", baseMs: 50 })
  .applyTo(services.name(/^(get|fetch)/));

rule("no-domain-leak", ({ graph, fail }) => {
  if (graph.layer("domain").imports("infra")) {
    fail("domain -> infra not allowed");
  }
});
