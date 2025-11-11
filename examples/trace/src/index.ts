import { traceRuntime } from "@fajarnugraha37/metadrama";

const fetchOrders = traceRuntime(async (userId: string) => {
  const response = await new Promise((resolve) =>
    setTimeout(() => resolve([{ id: "ord-1", total: 45 }]), 20)
  );
  return response;
}, { label: "orders" });

const run = async () => {
  await fetchOrders("42");
};

if (import.meta.main) {
  run().catch((error) => {
    console.error("[trace-example]", error);
    process.exit(1);
  });
}
