# Refactor Environment Variable Code to Shared Library

## Overview

Extract environment variable code from `apps/server` into a shared library to eliminate circular dependency between `webapp` and `server`. Currently `webapp` depends on `server:build`, but we need `server` to depend on `webapp:build` (since server serves the webapp static files).

## Current State

### Dependencies
```
webapp (build) ──dependsOn──> server (build)
                                      │
                                      └── serves static files
```

### Key Files
- `apps/server/config/env.ts` - Contains `Env` type definition
- `apps/server/config/client.config.ts` - Generates `ClientConfig` from `Env`
- `apps/server/config/server.config.ts` - Generates `ServerConfig` from `Env`
- `apps/server/config/index.ts` - Loads env and exports configs
- `apps/webapp/src/types/Wire.types.ts` - Imports `ClientConfig` from server
- `apps/webapp/src/script/util/test/mock/wireEnvMock.ts` - Imports `ClientConfig` from server

### Current Nx Dependencies
- `apps/webapp/project.json`: `"dependsOn": ["^build", "server:build"]`
- `apps/server/project.json`: `"dependsOn": ["^build"]`

## Target State

### Dependencies
```
shared-config-lib ──imported by──> webapp
       │                               │
       │                               └── (builds to static files)
       └──imported by──> server ──dependsOn──> webapp:build
```

### New Library Structure
```
libraries/config/
├── package.json
├── project.json
├── tsconfig.json
├── jest.config.js (optional)
├── README.md
└── src/
    ├── env.ts              # Env type definition
    ├── client.config.ts    # ClientConfig type and generator
    ├── server.config.ts    # ServerConfig type and generator
    ├── config.types.ts     # Shared types (ConfigGeneratorParams)
    └── index.ts           # Public exports
```

## Implementation Plan

### 1. Create New Shared Config Library

**Location**: `libraries/config`

**Package Name**: `@wireapp/config`

**Files to Create**:
- `libraries/config/package.json` - Library manifest
- `libraries/config/project.json` - Nx project configuration
- `libraries/config/tsconfig.json` - TypeScript configuration
- `libraries/config/src/env.ts` - Environment variable types
- `libraries/config/src/client.config.ts` - Client config generator
- `libraries/config/src/server.config.ts` - Server config generator
- `libraries/config/src/config.types.ts` - Shared types
- `libraries/config/src/index.ts` - Public API exports
- `libraries/config/README.md` - Documentation

### 2. Move Environment Variable Code

**From**: `apps/server/config/env.ts`
**To**: `libraries/config/src/env.ts`

The `Env` type contains all environment variable definitions used by both server and client.

### 3. Move Config Generator Functions

**From**: `apps/server/config/client.config.ts`
**To**: `libraries/config/src/client.config.ts`

**From**: `apps/server/config/server.config.ts`
**To**: `libraries/config/src/server.config.ts`

**From**: `apps/server/config/config.types.ts` (if exists)
**To**: `libraries/config/src/config.types.ts`

### 4. Update Server Code

**Files to Update**:
- `apps/server/config/index.ts` - Import from `@wireapp/config` instead of local files
- `apps/server/config/client.config.ts` - Remove or update to re-export from library
- `apps/server/config/server.config.ts` - Remove or update to re-export from library
- `apps/server/config/env.ts` - Remove or update to re-export from library
- `apps/server/package.json` - Add `@wireapp/config` dependency

**Option A**: Keep server config files as thin wrappers that re-export from the shared library
**Option B**: Remove server config files entirely and import directly from shared library

### 5. Update Webapp Code

**Files to Update**:
- `apps/webapp/src/types/Wire.types.ts` - Import `ClientConfig` from `@wireapp/config`
- `apps/webapp/src/script/util/test/mock/wireEnvMock.ts` - Import `ClientConfig` from `@wireapp/config`
- `apps/webapp/package.json` - Add `@wireapp/config` dependency

### 6. Update Nx Project Dependencies

