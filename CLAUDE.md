# Repository Structure

This is a monorepo managed with Just and npm workspaces, with the following structure:

```
apps/
├── webapp/           # React frontend application
└── server/           # Node.js/Express backend API
libraries/
└── …                 # Shared workspace libraries
```

## Communication core

Located in `apps/webapp/src/script/core/`, the communication core provides:
- Account authentication and management
- WebSocket connections for real-time communication
- Protocol message handling (send/receive Protobuf messages)
- Cryptographic operations for secure messaging

The webapp uses these modules for all backend communication. When making changes to core functionality:
- Run unit tests: `npx just test`
- Build workspace libraries: `npx just build-libraries`
