import type { Signature } from "@fajarnugraha37/metadrama";
import { pointcut } from "@fajarnugraha37/metadrama";

const signatures: Signature[] = [
  {
    kind: "class",
    name: "BillingService",
    decorators: ["Service"],
    file: "billing.ts",
    async: false,
    generator: false,
    parameters: [],
  },
  {
    kind: "method",
    name: "charge",
    decorators: ["Trace"],
    file: "billing.ts",
    async: false,
    generator: false,
    parameters: ["amount"],
    owner: { name: "BillingService", decorators: ["Service"] },
  },
  {
    kind: "function",
    name: "fetchInvoices",
    decorators: [],
    file: "billing.ts",
    async: true,
    generator: false,
    parameters: ["userId"],
  },
];

const services = pointcut.classes.withDecorator("Service");
const serviceMethods = services.methods.withDecorator("Trace");
const fetchFns = pointcut.functions.name(/fetch/);

for (const signature of signatures) {
  console.log(signature.name, {
    classMatch: services.test(signature),
    methodMatch: serviceMethods.test(signature),
    fetchMatch: fetchFns.test(signature),
  });
}
