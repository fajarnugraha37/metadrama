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
    // @ts-expect-error invalid data for demo
    processPayment("42", "oops" as never);
  } catch (error) {
    console.error("[validate-example] rejected", error.message);
  }
};

if (import.meta.main) {
  run();
}
