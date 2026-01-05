# Adding New Projects to the Monorepo

Guide for adding applications or libraries to the Nx + Yarn workspace monorepo.

## Quick Checklist

- [ ] Create project directory (`apps/*` or `libraries/*`)
- [ ] Add `package.json` with proper name and exports
- [ ] Add `project.json` with Nx targets
- [ ] Add `tsconfig.json` extending base config
- [ ] Add `eslint.config.ts` extending base config
- [ ] Add `jest.config.js`
- [ ] Update root `tsconfig.json` references
- [ ] Run `yarn install`
- [ ] Verify: `yarn nx show projects`

---

## Adding a Library

Location: `libraries/YourLibrary/`

### Required Files

**`package.json`:**

```json
{
  "name": "@wireapp/your-library",
  "version": "0.1.0",
  "main": "./lib/index.cjs",
  "module": "./lib/index.js",
  "types": "./lib/index.d.ts",
  "exports": {
    ".": {
      "types": "./lib/index.d.ts",
      "import": "./lib/index.js",
      "require": "./lib/index.cjs"
    }
  }
}
```

**`project.json`:**

```json
{
  "name": "your-library",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libraries/YourLibrary/src",
  "projectType": "library",
  "targets": {
    "build": {"executor": "nx:run-commands", "outputs": ["{projectRoot}/lib"]},
    "test": {"executor": "@nx/jest:jest"},
    "lint": {"executor": "nx:run-commands"},
    "type-check": {"executor": "nx:run-commands"}
  },
  "tags": ["type:lib", "scope:your-domain"]
}
```

**`tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./lib",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "lib", "**/*.test.ts"]
}
```

**`eslint.config.ts`:**

```typescript
import path from 'path';
import {createBaseConfig} from '../../eslint.config.base';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default [
  ...createBaseConfig({
    projectRoot: path.join(__dirname, '../..'),
    tsconfigPath: path.join(__dirname, 'tsconfig.json'),
    additionalIgnores: ['libraries/YourLibrary/lib/'],
  }),
];
```

**Update root `tsconfig.json`:**

```json
{
  "references": [{"path": "./apps/webapp"}, {"path": "./apps/server"}, {"path": "./libraries/YourLibrary"}]
}
```

---

## Adding an Application

Location: `apps/your-app/`

### Required Files

**`package.json`:**

```json
{
  "name": "@wireapp/your-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@wireapp/logger": "workspace:*"
  }
}
```

**`project.json`:**

```json
{
  "name": "your-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/your-app/src",
  "projectType": "application",
  "targets": {
    "build": {"executor": "nx:run-commands", "outputs": ["{projectRoot}/dist"]},
    "serve": {"executor": "nx:run-commands"},
    "test": {"executor": "@nx/jest:jest"},
    "lint": {"executor": "nx:run-commands"},
    "type-check": {"executor": "nx:run-commands"}
  },
  "tags": ["type:app", "scope:your-domain"]
}
```

**`tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`eslint.config.ts`:** Same pattern as libraries.

---

## TypeScript `composite` Configuration

### When to use `composite: true`:

| Use Case                           | Use Composite? |
| ---------------------------------- | -------------- |
| Library that outputs `.d.ts` files | ✅ Yes         |
| Library consumed by other projects | ✅ Yes         |
| Publishable npm package            | ✅ Yes         |
| Application (final build target)   | ❌ No          |
| No type definitions needed         | ❌ No          |

### What `composite: true` enables:

1. TypeScript project references (`references` in `tsconfig.json`)
2. Incremental builds with `tsc --build`
3. Forces generation of declaration files
4. Better IDE cross-project type checking

**Rule of thumb:** Libraries = `composite: true`, Applications = no `composite`

---

## Using Internal Dependencies

In consuming project's `package.json`:

```json
{
  "dependencies": {
    "@wireapp/your-library": "workspace:*"
  }
}
```

Then run `yarn install` to create symlinks.

Import in code:

```typescript
import {Something} from '@wireapp/your-library';
```

---

## Configuration Files Reference

### Root Files (Already Configured)

- `package.json` - Workspaces: `["apps/*", "libraries/*"]`
- `nx.json` - Target defaults for caching
- `tsconfig.base.json` - Shared TypeScript config
- `tsconfig.json` - Project references
- `eslint.config.base.ts` - Shared ESLint config
- `jest.preset.js` - Shared Jest config

### Per-Project Files (You Must Create)

- `package.json` - Name, version, exports, dependencies
- `project.json` - Nx targets (build, test, lint, type-check)
- `tsconfig.json` - Extends base, sets outDir/rootDir, composite for libs
- `eslint.config.ts` - Extends base config
- `jest.config.js` - Test configuration

---

## Verification

```bash
# Check Nx recognizes project
yarn nx show projects

# Test all targets
yarn nx build your-project
yarn nx test your-project
yarn nx lint your-project

# View dependency graph
yarn nx graph

# Check workspace linking
ls -la node_modules/@wireapp/your-project
```

---

## Examples

**Library:** [libraries/Logger/](../libraries/Logger/)

- Uses `composite: true`
- Outputs declaration files
- Publishable to npm

**Application:** [apps/webapp/](../apps/webapp/)

- No `composite`
- Private package
- Consumes libraries via `workspace:*`

---

## Related Documentation

- [ADR: Nx Monorepo Migration](./ADRs/2025-12-29-nx-monorepo-migration.md)
- [Nx Documentation](https://nx.dev)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
