# Release Management and Versioning Guidelines

## Semantic Versioning Strategy

MetaDrama follows strict semantic versioning with special considerations for compile-time transformations:

### Version Categories

- **MAJOR** (x.0.0) - Breaking API changes, incompatible transformations
- **MINOR** (x.y.0) - New features, backward-compatible API additions
- **PATCH** (x.y.z) - Bug fixes, performance improvements, documentation

### Breaking Changes Definition

For MetaDrama, breaking changes include:

- Changes to public APIs (`pointcut`, `around`, `macro` interfaces)
- Modifications to generated code structure that affect runtime behavior
- CLI argument changes that break existing scripts
- Plugin interface modifications
- Diagnostic code changes that break tooling

```typescript
// Examples of breaking changes:

// ❌ MAJOR: Changing advice context structure
// v1.x.x
interface ExecutionContext {
  targetName: string
  args: any[]
}

// v2.0.0 - BREAKING
interface ExecutionContext {
  target: { name: string; class?: string } // Changed structure
  arguments: any[] // Renamed property
}

// ❌ MAJOR: Removing public APIs
// v1.x.x
macro.memoize().applyTo(pointcut)

// v2.0.0 - BREAKING
macro.cache().applyTo(pointcut) // Renamed method

// ✅ MINOR: Adding optional parameters
// v1.1.0 - Non-breaking
macro.memoize(options?: { ttl?: number }).applyTo(pointcut)

// ✅ PATCH: Internal optimizations
function generateMemoizeCode() {
  // Improved algorithm, same output structure
}
```

## Release Process

### 1. Pre-Release Checklist

```bash
# Run comprehensive test suite
bun run test:all
bun run test:integration
bun run test:performance

# Verify all examples work
bun run test:examples

# Check documentation links
bun run docs:validate

# Performance regression testing
bun run perf:benchmark --compare-to=v1.0.0

# Cross-platform testing
bun run test:matrix # Tests on Node.js, Bun, different TS versions
```

### 2. Version Bump Strategy

```typescript
// scripts/version-bump.ts
interface ReleaseType {
  type: "major" | "minor" | "patch";
  changes: ChangelogEntry[];
}

function determineReleaseType(changes: ChangelogEntry[]): ReleaseType {
  const hasBreaking = changes.some((c) => c.type === "breaking");
  if (hasBreaking) return { type: "major", changes };

  const hasFeatures = changes.some((c) => c.type === "feature");
  if (hasFeatures) return { type: "minor", changes };

  return { type: "patch", changes };
}

// Auto-generate changelog from commits
function generateChangelog(fromTag: string, toTag: string): ChangelogEntry[] {
  const commits = getCommitsBetween(fromTag, toTag);

  return commits.map((commit) => ({
    type: extractChangeType(commit.message),
    description: extractDescription(commit.message),
    breaking: commit.message.includes("BREAKING:"),
    pr: extractPRNumber(commit.message),
  }));
}
```

### 3. Release Artifacts

Each release should include:

- **npm package** with compiled JavaScript and TypeScript definitions
- **GitHub release** with changelog and migration notes
- **Documentation update** reflecting new features/changes
- **Example updates** showcasing new capabilities
- **Performance benchmarks** comparing to previous version

## Migration Guides

### Format Template

````markdown
# Migration Guide: v1.x to v2.0

## Overview

Version 2.0 introduces several improvements but includes breaking changes
to the advice context API and pointcut syntax.

**Estimated migration time**: 30 minutes for typical projects

## Breaking Changes

### 1. Advice Context API Changes

**What changed**: The `ExecutionContext` interface has been restructured for better TypeScript inference.

**Before (v1.x)**:

```typescript
around(pointcut)((ctx) => {
  console.log(ctx.targetName); // string
  return ctx.proceed(...ctx.args);
});
```
````

**After (v2.0)**:

```typescript
around(pointcut)((ctx) => {
  console.log(ctx.target.name); // string
  console.log(ctx.target.class); // string | undefined
  return ctx.proceed(...ctx.arguments);
});
```

**Migration script**:

```bash
# Automated migration available
npx @metadrama/migrate v1-to-v2 src/
```

### 2. Pointcut Syntax Changes

**What changed**: Method chaining order for better IntelliSense.

**Before**: `pointcut.classes.methods.withDecorator("Service")`
**After**: `pointcut.classes.withDecorator("Service").methods`

**Why**: Improved TypeScript inference and more logical grouping.

## New Features

### Enhanced Macro System

- Conditional compilation support
- Macro composition
- Better error messages

### Performance Improvements

- 40% faster compilation times
- Reduced memory usage
- Better incremental compilation

## Compatibility

### Supported Versions

- TypeScript: 4.8+
- Node.js: 16+
- Bun: 1.0+
- SWC: 1.3+

### Dropped Support

- TypeScript < 4.8
- Node.js < 16

## Need Help?

- [Migration FAQ](./faq.md)
- [Discord Community](https://discord.gg/metadrama)
- [GitHub Discussions](https://github.com/owner/metadrama/discussions)

````

## Deprecation Policy

### Timeline
- **Announcement**: Mark API as deprecated with alternatives
- **Warning Period**: 2 minor versions with warnings
- **Removal**: Next major version removes deprecated APIs

### Implementation
```typescript
// Mark deprecated APIs clearly
/**
 * @deprecated Use `macro.cache()` instead. Will be removed in v2.0.0
 * @see {@link cache} for the new API
 */
export function memoize(options?: MemoizeOptions) {
  console.warn("DEPRECATED: memoize() will be removed in v2.0.0. Use cache() instead.")
  return cache(options)
}

// Provide migration path
export function cache(options?: CacheOptions) {
  // New implementation
}
````

## Beta and Release Candidate Process

### Beta Releases (x.y.z-beta.n)

- Feature complete but may have bugs
- API stable unless critical issues found
- Suitable for testing in development environments
- 2-week beta period minimum

### Release Candidates (x.y.z-rc.n)

- Production ready candidates
- No new features, only critical bug fixes
- 1-week RC period minimum
- Requires sign-off from maintainers

### Release Timeline

```
Feature Freeze → Beta 1 → Beta N → RC 1 → RC N → Release
     ↓           ↓         ↓        ↓       ↓        ↓
  Stabilize   Testing   Polish   Final   Monitor  Support
```

## Hotfix Process

For critical bugs in released versions:

1. **Assess Impact**: Security, data corruption, build failures
2. **Create Hotfix Branch**: From release tag
3. **Minimal Fix**: Only address the specific issue
4. **Expedited Testing**: Focus on affected functionality
5. **Emergency Release**: Patch version bump

```bash
# Hotfix workflow
git checkout tags/v1.2.0
git checkout -b hotfix/v1.2.1
# Make minimal fix
git tag v1.2.1
npm publish
git push --tags
```

## Long-Term Support (LTS)

### LTS Policy

- **Current**: Latest major version receives all updates
- **LTS**: Previous major version receives critical fixes for 12 months
- **EOL**: After 12 months, only security patches for 6 months

### Support Matrix

| Version | Status  | Node.js | TypeScript | End of Life |
| ------- | ------- | ------- | ---------- | ----------- |
| 2.x     | Current | 16+     | 4.8+       | TBD         |
| 1.x     | LTS     | 14+     | 4.5+       | Jan 2025    |
| 0.x     | EOL     | -       | -          | Dec 2023    |

Remember: Predictable releases build trust, clear migration paths show respect for users' time! 🚀
