# Rules Example

Demonstrates registering a custom architecture rule (`no-domain-infra`) and running it against a handcrafted import graph.

```bash
bun run examples/rules/src/index.ts
```

You should see the rule violation logged because the sample graph intentionally adds a `domain -> infra` edge.
