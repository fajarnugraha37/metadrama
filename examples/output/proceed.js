/** @meta */ import { around, pointcut, weaveFunction } from "@fajarnugraha37/metadrama";
const doubleFns = pointcut.functions.name(/scale/i);
around(doubleFns)((ctx)=>{
    const nextArgs = ctx.args.map((value)=>typeof value === "number" ? Math.abs(value) : value);
    console.log(`[proceed-example] sanitized args`, nextArgs);
    return ctx.proceed(...nextArgs);
});
const scale = (value, factor)=>value * factor;
const signature = {
    kind: "function",
    name: "scale",
    decorators: [],
    file: "examples/proceed/src/index.ts",
    async: false,
    generator: false,
    parameters: [
        "value",
        "factor"
    ]
};
const wrapped = weaveFunction(scale, signature);
const run = ()=>{
    console.log(wrapped(-3, -2));
};
if (import.meta.main) {
    run();
}
