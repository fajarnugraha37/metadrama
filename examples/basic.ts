import { pointcut, before } from "@fajarnugraha37/metadrama";

const services = pointcut.classes.name(/Service$/).methods;

before(services)((ctx) => {
  console.log("[basic] calling", ctx.targetName, ctx.args);
});

export class UserService {
  findUser(id: string) {
    return { id, name: "Jane" };
  }
}
