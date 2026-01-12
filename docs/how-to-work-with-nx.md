# How to Work with Nx Monorepo

This guide provides practical guidance for developers working with the wire-webapp Nx monorepo.

## Table of Contents

- [Running Tests](#running-tests)
- [Quick Reference](#quick-reference)
- [Adding New Apps/Libraries](#adding-new-appslibraries)
- [Working with Dependencies](#working-with-dependencies)
- [Using Nx Cache Effectively](#using-nx-cache-effectively)
- [Troubleshooting](#troubleshooting)

---

## Running Tests

### Run All Tests

```bash
# Run all tests across all projects
nx run-many -t test --all

# Run all tests with CI configuration
nx run-many -t test --all --configuration=ci

# Run tests for specific project
nx test webapp
nx test server
nx test core-lib

# Run tests with coverage
nx test webapp --coverage
nx test core-lib --test:coverage

# Run tests in watch mode
nx test webapp --watch
```

### Run Single Test File

```bash
# Run a single test file
nx test webapp --testFile=Router.test.ts

# Run tests matching a pattern
nx test webapp --testNamePattern="Router"
```

### Test Configuration

```bash
# CI configuration (used in CI/CD)
nx test webapp --configuration=ci

# Development configuration
nx test webapp --configuration=development
```

### Workspace-Tools

The `workspace-tools` project is a special Nx project that provides workspace-level utilities. It doesn't have actual code to test or build - it's a container for shared scripts and commands.

**Available workspace-tools commands:**
- `nx run workspace-tools:clean-jest` - Clean Jest cache
- `nx run workspace-tools:changelog-production` - Generate production changelog
- `nx run workspace-tools:changelog-staging` - Generate staging changelog
- `nx run workspace-tools:changelog-rc` - Generate RC changelog
- `nx run workspace-tools:docker` - Build Docker image
- `nx run workspace-tools:release-staging` - Release to staging
- `nx run workspace-tools:release-production` - Release to production
- `nx run workspace-tools:release-custom` - Custom release

These commands are exposed as root npm scripts in [`package.json`](package.json:77-94):
```json
{
  "scripts": {
    "clean:jest": "nx reset && nx run workspace-tools:clean-jest",
    "changelog:production": "nx run workspace-tools:changelog-production",
    "changelog:staging": "nx run workspace-tools:changelog-staging",
    "changelog:rc": "nx run workspace-tools:changelog-rc",
    "deploy": "nx run server:package && eb deploy",
    "docker": "nx run workspace-tools:docker",
    "release:staging": "nx run workspace-tools:release-staging",
    "release:production": "nx run workspace-tools:release-production",
    "release:custom": "nx run workspace-tools:release-custom",
    "start": "nx serve server",
    "build:prod": "nx build webapp --configuration=production"
  }
}
```

---

## Quick Reference

### Common Nx Commands

```bash
# Build commands
nx build <project>                    # Build specific project
nx run-many -t build --all           # Build all projects
nx affected -t build                  # Build only affected projects

# Test commands
nx test <project>                     # Test specific project
nx run-many -t test --all             # Test all projects
nx test <project> --coverage          # Test with coverage
nx test <project> --watch             # Test in watch mode

# Lint commands
nx lint <project>                     # Lint specific project
nx run-many -t lint --all             # Lint all projects
nx lint <project> --fix               # Lint and auto-fix issues

# Development commands
nx serve <project>                    # Start dev server for a project
nx run-many -t serve --parallel       # Start multiple dev servers in parallel

# Graph & analysis
nx graph                              # Visualize dependency graph in browser
nx affected:graph                     # Show affected projects
nx show project <project>             # Show project details and dependencies

# Cache commands
nx reset                              # Clear all cached artifacts
nx build <project> --skip-nx-cache  # Skip cache for this command
```

### Running by Tags

Projects are tagged for organization:

```bash
# Run on all frontend projects
nx run-many -t build --projects=tag:frontend

# Run on all libraries
nx run-many -t test --projects=tag:lib

# Run on specific scope
nx run-many -t lint --projects=tag:core
```

---

## Adding New Apps/Libraries

### Adding a New Application

When adding a new application (e.g., `apps/new-app`), you need to modify several files:

#### Step 1: Create the Application Directory

```bash
mkdir -p apps/new-app/src
```

#### Step 2: Create [`apps/new-app/package.json`](apps/new-app/package.json)

```json
{
  "name": "@wireapp/new-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nx build new-app",
    "test": "nx test new-app",
    "lint": "nx lint new-app"
  },
  "dependencies": {
    "@wireapp/core": "workspace:^"
  }
}
```

#### Step 3: Create [`apps/new-app/project.json`](apps/new-app/project.json)

```json
{
  "name": "new-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "{projectRoot}/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "command": "tsc",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/apps/new-app"],
      "options": {
        "jestConfig": "{projectRoot}/jest.config.js",
        "passWithNoTests": false
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint --quiet --ext .js,.ts {projectRoot}"
      }
    }
  },
  "tags": ["type:app", "scope:frontend"]
}
```

#### Step 4: Create [`apps/new-app/tsconfig.json`](apps/new-app/tsconfig.json)

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

#### Step 5: Update [`tsconfig.json`](tsconfig.json)

```json
{
  "files": [],
  "references": [
    { "path": "./apps/webapp" },
    { "path": "./apps/server" },
    { "path": "./apps/new-app" },  // Add this
    { "path": "./libraries/core" }
  ]
}
```

#### Step 6: Update [`tsconfig.eslint.json`](tsconfig.eslint.json)

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "paths": {
      "@wireapp/core/lib/*": ["libraries/core/src/*"],
      "@wireapp/core": ["libraries/core/src/index.ts"]
    }
  },
  "include": [
    "apps/webapp/src/**/*",
    "apps/webapp/test/**/*",
    "apps/server/**/*.ts",
    "libraries/core/src/**/*",
    "apps/new-app/src/**/*",  // Add this
    "apps/new-app/test/**/*"  // Add this
  ],
  "references": [
    { "path": "./apps/webapp" },
    { "path": "./apps/server" },
    { "path": "./libraries/core" },
    { "path": "./apps/new-app" }  // Add this
  ]
}
```

#### Step 7: Update [`codecov.yml`](codecov.yml)

```yaml
flags:
  # ... existing flags
  app_new_app:
    paths:
      - 'apps/new-app/**'
    carryforward: false

status:
  project:
    # ... existing projects
    app_new_app:
      target: auto
      flags:
        - app_new_app
```

#### Step 8: Update [`.github/labeler.yml`](.github/labeler.yml)

```yaml
# Apps
'app: new-app':
  files:
    - 'apps/new-app/.*'
```

### Adding a New Library

When adding a new library (e.g., `libraries/new-lib`), follow these steps:

#### Step 1: Create the Library Directory

```bash
mkdir -p libraries/new-lib/src
```

#### Step 2: Create [`libraries/new-lib/package.json`](libraries/new-lib/package.json)

```json
{
  "name": "@wireapp/new-lib",
  "version": "1.0.0",
  "license": "GPL-3.0",
  "main": "lib/index",
  "types": "src/index.ts",
  "typesVersions": {
    "*": {
      "lib/*": [
        "src/*"
      ]
    }
  },
  "files": [
    "lib",
    "src"
  ],
  "scripts": {
    "build": "nx run new-lib:build",
    "test": "nx run new-lib:test",
    "lint": "nx run new-lib:lint"
  }
}
```

**Why `typesVersions` is important:**

The `typesVersions` field maps type resolution paths. It tells TypeScript that when someone imports from `lib/*` (e.g., `lib/connection`), it should resolve to `src/*` (e.g., `src/connection`). This is critical because:

1. **Source-based types**: The library's type definitions are in `src/index.ts` (not in `lib/`)
2. **Compiled output**: The library compiles to `lib/` directory
3. **Import resolution**: When consumers import from the package, TypeScript needs to know that `lib/*` imports should resolve to source types for accurate IntelliSense and type checking

Without `typesVersions`, consumers would get type errors or no IntelliSense when importing subpaths like `@wireapp/new-lib/lib/connection`.

#### Step 3: Create [`libraries/new-lib/project.json`](libraries/new-lib/project.json)

```json
{
  "name": "new-lib",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "{projectRoot}/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/lib"],
      "options": {
        "command": "tsc",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libraries/new-lib"],
      "options": {
        "jestConfig": "{projectRoot}/jest.config.js",
        "passWithNoTests": false
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint --quiet --ext .js,.ts {projectRoot}"
      }
    }
  },
  "tags": ["type:lib", "scope:core"]
}
```

#### Step 4: Create [`libraries/new-lib/tsconfig.json`](libraries/new-lib/tsconfig.json)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./lib",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "lib", "**/*.spec.ts", "**/*.test.ts"]
}
```

#### Step 5: Update [`tsconfig.json`](tsconfig.json)

```json
{
  "files": [],
  "references": [
    { "path": "./apps/webapp" },
    { "path": "./apps/server" },
    { "path": "./libraries/core" },
    { "path": "./libraries/new-lib" }  // Add this
  ]
}
```

#### Step 6: Update [`tsconfig.eslint.json`](tsconfig.eslint.json)

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "paths": {
      "@wireapp/core/lib/*": ["libraries/core/src/*"],
      "@wireapp/core": ["libraries/core/src/index.ts"],
      "@wireapp/new-lib": ["libraries/new-lib/src/index.ts"],  // Add main import
      "@wireapp/new-lib/lib/*": ["libraries/new-lib/src/*"]  // Add subpath imports
    }
  },
  "include": [
    "apps/webapp/src/**/*",
    "apps/webapp/test/**/*",
    "apps/server/**/*.ts",
    "libraries/core/src/**/*",
    "libraries/new-lib/src/**/*",  // Add this
    "libraries/new-lib/jest.setup.ts"  // Add this
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "tmp",
    "apps/server/dist",
    "apps/webapp/dist",
    "libraries/core/lib",
    "libraries/core/.tmp",
    "libraries/new-lib/lib",  // Add this
    "libraries/new-lib/.tmp"  // Add this
  ],
  "references": [
    { "path": "./apps/webapp" },
    { "path": "./apps/server" },
    { "path": "./libraries/core" },
    { "path": "./libraries/new-lib" }  // Add this
  ]
}
```

**Why `paths` in [`tsconfig.eslint.json`](tsconfig.eslint.json) is critical for type-aware linting:**

The ESLint TypeScript Project Service (enabled via `EXPERIMENTAL_useProjectService` in [`eslint.config.ts`](eslint.config.ts:76-78)) needs to understand how to resolve module imports to provide accurate type checking during linting. Without these path mappings:

1. ESLint would fail to resolve imports like `import { ConnectionService } from '@wireapp/core/lib/connection'`
2. Type-aware rules would not work correctly
3. The `project` option in [`eslint.config.ts`](eslint.config.ts:74) points to this file, so paths defined here are used by the TypeScript language service

#### Step 7: Update [`codecov.yml`](codecov.yml)

```yaml
flags:
  # ... existing flags
  lib_new_lib:
    paths:
      - 'libraries/new-lib/**'
    carryforward: true

status:
  project:
    # ... existing projects
    lib_new_lib:
      target: auto
      flags:
        - lib_new_lib
```

#### Step 8: Update [`.github/labeler.yml`](.github/labeler.yml)

```yaml
# Libraries
'lib: new-lib':
  files:
    - 'libraries/new-lib/.*'
```

---

## Working with Dependencies

### Understanding `dependsOn`

The `dependsOn` field in [`project.json`](apps/webapp/project.json) defines which projects must run before the current target.

```json
{
  "build": {
    "dependsOn": ["^build"]  // Run all upstream build targets first
  }
}
```

**Syntax:**
- `^build` - All upstream projects' build targets
- `project:target` - Specific target of a specific project
- `["^build", "project:build"]` - Multiple dependencies

**Example from [`apps/webapp/project.json`](apps/webapp/project.json:11):**

```json
{
  "build": {
    "dependsOn": ["^build", "server:build"]
  }
}
```

This means: "Build all libraries that webapp depends on, then build server, then build webapp."

### Workspace Dependencies

Use the `workspace:^` protocol in [`package.json`](apps/webapp/package.json:40) to reference local workspace packages:

```json
{
  "dependencies": {
    "@wireapp/core": "workspace:^"
  }
}
```

**Benefits of `workspace:^`:**
1. **Automatic linking** - No need for symlinks or npm link
2. **Version resolution** - Automatically resolves to the local workspace version
3. **Change detection** - Changes to the library trigger rebuilds of dependent projects

### Importing from Libraries

With proper path mappings in [`tsconfig.eslint.json`](tsconfig.eslint.json:5-8), you can import cleanly:

```typescript
// Import from library root
import { Account } from '@wireapp/core';

// Import from library subpaths
import { ConnectionService } from '@wireapp/core/lib/connection';
import { MessageHasher } from '@wireapp/core/lib/cryptography/MessageHashService';
```

### Visualizing Dependencies

```bash
# Open dependency graph in browser
nx graph

# Show affected projects
nx affected:graph

# Show project details
nx show project webapp

# List dependencies
nx show project webapp --web=false
```

---

## Using Nx Cache Effectively

### How Nx Cache Works

Nx caches task results based on:
1. **File hashes** - Hashes of all input files
2. **Configuration** - Task configuration
3. **Environment** - Environment variables (if specified in inputs)

When you run a task, Nx:
1. Computes the cache key
2. Checks if cached result exists
3. If yes, restores cached result (instant)
4. If no, runs task and caches result

### Cache Configuration

Cache is configured in [`nx.json`](nx.json):

```json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "cache": true,
      "outputs": ["{workspaceRoot}/coverage/apps/webapp"]
    },
    "lint": {
      "cache": true
    }
  }
}
```

### Cache Inputs

Cache inputs are defined in [`nx.json`](nx.json:19-29):

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s"
    ]
  }
}
```

