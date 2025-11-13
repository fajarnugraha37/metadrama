/**
 * MetaDrama Marker Syntax Specification
 *
 * This document defines the compile-time marker syntax that replaces TypeScript decorators
 * to achieve zero runtime overhead in MetaDrama v0.2.0+
 */

export interface MarkerSyntaxSpec {
  version: "0.2.0";
  description: "Zero Runtime Overhead Marker System";
}

/**
 * CLASS MARKERS
 *
 * Replace @Decorator() syntax with JSDoc comments
 *
 * Syntax: @metadrama:class AspectName1,AspectName2,...
 */
export interface ClassMarkerSyntax {
  pattern: "/**\\s*@metadrama:class\\s+([\\w,\\s]+)\\s**/";
  examples: {
    single: "/** @metadrama:class Service */";
    multiple: "/** @metadrama:class Service,Transactional,Cacheable */";
    multiline: "/**\n * @metadrama:class Service\n */";
  };
}

/**
 * METHOD MARKERS
 *
 * Replace method-level decorators with method-specific markers
 *
 * Syntax: @metadrama:method MacroName(options),...
 */
export interface MethodMarkerSyntax {
  pattern: "/**\\s*@metradrama:method\\s+([\\w(),=\\s]+)\\s**/";
  examples: {
    simple: "/** @metradrama:method Cache */";
    withOptions: '/** @metradrama:method Cache(ttl=300,key="user") */';
    multiple: "/** @metradrama:method Cache(ttl=300),Retry(max=3) */";
    multiline: "/**\n * @metradrama:method Cache(ttl=300)\n * Additional documentation\n */";
  };
}

/**
 * FUNCTION MARKERS
 *
 * For standalone function transformation
 *
 * Syntax: @metradrama:function MacroName(options),...
 */
export interface FunctionMarkerSyntax {
  pattern: "/**\\s*@metradrama:function\\s+([\\w(),=\\s]+)\\s**/";
  examples: {
    simple: "/** @metradrama:function Memoize */";
    withOptions: '/** @metradrama:function Retry(max=5,backoff="exp") */';
  };
}

/**
 * SUPPORTED MARKER TYPES
 */
export type MarkerType = "class" | "method" | "function";

export interface ParsedMarker {
  type: MarkerType;
  line: number;
  column: number;
  source: string;
}

export interface ClassMarker extends ParsedMarker {
  type: "class";
  aspects: string[];
}

export interface MethodMarker extends ParsedMarker {
  type: "method";
  macros: MacroConfig[];
}

export interface FunctionMarker extends ParsedMarker {
  type: "function";
  macros: MacroConfig[];
}

export interface MacroConfig {
  name: string;
  options: Record<string, any>;
}

/**
 * COMPLETE SYNTAX EXAMPLES
 */
export const SYNTAX_EXAMPLES = {
  /**
   * Class with multiple aspects
   */
  serviceClass: `
    /**
     * @metadrama:class Service,Transactional
     */
    export class UserService {
      /**
       * @metradrama:method Cache(ttl=300,key="user:{0}")
       */
      async getUser(id: string): Promise<User> {
        return await this.db.findById(id);
      }

      /**
       * @metradrama:method Retry(max=3,backoff="exp"),Validate(schema=UserUpdateSchema)
       */
      async updateUser(id: string, data: UpdateData): Promise<User> {
        return await this.db.update(id, data);
      }
    }
  `,

  /**
   * Standalone function with memoization
   */
  standaloneFunction: `
    /**
     * @metradrama:function Memoize(ttl=60000,maxSize=100)
     */
    export function calculateExpensiveValue(input: number): number {
      // Expensive computation
      return Math.pow(input, 3) + Math.sqrt(input * 1000);
    }
  `,

  /**
   * Repository with aspect composition
   */
  repositoryClass: `
    /**
     * @metradrama:class Repository,Transactional,Auditable
     */
    export class UserRepository {
      /**
       * @metradrama:method Cache(ttl=300),Trace(label="query")
       */
      async findById(id: string): Promise<User | null> {
        return await this.db.user.findUnique({ where: { id } });
      }

      /**
       * @metradrama:method Retry(max=3),Validate(mode="args"),Audit(action="create")
       */
      async createUser(userData: CreateUserData): Promise<User> {
        return await this.db.user.create({ data: userData });
      }
    }
  `,
};

/**
 * MIGRATION MAPPING
 *
 * How current decorator syntax maps to new marker syntax
 */
export const MIGRATION_MAPPING = {
  decorators: {
    "@Service()": "/** @metradrama:class Service */",
    "@Repository()": "/** @metradrama:class Repository */",
    "@Controller()": "/** @metradrama:class Controller */",
    "@Transactional()": "/** @metradrama:class Transactional */",
  },

  macros: {
    "macro.memoize({ ttl: 300 })": "/** @metradrama:method Memoize(ttl=300) */",
    'macro.retry({ max: 3, backoff: "exp" })':
      '/** @metradrama:method Retry(max=3,backoff="exp") */',
    "macro.validate({ schema: UserSchema })":
      "/** @metradrama:method Validate(schema=UserSchema) */",
    'macro.trace({ label: "perf" })':
      '/** @metradrama:method Trace(label="perf") */',
  },
};
