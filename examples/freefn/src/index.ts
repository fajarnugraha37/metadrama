/** @meta */
import {
  after,
  before,
  pointcut,
  weaveFunction,
  type Signature,
} from "@fajarnugraha37/metadrama";

const pc = pointcut.functions.name("sendEmail");

before(pc)((ctx) => {
  console.log(`[freefn-example] sending ${ctx.args[1]} to ${ctx.args[0]}`);
});

after(pc)((ctx) => {
  console.log(`[freefn-example] status: ${ctx.result.status}`);
});

const sendEmail = (recipient: string, subject: string) => ({
  status: "queued",
  payload: { recipient, subject },
});

const signature: Signature = {
  kind: "function",
  name: "sendEmail",
  decorators: [],
  file: "examples/freefn/src/index.ts",
  async: false,
  generator: false,
  parameters: ["recipient", "subject"],
};

const wrapped = weaveFunction(sendEmail, signature);

if (import.meta.main) {
  wrapped("ops@company.com", "Alert");
}
