set default-list
export PATH := justfile_directory() + "/node_modules/.bin:" + env_var("PATH")
export NODE_OPTIONS := "--max-old-space-size=6144"

# Check repository file and directory names against .ls-lint.yml.
[group('lint')]
lint-file-names:
    ls-lint

# Check for duplicated source lines and write reports under target/.
[group('lint')]
lint-duplication:
    jscpd --config ./jscpd.json .

# Check LESS formatting and Stylelint rules from the webapp workspace.
[group('lint')]
stylesheet-lint:
    cd apps/webapp && prettier --ignore-path ../../.prettierignore --check "**/*.less" && stylelint --ignore-path .gitignore "**/*.less"

# Lint the repository with ESLint's flat config and the temporary 287-warning budget.
[arg("fix", long, value="true")]
[group('lint')]
eslint fix="false":
    eslint . --config eslint.config.mjs --max-warnings=287 --cache --cache-strategy content --cache-location ./target/eslintcache {{ if fix == "true" { "--fix" } else { "" } }}

# Automatically fix eligible ESLint issues across the repository.
[group('lint')]
eslint-fix: (eslint "true")

# Run all repository lint checks, including ESLint, Prettier, Stylelint, and duplication.
[group('lint')]
lint: eslint format-check stylesheet-lint lint-duplication

# Format repository files and automatically fix eligible ESLint issues.
[group('lint')]
fix: format eslint-fix

# Check changed files with Prettier against BASE_REF and HEAD_REF.
[group('format')]
format-check:
    bash tools/ci/lintFormatCheck.sh

# Format all supported repository files with Prettier.
[group('format')]
format:
    prettier --write --log-level warn \
        --ignore-path .prettierignore \
        --ignore-path .gitignore \
        --ignore-path apps/server/.gitignore \
        --ignore-path apps/webapp/.gitignore \
        --ignore-path libraries/commons/.gitignore \
        --ignore-path libraries/copy-config/.gitignore \
        --ignore-path libraries/license-collector/.gitignore \
        .

# Type-check the repository-owned TypeScript tooling.
[group('tooling')]
tooling-type-check: type-check-tooling type-check-release-appearance type-check-release-cli

# Type-check the shared repository tooling.
[group('tooling')]
type-check-tooling:
    tsc --project ./tsconfig.tools.type-check.json

# Type-check the release appearance tooling.
[group('tooling')]
type-check-release-appearance:
    tsc --project ./tools/releaseAppearance/tsconfig.json

# Type-check the release command-line tooling.
[group('tooling')]
type-check-release-cli:
    tsc --project ./tsconfig.release-cli.json

# Type-check every configuration currently covered by Nx, in sequence.
[group('type-check')]
type-check: build-libraries tooling-type-check
    tsc --project ./apps/webapp/tsconfig.type-check.json
    tsc --project ./apps/webapp/tsconfig.rspack.json
    tsc --project ./apps/server/tsconfig.type-check.json
    tsc --project ./apps/server/bin/tsconfig.json
    tsc --project ./libraries/api-client/tsconfig.type-check.json
    tsc --project ./libraries/bazinga64/tsconfig.type-check.json
    tsc --project ./libraries/certificate-check/tsconfig.type-check.json
    tsc --project ./libraries/commons/tsconfig.type-check.json
    tsc --project ./libraries/config/tsconfig.type-check.json
    tsc --project ./libraries/copy-config/tsconfig.type-check.json
    tsc --project ./libraries/core/tsconfig.type-check.json
    tsc --project ./libraries/license-collector/tsconfig.type-check.json
    tsc --project ./libraries/priority-queue/tsconfig.type-check.json
    tsc --project ./libraries/react-ui-kit/tsconfig.type-check.json
    tsc --project ./libraries/store-engine/tsconfig.type-check.json
    tsc --project ./libraries/store-engine-dexie/tsconfig.type-check.json
    tsc --project ./libraries/store-engine-fs/tsconfig.type-check.json
    tsc --project ./libraries/telemetry/tsconfig.type-check-esm.json
    tsc --project ./libraries/telemetry/tsconfig.type-check-commonjs.json
    tsc --project ./libraries/telemetry/tsconfig.type-check.json
    tsc --project ./libraries/webapp-events/tsconfig.type-check.json

# Build workspace libraries required by dependent tasks such as type-checking and tests.
[group('build')]
build-libraries:
    cd libraries/bazinga64 && tsc
    cd libraries/certificate-check && tsc
    cd libraries/commons && tsc
    cd libraries/config && tsc
    cd libraries/copy-config && tsc
    cd libraries/license-collector && tsc
    cd libraries/priority-queue && tsc
    cd libraries/react-ui-kit && tsc
    cd libraries/store-engine && tsc
    cd libraries/store-engine-dexie && tsc
    cd libraries/store-engine-fs && tsc
    cd libraries/telemetry && node bin/copyAssets.mts
    cd libraries/telemetry && tsc --build tsconfig.json tsconfig.commonjs.json
    cd libraries/webapp-events && tsc
    cd libraries/api-client && tsc
    cd libraries/core && tsc

# Compile the production server and copy its runtime assets.
[group('build')]
build-server: build-libraries
    tsc --project apps/server/tsconfig.json --outDir apps/server/build/server
    WIRE_WEBAPP_SERVER_OUTPUT_PATH=apps/server/build/server node apps/server/bin/copy_server_assets.js

# Build the internal production webapp with Rspack.
[group('build')]
build-webapp-internal: build-libraries
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/internal rspack build --config rspack.config.mts

# Assemble the internal server deployment artifact without creating a ZIP.
[group('build')]
assemble-server-internal: build-server build-webapp-internal
    node apps/server/bin/assembleBuild.mts internal artifact

# Package the internal server deployment artifact as a ZIP.
[group('build')]
package-server-internal: assemble-server-internal
    node tools/serverPackaging/zip.js

# Assemble the public server deployment artifact without creating a ZIP.
[group('build')]
assemble-server-public: build-server build-webapp-public
    node apps/server/bin/assembleBuild.mts public artifact

# Package the verified public server deployment artifact as a ZIP.
[group('build')]
package-server-public: assemble-server-public
    node tools/buildArtifact/verifyPublicProductionBundle.ts
    node tools/serverPackaging/zip.js

# Build the development webapp with Rspack.
[group('build')]
build-webapp-development: build-libraries
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/development rspack build --config rspack.config.dev.mts

# Build the public production webapp with Rspack.
[group('build')]
build-webapp-public: build-libraries
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/public rspack build --config rspack.config.public.mts

# Remove generated library outputs and library build information for a clean build.
[group('build')]
clean-libraries:
    rimraf libraries/*/lib
    rimraf target/buildcache/config-build.tsbuildinfo
    rimraf target/buildcache/telemetry-esm-build.tsbuildinfo
    rimraf target/buildcache/telemetry-commonjs-build.tsbuildinfo

# Run all unit tests with native Jest multi-project execution.
[group('testing')]
test: build-libraries
    jest --config ./jest.config.js

# Run each Jest project separately to preserve its coverage thresholds.
[group('testing')]
test-ci: build-libraries
    for jest_config_path in apps/*/jest.config.* libraries/*/jest.config.js; do \
        CI=true jest --config "${jest_config_path}" --ci --coverage --maxWorkers=2 || exit $?; \
    done
    CI=true jest --config tools/jest.config.js --ci --maxWorkers=2

# Run all unit tests in watch mode through the repository Jest project configuration.
[group('testing')]
test-watch: build-libraries
    jest --config ./jest.config.js --watch
