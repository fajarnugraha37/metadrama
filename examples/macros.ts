import { pointcut, macro } from "@fajarnugraha37/metadrama";

const serviceMethods = pointcut.classes.withDecorator("Service").methods;

macro.memoize({ ttlMs: 1000 }).applyTo(serviceMethods.name(/get/));
macro.trace({ label: "ServiceCall" }).applyTo(serviceMethods);

export function Service(): ClassDecorator {
  return () => {};
}

@Service()
export class WeatherService {
  async getForecast(city: string) {
    return { city, temperature: 22 };
  }
}
