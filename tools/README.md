# Repository tooling

Repository-owned tooling belongs under `tools/<capability>/`, grouped by the capability it implements. A capability directory may contain implementation, application-owned command models, automation entrypoints, shell orchestration, configuration, and the tests for that tooling.

Tests belong beside the tooling capability they exercise. Repository automation should invoke capability-owned entrypoints directly; new tooling must not default to the root `bin/` directory.

The root `bin/` directory is reserved for small, intentionally stable repository-wide command wrappers invoked as `./bin/<name>` or added to `PATH`. It currently contains `bin/yarn` and `bin/semver`.

Application-local directories such as `apps/*/bin/` are governed separately and are outside this repository-wide convention.