**Key points:**
- `production` excludes test files from build cache
- `sharedGlobals` can be used for files that affect all projects

### Cache Best Practices

1. **Trust the cache** - Nx cache is reliable and saves significant time
2. **Use `nx reset` sparingly** - Only reset when you encounter cache issues
3. **Skip cache when needed** - Use `--skip-nx-cache` for debugging
4. **Understand cache misses** - Check why cache missed (file changes, config changes)

### Cache Commands

```bash
# Clear all cache
nx reset

# Skip cache for specific command
nx build webapp --skip-nx-cache

# View cache information
nx build webapp --verbose

# Check cache status
nx show project webapp
```

### CI Cache Considerations

In CI environments:
1. **Yarn cache** - Use GitHub Actions cache for `node_modules`
2. **Nx cache** - Local cache is cleared between CI runs by default
3. **Remote cache** - Consider Nx Cloud for distributed caching across machines

```yaml
# Example from .github/workflows/ci.yml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version-file: '.nvmrc'
    cache: 'yarn'  # Caches node_modules
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Project not found" error

**Cause:** Project not registered in Nx workspace

**Solution:** Check [`tsconfig.json`](tsconfig.json) references:

```json
{
  "files": [],
  "references": [
    { "path": "./apps/webapp" },
    { "path": "./apps/server" },
    { "path": "./libraries/core" }
  ]
}
```

#### Issue: "Cannot find module" import error

**Cause:** Path mappings not configured correctly

**Solution:** Check [`tsconfig.eslint.json`](tsconfig.eslint.json) paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@wireapp/core": ["libraries/core/src/index.ts"]
    }
  }
}
```

