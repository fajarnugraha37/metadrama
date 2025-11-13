/** @meta */ function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
import { after, around, before, pointcut, weaveFunction } from "@fajarnugraha37/metadrama";
function Service() {
    return (target)=>target;
}
const services = pointcut.classes.withDecorator("Service").methods;
before(services)((ctx)=>{
    console.log(`[basic] → ${ctx.targetName}(${ctx.args.join(", ")})`);
});
after(services)((ctx)=>{
    console.log(`[basic] ← ${ctx.targetName} -> ${JSON.stringify(ctx.result)}`);
});
around(services)((ctx)=>{
    const start = performance.now();
    const pending = ctx.proceed(...ctx.args);
    return ctx.wrap(pending, (value)=>{
        console.log(`[basic] ${ctx.targetName} took ${(performance.now() - start).toFixed(2)}ms`);
        return value;
    });
});
class InventoryService {
    #items = new Map([
        [
            "sku-nyc",
            5
        ],
        [
            "sku-la",
            1
        ]
    ]);
    async getStock(location) {
        // Around advice: 677a51c8-2997-45ac-a83d-85041cce4a6d
        const __start = performance.now();
        console.log('[advice] entering getStock');
        
        const __originalMethod = async () => {
        // Retry macro: configurable retry with exponential backoff
        const __maxRetries = 3;
        const __baseDelay = 100; // ms
        let __attempt = 0;
        
        while (__attempt <= __maxRetries) {
            try {
                console.log('[retry] attempt ' + (__attempt + 1) + ' of ' + (__maxRetries + 1) + ' for getStock');
                
                const __originalMethod = async () => {
        await new Promise((resolve)=>setTimeout(resolve, 10));
        return {
            location,
            quantity: this.#items.get(location) ?? 0
        };
    
                };
                
                const __result = await __originalMethod();
                
                if (__attempt > 0) {
                    console.log('[retry] getStock succeeded after ' + (__attempt + 1) + ' attempts');
                }
                
                return __result;
                
            } catch (__error) {
                __attempt++;
                
                if (__attempt > __maxRetries) {
                    console.error('[retry] getStock failed after ' + __maxRetries + ' retries:', __error);
                    throw __error;
                }
                
                // Exponential backoff with jitter
                const __delay = __baseDelay * Math.pow(2, __attempt - 1) + Math.random() * 100;
                console.warn('[retry] getStock failed (attempt ' + __attempt + '), retrying in ' + __delay.toFixed(0) + 'ms:', __error.message);
                
                await new Promise(resolve => setTimeout(resolve, __delay));
            }
        }
    
        };
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] getStock took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] getStock failed:', error);
            throw error;
        }
    }
}
InventoryService = _ts_decorate([
    Service()
], InventoryService);
const weaveMethod = (ctor, method, signature)=>{
    const proto = ctor.prototype;
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
    parameters: [
        "location"
    ],
    owner: {
        name: "InventoryService",
        decorators: [
            "Service"
        ]
    }
});
const svc = new InventoryService();
const run = async ()=>{
    await svc.getStock("sku-nyc");
    await svc.getStock("sku-la");
};
if (import.meta.main) {
    run().catch((error)=>{
        console.error("[basic-example]", error);
        process.exit(1);
    });
}
