# @wireapp/config

Shared configuration library for Wire webapp and server.

## Overview

This library contains environment variable type definitions and configuration generators used by both the webapp and server applications. It provides:

- `Env` type - Type definition for all environment variables
- `ClientConfig` type - Configuration object passed to the webapp client
- `ServerConfig` type - Configuration object used by the Node.js server
- `generateClientConfig()` - Function to generate client config from environment variables
- `generateServerConfig()` - Function to generate server config from environment variables

## Installation

This package is part of the workspace and should be installed using workspace protocol:

```json
{
  "dependencies": {
    "@wireapp/config": "workspace:^"
  }
}
```

## Usage

### Importing Types

```typescript
import type {Env, ClientConfig, ServerConfig} from '@wireapp/config';
```

### Generating Configuration

```typescript
import {generateClientConfig, generateServerConfig} from '@wireapp/config';

// Generate client configuration
const clientConfig = generateClientConfig(
  {version: '1.0.0', env: 'production', urls: {...}},
  env
);

// Generate server configuration
const serverConfig = generateServerConfig(
  {version: '1.0.0', env: 'production', urls: {...}},
  env
);
```

## Environment Variables

The `Env` type defines all supported environment variables. See [`src/env.ts`](src/env.ts) for the complete list.

## Development

### Build

```bash
nx run config-lib:build
```

### Type Check

```bash
nx run config-lib:type-check
```

### Lint

```bash
nx run config-lib:lint
```

## License

GPL-3.0
