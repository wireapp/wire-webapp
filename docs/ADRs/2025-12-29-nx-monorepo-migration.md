# 2025-12-29 - Nx Monorepo Migration

## Context

The `wire-webapp` repository was using a standard Yarn workspace structure with separate `server/` and `webapp/` (via `src/`) directories. While this structure worked, it lacked:

1. **Intelligent Build Caching**: Every build ran from scratch, wasting developer time and CI resources
2. **Unified Tooling**: Build commands were scattered across multiple scripts and configurations
3. **Project Organization**: No clear separation between applications and shared libraries
4. **Scalability**: Adding new projects or migrating shared packages from `wire-web-packages` would be complex
5. **Modern Tooling Support**: ESLint 9+ flat config requires updated approach

Additionally, the team had plans to migrate packages from the separate `wire-web-packages` Lerna monorepo into `wire-webapp`. The existing structure wasn't optimized for hosting multiple libraries.

## Decision

Migrate the repository to **Nx monorepo** (v22.3.3) with the following changes:

### Directory Structure
```
Before:                    After:
├── server/               ├── apps/
├── src/                 │   ├── server/
├── test/                │   └── webapp/
├── webpack.config.js     ├── libraries/ (prepared for future migrations)
└── ...                  └── ...
```

### Key Changes

1. **Nx Configuration**
   - Create [`nx.json`](../nx.json) with caching and target defaults
   - Create [`tsconfig.base.json`](../tsconfig.base.json) for workspace-wide TypeScript config
   - Create [`jest.preset.js`](../jest.preset.js) for shared Jest configuration

2. **Application Projects**
   - [`apps/webapp/project.json`](../apps/webapp/project.json) - Webapp Nx targets (build, test, e2e, lint, etc.)
   - [`apps/server/project.json`](../apps/server/project.json) - Server Nx targets (build, package, serve, etc.)

3. **ESLint Migration**
   - Replace `.eslintrc.js` with [`eslint.config.ts`](../eslint.config.ts) (ESLint 9+ flat config)
   - Enable type-aware linting with TypeScript project service
   - Separate rule sets for TS/TSX, JS/JSX, and test files

4. **Package Manager**
   - Upgrade Yarn from v4.1.1 to v4.12.0
   - Consolidate `yarn.lock` from `server/` to root

5. **Build System**
   - Move webpack config to [`apps/webapp/webpack.config.js`](../apps/webapp/webpack.config.js)
   - Move Dockerfile to [`apps/server/Dockerfile`](../apps/server/Dockerfile)
   - Update all build scripts to use Nx commands

6. **CI/CD Updates**
   - Update all GitHub workflows to use Nx commands
   - Update Codecov configuration for new coverage paths
   - Update Jenkinsfile for Nx-based builds

## Consequences

### Positive

1. **Improved Build Performance**
   - Nx caching prevents unnecessary rebuilds
   - Only affected projects are rebuilt
   - CI pipelines run faster

2. **Better Project Organization**
   - Clear separation between `apps/` and `libraries/`
   - Consistent project structure
   - Easy to add new applications or libraries

3. **Unified Tooling**
   - Single command pattern: `nx <target> <project>`
   - Consistent configuration across all projects
   - Better developer experience

4. **Type-Aware Linting**
   - ESLint with TypeScript project service catches more issues
   - Better IDE integration
   - Modern ESLint 9+ flat config

5. **Scalability**
   - Ready for library migrations from `wire-web-packages`
   - Easy to add new projects
   - Supports future monorepo expansion

6. **Modern Tooling**
   - ESLint 9+ flat config
   - Latest Yarn version with improvements
   - Nx v22.3.3 with latest features

### Negative

1. **Learning Curve**
   - Developers need to learn Nx commands
   - New project.json configuration to understand
   - Migration requires updating documentation

2. **Initial Setup Complexity**
   - Large initial refactoring (2,317 files changed)
   - CI/CD pipelines need updates
   - Potential migration issues during transition

3. **File Structure Changes**
   - All file paths have changed
   - IDE configurations may need updates
   - External references (docs, scripts) need updates

4. **Nx Overhead**
   - Additional configuration files
   - Nx dependency added to project
   - Slightly more complex build system

## Alternatives Considered

### 1. Keep Existing Yarn Workspace
**Pros:**
- No migration effort
- Familiar structure for team

**Cons:**
- No build caching
- Poor scalability for libraries
- Manual project organization

**Rejected:** Long-term benefits of Nx outweigh migration effort.

### 2. Use Lerna (like wire-web-packages)
**Pros:**
- Familiar to team (already used in wire-web-packages)
- Independent versioning

**Cons:**
- No built-in caching
- Less active development than Nx
- Would still need structural changes

**Rejected:** Nx provides better caching and modern tooling support.

### 3. Use Turborepo
**Pros:**
- Lightweight
- Good caching

**Cons:**
- Less mature than Nx
- Fewer built-in features
- Would still need significant config

**Rejected:** Nx provides more comprehensive solution for our needs.

## Related ADRs

None yet - this is the first ADR for this repository.

## Future Considerations

1. **Library Migrations**: Use new `libraries/` directory for packages from `wire-web-packages`
2. **Nx Release**: Consider implementing `nx release` for unified versioning
3. **Affected Commands**: Update all documentation to reference new Nx commands
4. **Monitoring**: Track build time improvements from caching
