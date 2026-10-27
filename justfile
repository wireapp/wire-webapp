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
    tsc --project ./tsconfig.tools.json --noEmit

# Type-check the release appearance tooling.
[group('tooling')]
type-check-release-appearance:
    tsc --project ./tools/releaseAppearance/tsconfig.json --noEmit

# Type-check the release command-line tooling.
[group('tooling')]
type-check-release-cli:
    tsc --project ./tsconfig.release-cli.json --noEmit

# Type-check every configuration currently covered by Nx, in sequence.
[group('type-check')]
type-check: build-libraries tooling-type-check
    tsc --project ./apps/webapp/tsconfig.type-check.json --noEmit
    tsc --project ./apps/webapp/tsconfig.rspack.json --noEmit
    tsc --project ./apps/server/tsconfig.json --noEmit
    tsc --project ./apps/server/bin/tsconfig.json --noEmit
    tsc --project ./libraries/api-client/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/bazinga64/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/certificate-check/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/commons/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/config/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/copy-config/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/core/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/license-collector/tsconfig.json --noEmit
    tsc --project ./libraries/priority-queue/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/react-ui-kit/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/store-engine/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/store-engine-dexie/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/store-engine-fs/tsconfig.type-check.json --noEmit
    tsc --project ./libraries/telemetry/tsconfig.json --noEmit
    tsc --project ./libraries/telemetry/tsconfig.commonjs.json --noEmit
    tsc --project ./libraries/telemetry/tsconfig.type-check.json
    tsc --project ./libraries/webapp-events/tsconfig.json --noEmit

# Build workspace libraries required by the application and library test suites.
[group('testing')]
build-libraries:
    npx nx run-many -t build --projects=tag:type:lib

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
