import type {
  FnLike,
  Pointcut,
  BeforeImplementation,
  AfterImplementation,
  AroundImplementation,
} from "./types";
import { registry } from "./registry";

export function before<F extends FnLike>(pc: Pointcut<F>) {
  return (impl: BeforeImplementation<ThisParameterType<F>, Parameters<F>>) => {
    registry.registerAdvice("before", pc, impl);
  };
}

export function after<F extends FnLike>(pc: Pointcut<F>) {
  return (
    impl: AfterImplementation<
      ThisParameterType<F>,
      Parameters<F>,
      ReturnType<F>
    >
  ) => {
    registry.registerAdvice("after", pc, impl);
  };
}

export function around<F extends FnLike>(pc: Pointcut<F>) {
  return (
    impl: AroundImplementation<
      ThisParameterType<F>,
      Parameters<F>,
      ReturnType<F>
    >
  ) => {
    registry.registerAdvice("around", pc, impl);
  };
}
