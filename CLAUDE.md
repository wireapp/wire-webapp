# Repository Structure

This is a monorepo with two applications managed with Just. Dependency management is centralized in the root npm project, using a single `package.json` and `package-lock.json` for application and build dependencies. Runtime application dependencies belong in root `dependencies`; development-only types and tooling belong in root `devDependencies`.

The application structure is:

```
apps/
├── webapp/           # React frontend application
└── server/           # Node.js/Express backend API
```

## Communication core

Located in `apps/webapp/src/script/core/`, the communication core provides:
- Account authentication and management
- WebSocket connections for real-time communication
- Protocol message handling (send/receive Protobuf messages)
- Cryptographic operations for secure messaging

The webapp uses these modules for all backend communication. When making changes to core functionality:
- Run unit tests: `npx just test`