#### Issue: ESLint type-aware rules not working

**Cause:** TypeScript Project Service not configured correctly

**Solution:** Check [`eslint.config.ts`](eslint.config.ts:74-78):

```typescript
{
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: __dirname,
      EXPERIMENTAL_useProjectService: {
        allowDefaultProjectForFiles: ['*.ts', '*.tsx'],
      },
    },
  },
}
```

#### Issue: Cache not invalidating

**Cause:** Shared files not included in cache inputs

**Solution:** Add to `sharedGlobals` in [`nx.json`](nx.json:30):

```json
{
  "namedInputs": {
    "sharedGlobals": []  // Add files that affect all projects
  }
}
```

#### Issue: Dependencies not building in correct order

**Cause:** `dependsOn` not configured correctly

**Solution:** Check [`project.json`](apps/webapp/project.json:11):

```json
{
  "build": {
    "dependsOn": ["^build"]  // Build upstream dependencies first
  }
}
```

#### Issue: Coverage not uploading correctly

**Cause:** Coverage paths incorrect in [`codecov.yml`](codecov.yml)

**Solution:** Verify paths match actual coverage locations:

```yaml
flags:
  app_webapp:
    paths:
      - 'apps/webapp/**'
    carryforward: false
```

### Debugging Tips

1. **Use `--verbose`** - See detailed cache information
2. **Use `--skip-nx-cache`** - Run without cache for debugging
3. **Check `.nx/cache`** - Inspect cached artifacts
4. **Use `nx graph`** - Visualize dependencies
5. **Check `nx show project`** - See project configuration

### Getting Help

1. **Nx documentation** - https://nx.dev
2. **Nx docs command** - `nx docs <topic>`
3. **Project ADR** - [`docs/ADRs/2025-12-29-nx-monorepo-migration.md`](docs/ADRs/2025-12-29-nx-monorepo-migration.md)
4. **Ask team** - Check with team members for project-specific issues

---

## Quick Reference Card

```bash
# Essential Commands
nx graph                              # Dependency graph
nx build <project>                   # Build project
nx test <project>                    # Test project
nx lint <project>                    # Lint project
nx affected -t build                # Build affected
nx reset                             # Clear cache

# Adding New Project
1. Create directory
2. Create package.json
3. Create project.json
4. Update tsconfig.json
5. Update tsconfig.eslint.json
6. Update codecov.yml
7. Update .github/labeler.yml

# Key Files
nx.json                              # Workspace config
tsconfig.json                        # Project references
tsconfig.eslint.json                 # ESLint TypeScript config
codecov.yml                          # Coverage config
.github/labeler.yml                 # PR labeling
```
