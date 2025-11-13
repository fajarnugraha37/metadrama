// Extended example showcasing all macro types: memoize, retry, trace, validate
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function Service() {
    return (target)=>target;
}
class InventoryService {
    #items = new Map([
        [
            "sku-nyc",
            5
        ],
        [
            "sku-la",
            1
        ],
        [
            "sku-chicago",
            10
        ]
    ]);
    // Method to be memoized (caching with TTL)
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
        console.log(`[original] Fetching stock for ${location}`);
        await new Promise((resolve)=>setTimeout(resolve, 100)); // Simulate network delay
        return {
            location,
            quantity: this.#items.get(location) ?? 0,
            timestamp: Date.now()
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
    // Method to be retried (with exponential backoff)
    async updateStock(location) {
        // Around advice: 677a51c8-2997-45ac-a83d-85041cce4a6d
        const __start = performance.now();
        console.log('[advice] entering updateStock');
        
        const __originalMethod = async () => {
        console.log(`[original] Updating stock for ${location} to ${quantity}`);
        // Simulate occasional failures
        if (Math.random() < 0.6) {
            throw new Error(`Network error updating stock for ${location}`);
        }
        this.#items.set(location, quantity);
        return {
            success: true,
            location,
            newQuantity: quantity
        };
    
        };
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] updateStock took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] updateStock failed:', error);
            throw error;
        }
    }
    // Method to be traced (comprehensive logging)
    async checkAvailability(location) {
        // Around advice: 677a51c8-2997-45ac-a83d-85041cce4a6d
        const __start = performance.now();
        console.log('[advice] entering checkAvailability');
        
        const __originalMethod = async () => {
        console.log(`[original] Checking availability: ${requiredQuantity} units at ${location}`);
        const currentStock = this.#items.get(location) ?? 0;
        const isAvailable = currentStock >= requiredQuantity;
        await new Promise((resolve)=>setTimeout(resolve, 50)); // Simulate processing time
        return {
            location,
            requiredQuantity,
            currentStock,
            isAvailable,
            shortfall: isAvailable ? 0 : requiredQuantity - currentStock
        };
    
        };
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] checkAvailability took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] checkAvailability failed:', error);
            throw error;
        }
    }
    // Method to be validated (parameter and return value validation)
    async processOrder(location) {
        // Around advice: 677a51c8-2997-45ac-a83d-85041cce4a6d
        const __start = performance.now();
        console.log('[advice] entering processOrder');
        
        const __originalMethod = async () => {
        console.log(`[original] Processing order: ${quantity} units for customer ${customerId} at ${location}`);
        await new Promise((resolve)=>setTimeout(resolve, 200)); // Simulate order processing
        const currentStock = this.#items.get(location) ?? 0;
        if (currentStock < quantity) {
            return {
                success: false,
                error: "Insufficient stock",
                location,
                quantity: currentStock
            };
        }
        this.#items.set(location, currentStock - quantity);
        return {
            success: true,
            orderId: `order_${Date.now()}`,
            location,
            quantity,
            customerId,
            remainingStock: currentStock - quantity
        };
    
        };
        
        try {
            const __result = await __originalMethod();
            const __duration = performance.now() - __start;
            console.log('[advice] processOrder took ' + __duration.toFixed(2) + 'ms');
            return __result;
        } catch (error) {
            console.error('[advice] processOrder failed:', error);
            throw error;
        }
    }
}
InventoryService = _ts_decorate([
    Service()
], InventoryService);
// Test all macro functionalities
const runMacroTests = async ()=>{
    console.log("🧪 Testing All Macro Types\n");
    const service = new InventoryService();
    // Test memoization (should cache results)
    console.log("1️⃣ Testing Memoize Macro:");
    await service.getStock("sku-nyc"); // First call - cache miss
    await service.getStock("sku-nyc"); // Second call - cache hit
    console.log("\n2️⃣ Testing Retry Macro:");
    try {
        await service.updateStock("sku-la", 20); // Will retry on failures
    } catch (error) {
        console.log("Retry eventually failed:", error instanceof Error ? error.message : String(error));
    }
    console.log("\n3️⃣ Testing Trace Macro:");
    await service.checkAvailability("sku-chicago", 5); // Full execution tracing
    console.log("\n4️⃣ Testing Validate Macro:");
    await service.processOrder("sku-nyc", 2, "customer123"); // Parameter validation
    console.log("\n🎉 All macro tests completed!");
};
if (import.meta.main) {
    runMacroTests().catch(console.error);
}
