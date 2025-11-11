import { expectType } from "tsd";

import type { Pointcut } from "@fajarnugraha37/metadrama";
import { before, pointcut } from "@fajarnugraha37/metadrama";

declare function target(this: { id: string }, foo: string, bar: number): number;

const typedPointcut = pointcut.functions.where(() => true) as Pointcut<
  typeof target
>;

before(typedPointcut)((ctx) => {
  expectType<{ id: string }>(ctx.thisArg);
  expectType<[string, number]>(ctx.args);
});
