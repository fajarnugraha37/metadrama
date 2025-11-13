import { Type } from "@sinclair/typebox";
import { validateRuntime } from "@fajarnugraha37/metadrama";

const schema = Type.Object({
  args: Type.Tuple([Type.String(), Type.Number()]),
});

const processPayment = validateRuntime(
  (userId: string, amount: number) => ({ userId, amount }),
  { schema, mode: "args" }
);

const run = () => {
  console.log("ok", processPayment("42", 99));
  try {
    processPayment("42", "oops" as never);
  } catch (error) {
    // @ts-expect-error invalid data for demo
    console.error("[validate-example] rejected", error.message);
  }
};

if (import.meta.main) {
  run();
}
