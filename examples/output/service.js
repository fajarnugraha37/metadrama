/** @meta */ function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
import { Type } from "@sinclair/typebox";
import { macro, pointcut } from "@fajarnugraha37/metadrama";
export const profileArgsSchema = Type.Object({
    args: Type.Tuple([
        Type.String()
    ])
});
const services = pointcut.classes.withDecorator("Service").methods;
macro.memoize({
    ttlMs: 5_000
}).applyTo(services.name(/^get/));
macro.retry({
    max: 3,
    backoff: "exp",
    baseMs: 25
}).applyTo(services.name(/^(fetch|sync)/));
macro.trace({
    label: "svc"
}).applyTo(services);
macro.validate({
    schema: profileArgsSchema,
    mode: "args"
}).applyTo(services.name("getProfile"));
export function Service() {
    return (target)=>target;
}
export class ProfileService {
    async getProfile(userId) {
        await new Promise((resolve)=>setTimeout(resolve, 50));
        return {
            userId,
            name: "Nova"
        };
    }
    async fetchProfile(userId) {
        if (Math.random() < 0.7) {
            throw new Error("network glitch");
        }
        return {
            userId,
            name: "Nova"
        };
    }
}
ProfileService = _ts_decorate([
    Service()
], ProfileService);
export const service = new ProfileService();
