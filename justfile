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

# Reject circular imports across application and tooling sources.
[group('lint')]
lint-dependencies *dependencyCruiserArguments:
    depcruise --config dependency-cruiser.config.mjs apps tools '*.js' '*.mjs' '*.cjs' "$@"

# Write every existing cycle and its dependency path to a standalone HTML report.
[group('lint')]
report-dependencies:
    mkdir -p target/reports/dependencies
    just lint-dependencies --output-type err-html --output-to target/reports/dependencies/circular-dependencies.html

# Check LESS formatting and Stylelint rules from the webapp workspace.
[group('lint')]
stylesheet-lint:
    cd apps/webapp && prettier --ignore-path ../../.prettierignore --check "**/*.less" && stylelint --ignore-path .gitignore "**/*.less"

# Lint the repository with ESLint's flat config and the temporary 279-warning budget.
[arg("fix", long, value="true")]
[group('lint')]
eslint fix="false":
    eslint . --config eslint.config.mjs --max-warnings=279 --cache --cache-strategy content --cache-location ./target/eslintcache {{ if fix == "true" { "--fix" } else { "" } }}

# Run all repository lint checks, including circular dependencies.
[group('lint')]
lint: eslint format-check stylesheet-lint lint-duplication lint-dependencies

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
        .

# Type-check all application and tooling configurations in sequence.
[group('type-check')]
type-check:
    tsc --project ./tsconfig.tools.type-check.json
    tsc --project ./tools/releaseAppearance/tsconfig.json
    tsc --project ./tsconfig.release-cli.json
    tsc --project ./apps/webapp/tsconfig.type-check.json
    tsc --project ./apps/webapp/tsconfig.rspack.json
    tsc --project ./apps/server/tsconfig.build.json --noEmit
    tsc --project ./apps/server/tsconfig.type-check.json
    tsc --project ./apps/server/bin/tsconfig.json
    tsc --project ./apps/webapp/tsconfig.api-client.json
    tsc --project ./apps/webapp/tsconfig.commons.json
    tsc --project ./apps/webapp/tsconfig.commons-tests.json

# Compile the production server and copy its runtime assets.
[group('build')]
build-server:
    rimraf apps/server/build/server
    tsc --project apps/server/tsconfig.build.json --outDir apps/server/build/server
    WIRE_WEBAPP_SERVER_OUTPUT_PATH=apps/server/build/server node apps/server/bin/copy_server_assets.js

# Build the internal production webapp with Rspack.
[group('build')]
build-webapp-internal:
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && PATH="node_modules/.bin:$PATH" WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/internal rspack build --config rspack.config.mts

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
build-webapp-development:
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && PATH="node_modules/.bin:$PATH" WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/development rspack build --config rspack.config.dev.mts

# Build the public production webapp with Rspack.
[group('build')]
build-webapp-public:
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    cd apps/webapp && PATH="node_modules/.bin:$PATH" WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json WIRE_WEBAPP_BUILD_OUTPUT_PATH=apps/webapp/dist/public rspack build --config rspack.config.public.mts

# Prepare compiled server output for local development with its runtime assets.
[group('development')]
prepare-development-server:
    rimraf apps/server/dist apps/server/build/metadata
    WIRE_WEBAPP_BUILD_METADATA_PATH=apps/server/build/metadata/version.json node apps/server/bin/generateVersionFile.mts
    tsc --project apps/server/tsconfig.build.json --incremental
    WIRE_WEBAPP_SERVER_OUTPUT_PATH=apps/server/dist node apps/server/bin/copy_server_assets.js
    cp apps/server/build/metadata/version.json apps/server/dist/version.json

# Compile the server once, then watch its sources and restart the server.
[group('development')]
develop: prepare-development-server
    concurrently --raw --kill-others \
        "just watch-server-typescript" \
        "just run-development-server"

# Recompile server sources while Node watches the compiled output and restarts the server.
[group('development')]
watch-server-typescript:
    tsc --project apps/server/tsconfig.build.json --incremental --watch --preserveWatchOutput

[group('development')]
run-development-server:
    export NODE_ENV=development; \
    if [ "$(uname -s)" = "Darwin" ]; then \
        node --watch-path=apps/server/dist apps/server/dist/index.js; \
    else \
        node --watch apps/server/dist/index.js; \
    fi

# Configure the webapp, generate its React icon components, and validate their types.
[group('setup')]
configure-webapp:
    cd apps/webapp && node ../../tools/configuration/cli.mts ./.copyconfigrc.js
    cd apps/webapp && ts-node ./bin/generate_react_icons.ts
    cd apps/webapp && tsc --project ./tsconfig.generated-icons.json --noEmit

# Build and publish a Docker image after packaging the application.
[group('release')]
docker *dockerArguments:
    node ./tools/dockerPublication/pushDocker.js "$@"

# Run all unit tests with native Jest multi-project execution.
[group('testing')]
test *jestArguments:
    jest --config ./jest.config.js "$@"

# Run Playwright with the webapp's shared configuration.
[group('testing')]
e2e-test *playwrightArguments:
    npx playwright test --config apps/webapp/playwright.config.ts "$@"

# Run Playwright UI mode with the same webapp configuration.
[group('testing')]
e2e-ui *playwrightArguments:
    npx playwright test --config apps/webapp/playwright.config.ts --ui "$@"

# Run each Jest project separately to preserve its coverage thresholds.
[group('testing')]
test-ci:
    for jest_config_path in apps/*/jest.config.* apps/webapp/test/core/jest.config.js apps/webapp/test/uiKit/jest.config.js apps/webapp/test/apiClient/jest.config.js apps/webapp/test/commons/jest.config.js; do \
        CI=true jest --config "${jest_config_path}" --ci --coverage --maxWorkers=2 || exit $?; \
    done
    CI=true jest --config tools/jest.config.js --ci --maxWorkers=2

# Run all unit tests in watch mode through the repository Jest project configuration.
[group('testing')]
test-watch:
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

# Start the extracted ZIP with only lockfile-pinned server production dependencies.
[group('testing')]
verify-server-package:
    node tools/serverPackaging/verifyServerPackage.mts

# Validate recovered artifact metadata using the expected values from the environment.
[group('build')]
validate-recovery-build-artifact:
    node tools/buildArtifact/validateRecoveryBuildArtifact.mts
