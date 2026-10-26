set default-list := true
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
[group('lint')]
[arg("fix", long, value="true")]
eslint fix="false":
    eslint . --config eslint.config.mjs --max-warnings=287 --cache --cache-strategy content --cache-location ./target/eslintcache {{if fix == "true" { "--fix" } else { "" }}}

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

# Run the repository-owned tooling tests.
[group('tooling')]
tooling-test:
    jest --config ./tools/jest.config.js --cacheDirectory target/jest/cache
