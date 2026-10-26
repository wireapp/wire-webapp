set default-list := true
export PATH := justfile_directory() + "/node_modules/.bin:" + env_var("PATH")

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

# Run ESLint for repository tooling with its existing file extensions and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-workspace-tools fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.mts,.cts tools

# Run ESLint for the server application with its existing file extensions and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-server fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} --max-warnings=0 {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.mts,.cts apps/server

# Run ESLint for the webapp with its existing file extensions and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-webapp fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=266 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.mts apps/webapp

# Run ESLint for the API client library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-api-client fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} --max-warnings=5 {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/api-client

# Run ESLint for the Bazinga64 library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-bazinga64 fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/bazinga64

# Run ESLint for the certificate-check library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-certificate-check fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/certificate-check

# Run ESLint for the common library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-commons fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/commons

# Run ESLint for the configuration library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-config fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} --max-warnings=0 {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/config

# Run ESLint for the copy-config library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-copy-config fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=1 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/copy-config

# Run ESLint for the core library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-core fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} --max-warnings=8 {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/core

# Run ESLint for the license-collector library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-license-collector fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/license-collector

# Run ESLint for the priority-queue library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-priority-queue fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/priority-queue

# Run ESLint for the Prettier config library with its existing file extensions and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-prettier-config fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} --max-warnings=0 --no-error-on-unmatched-pattern {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/prettier-config

# Run ESLint for the React UI kit library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-react-ui-kit fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=7 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/react-ui-kit

# Run ESLint for the store-engine library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-store-engine fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/store-engine

# Run ESLint for the Dexie store-engine library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-store-engine-dexie fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/store-engine-dexie

# Run ESLint for the filesystem store-engine library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-store-engine-fs fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/store-engine-fs

# Run ESLint for the telemetry library with its existing file extensions and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-telemetry fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.mts libraries/telemetry

# Run ESLint for the webapp-events library with its existing warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-library-webapp-events fix="false":
    mkdir -p target/eslint && eslint --config eslint.config.mjs --max-warnings=0 --cache --cache-strategy content --cache-location target/eslint/{{recipe_name()}}-{{fix}} {{if fix == "true" { "--fix" } else { "" }}} --ext .js,.jsx,.ts,.tsx,.cjs,.mjs libraries/webapp-events

# Run ESLint for the 16 libraries with each library's existing file coverage and warning limit.
[group('lint')]
[arg("fix", long, value="true")]
eslint-libraries fix="false": \
    (eslint-library-api-client fix) \
    (eslint-library-bazinga64 fix) \
    (eslint-library-certificate-check fix) \
    (eslint-library-commons fix) \
    (eslint-library-config fix) \
    (eslint-library-copy-config fix) \
    (eslint-library-core fix) \
    (eslint-library-license-collector fix) \
    (eslint-library-prettier-config fix) \
    (eslint-library-priority-queue fix) \
    (eslint-library-react-ui-kit fix) \
    (eslint-library-store-engine fix) \
    (eslint-library-store-engine-dexie fix) \
    (eslint-library-store-engine-fs fix) \
    (eslint-library-telemetry fix) \
    (eslint-library-webapp-events fix)

# Run ESLint for workspace tools, apps, and libraries.
[group('lint')]
[arg("fix", long, value="true")]
eslint-all fix="false": \
    (eslint-workspace-tools fix) \
    (eslint-server fix) \
    (eslint-webapp fix) \
    (eslint-libraries fix)

# Run ESLint for all projects and automatically fix eligible issues.
[group('lint')]
eslint-fix: (eslint-all "true")

# Run all repository lint checks, including ESLint, Prettier, Stylelint, and duplication.
[group('lint')]
lint: eslint-all format-check stylesheet-lint lint-duplication

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

# Run the repository-owned tooling tests.
[group('tooling')]
tooling-test:
    jest --config ./tools/jest.config.js --cacheDirectory target/jest/cache
