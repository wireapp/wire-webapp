<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# Repository Structure

This is an Nx monorepo with the following structure:

```
apps/
├── webapp/           # React frontend application
└── server/           # Node.js/Express backend API
libraries/
└── core/             # @wireapp/core - Wire's communication core library
```

## Libraries

All libraries are located in `libraries/` directory. Current libraries:

### Core Library (`@wireapp/core`)
Located in `libraries/core/`, this is Wire's communication core library that provides:
- Account authentication and management
- WebSocket connections for real-time communication
- Protocol message handling (send/receive Protobuf messages)
- Cryptographic operations for secure messaging

The webapp depends on this library for all backend communication. When making changes to core functionality:
- Run tests: `nx run core-lib:test`
- Build the library: `nx run core-lib:build`
- Check for circular dependencies: `nx run core-lib:check:circular-dependencies`

## Development Workflow

### Starting the Dev Server
Run `yarn start` from the root to start the development environment. This automatically:
1. Builds all library projects (tagged with `type:lib`)
2. Starts watch mode for all libraries (auto-rebuilds on file changes)
3. Starts the server with webpack-dev-middleware
4. Enables hot module reloading for the webapp

**All local workspace libraries are automatically watched**, so changes to any library will trigger rebuilds and refresh the webapp.

### Adding New Libraries
When creating a new library in `libraries/`:
1. **Required**: Add `"type:lib"` tag to `project.json` tags array
2. **Required**: Add a `watch` target in `project.json`:
   ```json
   "watch": {
     "executor": "nx:run-commands",
     "dependsOn": ["build"],
     "options": {
       "command": "tsc --watch",
       "cwd": "{projectRoot}"
     }
   }
   ```
3. The library will automatically be included in watch mode when running `yarn start`