**apps/webapp/project.json**:
```json
{
  "targets": {
    "build": {
      "dependsOn": ["^build"]  // Remove "server:build"
    }
  }
}
```

**apps/server/project.json**:
```json
{
  "targets": {
    "build": {
      "dependsOn": ["^build", "webapp:build"]  // Add "webapp:build"
    },
    "serve": {
      "options": {
        "buildTarget": "server:build"
      }
    }
  }
}
```

### 7. Update Root package.json

Ensure the workspace includes the new library:
```json
{
  "workspaces": [
    "apps/*",
    "libraries/*"
  ]
}
```

## Detailed File Changes

### libraries/config/package.json
```json
{
  "name": "@wireapp/config",
  "version": "1.0.0",
  "private": true,
  "license": "GPL-3.0",
  "main": "lib/index.js",
  "types": "src/index.ts",
  "typesVersions": {
    "*": {
      "lib/*": ["src/*"]
    }
  },
  "files": ["lib", "src"],
  "dependencies": {
    "dotenv": "16.6.1",
    "dotenv-extended": "2.9.0",
    "fs-extra": "11.3.3",
    "logdown": "3.3.1"
  },
  "devDependencies": {
    "@types/fs-extra": "11.0.4"
  }
}
```

### libraries/config/project.json
```json
{
  "name": "config-lib",
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
      "options": {
        "jestConfig": "{projectRoot}/jest.config.js",
        "passWithNoTests": true
      }
    },
    "type-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc --project {projectRoot}/tsconfig.json --noEmit"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint --config eslint.config.ts --quiet --ext .js,.ts {projectRoot}"
      }
    }
  },
  "tags": ["type:lib", "scope:config"]
}
```

### libraries/config/src/index.ts
```typescript
export type {Env} from './env';
export type {ClientConfig} from './client.config';
export type {ServerConfig} from './server.config';
export type {ConfigGeneratorParams} from './config.types';
export {generateConfig as generateClientConfig} from './client.config';
export {generateConfig as generateServerConfig} from './server.config';
```

## Migration Steps

### Phase 1: Create Library (No Breaking Changes)
1. Create `libraries/config` directory structure
2. Copy environment variable code to new library
3. Build the library
4. Add library as dependency to both webapp and server

### Phase 2: Update Webapp (No Breaking Changes)
1. Update webapp imports to use `@wireapp/config`
2. Verify webapp builds correctly
3. Remove `server:build` from webapp's `dependsOn`

### Phase 3: Update Server (Breaking Changes)
1. Update server imports to use `@wireapp/config`
2. Add `webapp:build` to server's `dependsOn`
3. Verify server builds and runs correctly

### Phase 4: Cleanup
1. Remove old config files from `apps/server/config/` (if using Option B)
2. Update any remaining references
3. Run full test suite
4. Update documentation

## Considerations

### Build Output Location
The webapp build outputs to `apps/server/dist/static`. After refactoring:
- Webapp builds independently to its own output
- Server depends on `webapp:build` and expects static files at `apps/server/dist/static`
- This may require updating webapp's webpack config or server's static file serving

### Environment Loading
The server's `config/index.ts` loads environment variables using `dotenv-extended`. This logic should:
- Stay in server if it's server-specific
- Move to shared library if both projects need it
- Be duplicated if each project needs different loading logic

### Version Management
- The shared library should be versioned independently
- Use workspace protocol (`workspace:^`) in package.json for local dependencies

### Testing
- Ensure all existing tests pass
- Add tests for the new shared library
- Verify build process works end-to-end

## Verification Checklist

- [ ] Library builds successfully
- [ ] Webapp builds without server dependency
- [ ] Server builds with webapp dependency
- [ ] All imports resolve correctly
- [ ] TypeScript types are exported properly
- [ ] No circular dependency warnings
- [ ] All tests pass
- [ ] Dev server works (`nx serve server`)
- [ ] Production build works (`nx run server:package`)
