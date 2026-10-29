# Repository Structure

This is a monorepo managed with Just and npm workspaces, with the following structure:

```
apps/
├── webapp/           # React frontend application
└── server/           # Node.js/Express backend API
libraries/
└── core/             # @wireapp/core - Wire's communication core library
```

## Core Library (`@wireapp/core`)

Located in `libraries/core/`, this is Wire's communication core library that provides:
- Account authentication and management
- WebSocket connections for real-time communication
- Protocol message handling (send/receive Protobuf messages)
- Cryptographic operations for secure messaging

The webapp depends on this library for all backend communication. When making changes to core functionality:
- Run unit tests: `npx just test`
- Build workspace libraries: `npx just build-libraries`
