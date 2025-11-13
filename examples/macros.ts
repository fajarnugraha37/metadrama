// Extended example showcasing all macro types: memoize, retry, trace, validate

function Service() {
  return (target: any) => target;
}

@Service()
class InventoryService {
  #items = new Map([
    ["sku-nyc", 5],
    ["sku-la", 1],
    ["sku-chicago", 10],
  ]);

  // Method to be memoized (caching with TTL)
  async getStock(location: string) {
    console.log(`[original] Fetching stock for ${location}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay
    return {
      location,
      quantity: this.#items.get(location) ?? 0,
      timestamp: Date.now(),
    };
  }

  // Method to be retried (with exponential backoff)
  async updateStock(location: string, quantity: number) {
    console.log(`[original] Updating stock for ${location} to ${quantity}`);

    // Simulate occasional failures
    if (Math.random() < 0.6) {
      throw new Error(`Network error updating stock for ${location}`);
    }

    this.#items.set(location, quantity);
    return { success: true, location, newQuantity: quantity };
  }

  // Method to be traced (comprehensive logging)
  async checkAvailability(location: string, requiredQuantity: number) {
    console.log(
      `[original] Checking availability: ${requiredQuantity} units at ${location}`
    );

    const currentStock = this.#items.get(location) ?? 0;
    const isAvailable = currentStock >= requiredQuantity;

    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate processing time

    return {
      location,
      requiredQuantity,
      currentStock,
      isAvailable,
      shortfall: isAvailable ? 0 : requiredQuantity - currentStock,
    };
  }

  // Method to be validated (parameter and return value validation)
  async processOrder(location: string, quantity: number, customerId: string) {
    console.log(
      `[original] Processing order: ${quantity} units for customer ${customerId} at ${location}`
    );

    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate order processing

    const currentStock = this.#items.get(location) ?? 0;
    if (currentStock < quantity) {
      return {
        success: false,
        error: "Insufficient stock",
        location,
        quantity: currentStock,
      };
    }

    this.#items.set(location, currentStock - quantity);

    return {
      success: true,
      orderId: `order_${Date.now()}`,
      location,
      quantity,
      customerId,
      remainingStock: currentStock - quantity,
    };
  }
}

// Test all macro functionalities
const runMacroTests = async () => {
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
    console.log(
      "Retry eventually failed:",
      error instanceof Error ? error.message : String(error)
    );
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
