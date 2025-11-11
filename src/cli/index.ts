#!/usr/bin/env bun

import process from "node:process";

import { explainDiagnostic } from "../core/diagnostics";
import { runBuild } from "./build";
import { runCheck } from "./check";
import { runPlayground } from "./playground";

const commands = {
  build: runBuild,
  check: runCheck,
  playground: runPlayground,
};

const args = process.argv.slice(2);

const parse = () => {
  const flags: Record<string, boolean | string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=");
      if (!key) continue;
      if (inline !== undefined) {
        flags[key] = inline;
        continue;
      }
      const maybeValue = args[i + 1];
      if (maybeValue && !maybeValue.startsWith("--")) {
        flags[key] = maybeValue;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
};

const main = async () => {
  const { flags, positional } = parse();
  if (flags.explain) {
    console.log(explainDiagnostic(String(flags.explain)));
    return;
  }

  const [command = "build", ...targets] = positional;
  const handler = (
    commands as Record<
      string,
      (flags: Record<string, any>, targets: string[]) => Promise<void>
    >
  )[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
  await handler(flags, targets);
};

main().catch((error) => {
  console.error("[metadrama]", error);
  process.exit(1);
});
