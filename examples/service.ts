/** @meta */
import { Type } from "@sinclair/typebox";
import { macro, pointcut } from "@fajarnugraha37/metadrama";

export const profileArgsSchema = Type.Object({
  args: Type.Tuple([Type.String()]),
});

const services = pointcut.classes.withDecorator("Service").methods;

macro.memoize({ ttlMs: 5_000 }).applyTo(services.name(/^get/));
macro.retry({ max: 3, backoff: "exp", baseMs: 25 }).applyTo(
  services.name(/^(fetch|sync)/)
);
macro.trace({ label: "svc" }).applyTo(services);
macro.validate({
  schema: profileArgsSchema,
  mode: "args",
}).applyTo(services.name("getProfile"));

export function Service(): ClassDecorator {
  return (target) => target;
}

@Service()
export class ProfileService {
  async getProfile(userId: string) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { userId, name: "Nova" };
  }

  async fetchProfile(userId: string) {
    if (Math.random() < 0.7) {
      throw new Error("network glitch");
    }
    return { userId, name: "Nova" };
  }
}

export const service = new ProfileService();
