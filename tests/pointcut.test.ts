import { describe, expect, it } from 'vitest'

import { pointcut } from '../src/core/pointcut'
import type { Signature } from '../src/core/types'

describe('pointcut selectors', () => {
  const classSignature: Signature = {
    kind: 'class',
    name: 'UserService',
    decorators: ['Service'],
    file: 'UserService.ts',
    async: false,
    generator: false,
    parameters: [],
    owner: undefined
  }

  const methodSignature: Signature = {
    kind: 'method',
    name: 'fetchUser',
    decorators: ['Trace'],
    file: 'UserService.ts',
    async: false,
    generator: false,
    parameters: ['id'],
    owner: { name: 'UserService', decorators: ['Service'] }
  }

  it('matches classes by decorator and exposes method namespace', () => {
    const services = pointcut.classes.withDecorator('Service')
    const serviceMethods = services.methods.withDecorator('Trace')

    expect(services.test(classSignature)).toBe(true)
    expect(serviceMethods.test(methodSignature)).toBe(true)
  })

  it('matches functions by name pattern', () => {
    const selector = pointcut.functions.name(/fetch[A-Z]/)
    const fnSignature: Signature = {
      kind: 'function',
      name: 'fetchProfile',
      decorators: [],
      file: 'helpers.ts',
      async: true,
      generator: false,
      parameters: ['id'],
      owner: undefined
    }
    expect(selector.test(fnSignature)).toBe(true)
  })
})
