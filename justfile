set default-list
set positional-arguments
export PATH := justfile_directory() + "/node_modules/.bin:" + env_var("PATH")
export NODE_OPTIONS := "--max-old-space-size=6144"

# Apply committed dependency patches without running repository setup automatically.
[group('setup')]
apply-patches:
    patch-package --error-on-fail

# Configure the repository after npm installs dependencies.
[group('setup')]
setup: apply-patches configure-webapp

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

# Run all repository lint checks, including ESLint, Prettier, Stylelint, and duplication.
[group('lint')]
lint: eslint format-check stylesheet-lint lint-duplication

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

# Type-check all application and library configurations in sequence.
[group('type-check')]
type-check: build-libraries
    tsc --project ./tsconfig.tools.type-check.json
    tsc --project ./tools/releaseAppearance/tsconfig.json
    tsc --project ./tsconfig.release-cli.json
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

# Build and assemble the internal server deployment artifact as a ZIP.
[group('build')]
package-server-internal: build-server build-webapp-internal
    node apps/server/bin/assembleBuild.mts internal artifact
    node tools/serverPackaging/zip.js

# Build, verify, and package the public server deployment artifact as a ZIP.
[group('build')]
package-server-public: build-server build-webapp-public
    node apps/server/bin/assembleBuild.mts public artifact
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

# Prepare compiled server output for local development after building its workspace dependencies.
[group('development')]
prepare-development-server: build-libraries
    rimraf apps/server/dist apps/server/build/metadata
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    tsc --project apps/server/tsconfig.json --incremental
    WIRE_WEBAPP_SERVER_OUTPUT_PATH=apps/server/dist node apps/server/bin/copy_server_assets.js
    cp apps/server/build/metadata/version.json apps/server/dist/version.json

# Build dependencies once, then run the server and its upstream library watchers.
[group('development')]
develop: prepare-development-server
    concurrently --raw --kill-others \
        "just watch-server-typescript" \
        "just run-development-server" \
        "just watch-library commons" \
        "just watch-library config" \
        "just watch-library core" \
        "just watch-library api-client" \
        "just watch-library priority-queue" \
        "just watch-library react-ui-kit" \
        "just watch-library store-engine" \
        "just watch-library store-engine-dexie" \
        "just watch-library-telemetry" \
        "just watch-library webapp-events" \
        "just watch-library bazinga64"

# Alternative to develop: build dependencies, select libraries, and start the server.
[group('development')]
develop-watch: prepare-development-server
    ts-node --project ./tsconfig.tools.json tools/development/startDevelopment.ts

# Recompile server sources while Node watches the compiled output and restarts the server.
[group('development')]
watch-server-typescript:
    tsc --project apps/server/tsconfig.json --incremental --watch --preserveWatchOutput

[group('development')]
run-development-server:
    export NODE_ENV=development; \
    if [ "$(uname -s)" = "Darwin" ]; then \
        node --watch-path=apps/server/dist apps/server/dist/index.js; \
    else \
        node --watch apps/server/dist/index.js; \
    fi

# Compile a selected workspace library continuously.
[group('development')]
watch-library library:
    case {{ quote(library) }} in \
        api-client|bazinga64|certificate-check|commons|config|copy-config|core|license-collector|priority-queue|react-ui-kit|store-engine|store-engine-dexie|store-engine-fs|webapp-events) ;; \
        *) echo "Unknown library: {{ quote(library) }}" >&2; exit 2 ;; \
    esac
    tsc --project {{ quote("libraries/" + library + "/tsconfig.json") }} --watch --preserveWatchOutput

# Copy telemetry assets and watch both TypeScript module formats.
[group('development')]
watch-library-telemetry:
    cd libraries/telemetry && node bin/copyAssets.mts
    cd libraries/telemetry && tsc --build tsconfig.json tsconfig.commonjs.json --watch --preserveWatchOutput

# Configure the webapp, generate its React icon components, and validate their types.
[group('setup')]
configure-webapp:
    cd libraries/copy-config && rimraf lib && tsc
    cd apps/webapp && node ../../libraries/copy-config/lib/cli.js ./.copyconfigrc.js
    cd apps/webapp && ts-node ./bin/generate_react_icons.ts
    cd apps/webapp && tsc --project ./tsconfig.generated-icons.json --noEmit

# Build and publish a Docker image after packaging the application.
[group('release')]
docker *dockerArguments:
    node ./tools/dockerPublication/pushDocker.js "$@"

# Run all unit tests with native Jest multi-project execution.
[group('testing')]
test: build-libraries
    jest --config ./jest.config.js

# Build workspace dependencies and run Playwright with the webapp's shared configuration.
[group('testing')]
e2e-test *playwrightArguments: build-libraries
    npx playwright test --config apps/webapp/playwright.config.ts "$@"

# Run Playwright UI mode with the same webapp configuration and dependency build.
[group('testing')]
e2e-ui *playwrightArguments: build-libraries
    npx playwright test --config apps/webapp/playwright.config.ts --ui "$@"

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

# Extract i18next strings from webapp JavaScript, HTML, and template files.
[group('translation')]
translate-extract:
    cd apps/webapp && i18next-scanner --config ../../i18next-scanner.config.js 'src/{page,script}/**/*.{js,html,htm}'

# Extract FormatJS strings and merge them into the canonical English source file.
[group('translation')]
translate-merge:
    cd apps/webapp && formatjs extract --format './bin/translations_extract_formatter.js' --out-file './src/i18n/en-US.json' 'src/**/*.{ts,tsx,js,jsx}' --ignore 'src/**/*.d.ts' --additional-function-names t

# Validate translated locale placeholders against the canonical English source.
[group('translation')]
translate-validate:
    node tools/i18n/validateTranslationPlaceholders.mts

# Extract and merge canonical source strings, then upload only source strings to Crowdin.
[group('translation')]
translate-upload: translate-extract
    just translate-merge
    crowdin upload sources --config crowdin.yaml

# Download Crowdin translations and validate their placeholders.
[group('translation')]
translate-download:
    crowdin download --config crowdin.yaml
    just translate-validate

# Validate build artifact metadata using the expected values from the environment.
[group('build')]
validate-build-artifact:
    node tools/buildArtifact/validateBuildArtifact.mts

# Validate recovered artifact metadata using the expected values from the environment.
[group('build')]
validate-recovery-build-artifact:
    node tools/buildArtifact/validateRecoveryBuildArtifact.mts
