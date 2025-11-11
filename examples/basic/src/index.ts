/** @meta */
import {
  after,
  around,
  before,
  pointcut,
  weaveFunction,
  type Signature,
} from "@fajarnugraha37/metadrama";

function Service(): ClassDecorator {
  return (target) => target;
}

const services = pointcut.classes.withDecorator("Service").methods;

before(services)((ctx) => {
  console.log(`[basic] → ${ctx.targetName}(${ctx.args.join(", ")})`);
});

after(services)((ctx) => {
  console.log(`[basic] ← ${ctx.targetName} -> ${JSON.stringify(ctx.result)}`);
});

around(services)((ctx) => {
  const start = performance.now();
  const pending = ctx.proceed(...ctx.args);
  return ctx.wrap(pending, (value) => {
    console.log(
      `[basic] ${ctx.targetName} took ${(performance.now() - start).toFixed(
        2
      )}ms`
    );
    return value;
  });
});

@Service()
class InventoryService {
  #items = new Map<string, number>([
    ["sku-nyc", 5],
    ["sku-la", 1],
  ]);

  async getStock(location: string) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { location, quantity: this.#items.get(location) ?? 0 };
  }
}

const weaveMethod = <T extends new (...args: any[]) => any>(
  ctor: T,
  method: string,
  signature: Signature
) => {
  const proto = ctor.prototype as any;
  const original = proto[method];
  if (typeof original !== "function") return;
  proto[method] = weaveFunction(original, signature);
};

weaveMethod(InventoryService, "getStock", {
  kind: "method",
  name: "InventoryService#getStock",
  decorators: [],
  file: "examples/basic/src/index.ts",
  async: true,
  generator: false,
  parameters: ["location"],
  owner: { name: "InventoryService", decorators: ["Service"] },
});

const svc = new InventoryService();

const run = async () => {
  await svc.getStock("sku-nyc");
  await svc.getStock("sku-la");
};

if (import.meta.main) {
  run().catch((error) => {
    console.error("[basic-example]", error);
    process.exit(1);
  });
}
