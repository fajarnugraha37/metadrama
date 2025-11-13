import { retryRuntime } from "@fajarnugraha37/metadrama";

let attempts = 0;
const unstable = retryRuntime(async () => {
  attempts += 1;
  if (attempts < 3) {
    throw new Error(`boom (${attempts})`);
  }
  return { attempts, status: "ok" };
}, { max: 5, backoff: "linear", baseMs: 10 });

const run = async () => {
  const result = await unstable();
  console.log("[retry-example] result", result);
};

if (import.meta.main) {
  run().catch((error) => {
    console.error("[retry-example]", error);
    process.exit(1);
  });
}
