import path from "node:path";
import { pathToFileURL } from "node:url";

import { registry } from "./registry";

export interface ConfigOptions {
  configPath?: string;
}

export const loadConfig = async (
  options: ConfigOptions = {}
): Promise<void> => {
  const cwd = process.cwd();
  const configPath = options.configPath || path.join(cwd, "aspect.config.ts");

  try {
    // Clear existing registry
    registry.reset();

    // Dynamic import the config file - this will execute the aspect definitions
    const configUrl = pathToFileURL(configPath).href;
    await import(configUrl);

    console.debug(`Loaded aspect config from ${configPath}`);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot resolve module")
    ) {
      // Config file doesn't exist, that's OK
      console.debug(`No aspect config found at ${configPath}`);
    } else {
      console.warn(`Failed to load aspect config from ${configPath}:`, error);
    }
  }
};
