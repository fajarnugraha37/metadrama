import { registry } from "./src/core/registry.js";
import { pointcut } from "./src/core/pointcut.js";

// Test configuration for all macro types
const serviceClasses = pointcut.classes.withDecorator("Service").methods;

// Register different macros for different methods
registry.registerMacro("memoize", serviceClasses.name("getStock"));
registry.registerMacro("retry", serviceClasses.name("updateStock"));
registry.registerMacro("trace", serviceClasses.name("checkAvailability"));
registry.registerMacro("validate", serviceClasses.name("processOrder"));

console.debug("[config] Registered macros:", {
  memoize: ["InventoryService#getStock"],
  retry: ["InventoryService#updateStock"],
  trace: ["InventoryService#checkAvailability"],
  validate: ["InventoryService#processOrder"],
});

console.debug("[config] Registered macros:", {
  memoize: ["InventoryService#getStock"],
  retry: ["InventoryService#updateStock"],
  trace: ["InventoryService#checkAvailability"],
  validate: ["InventoryService#processOrder"],
});
