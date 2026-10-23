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
