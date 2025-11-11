import {
  memoizeRuntime,
  retryRuntime,
  traceRuntime,
  validateRuntime,
} from "@fajarnugraha37/metadrama";

import {
  ProfileService,
  profileArgsSchema,
  service,
} from "./service";

const wrapPrototypes = () => {
  const traceGet = traceRuntime(ProfileService.prototype.getProfile, {
    label: "svc#getProfile",
  });
  const memoized = memoizeRuntime(traceGet, { ttlMs: 5_000 });
  const validated = validateRuntime(memoized, {
    schema: profileArgsSchema,
    mode: "args",
  });
  ProfileService.prototype.getProfile = validated;

  const traceFetch = traceRuntime(ProfileService.prototype.fetchProfile, {
    label: "svc#fetchProfile",
  });
  const retried = retryRuntime(traceFetch, {
    max: 3,
    backoff: "exp",
    baseMs: 25,
  });
  ProfileService.prototype.fetchProfile = retried;
};

wrapPrototypes();

const log = (label: string, payload: unknown) =>
  console.log(`[macros-example] ${label}`, payload);

const run = async () => {
  try {
    const one = await service.getProfile("42");
    const cached = await service.getProfile("42");
    log("memoized", { sameReference: one === cached, value: cached });
  } catch (error) {
    console.error("profile failed", error);
  }

  try {
    const data = await service.fetchProfile("42");
    log("fetchProfile", data);
  } catch (error) {
    console.error("fetchProfile still failing after retries", error);
  }
};

if (import.meta.main) {
  run().catch((error) => {
    console.error("[macros-example]", error);
    process.exit(1);
  });
}
