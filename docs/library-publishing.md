# Library Publishing Guide

This guide describes the two-step GitHub Actions release flow for the libraries published from this repository. The publication target is the [GitHub Packages npm registry](https://npm.pkg.github.com), not npmjs.com.

## Quick Links

| Workflow | Purpose | Link |
|----------|---------|------|
| **Create Library Release PR** | Versions release-set packages and opens a release PR | [Run workflow](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries.yml) |
| **Publish packages to GitHub Packages** | Publishes after the release PR is squash-merged | [View runs](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries-on-merge.yml) |

## Published Libraries and Runtime Dependencies

Nx Release selects projects with the `npm:public` tag and versions them independently. The release set is deliberately limited to the packages required for a consumer to install `@wireapp/api-client`:

| Library | Package | Why it is published |
|---------|---------|---------------------|
| `libraries/api-client` | `@wireapp/api-client` | Consumer-facing API client |
| `libraries/commons` | `@wireapp/commons` | Runtime dependency of `@wireapp/api-client` |
| `libraries/priority-queue` | `@wireapp/priority-queue` | Runtime dependency of `@wireapp/api-client` |

`@wireapp/api-client` packs its own `lib` directory, but its built code retains `@wireapp/commons` and `@wireapp/priority-queue` as external runtime dependencies. They must therefore be published alongside it. Nx rewrites their `workspace:` dependency ranges to ordinary version ranges during release (`preserveLocalDependencyProtocols: false`).

`@wireapp/protocol-messaging` is also a runtime dependency of `@wireapp/api-client`, but it is owned by another repository. It is an external prerequisite: the exact version declared in `libraries/api-client/package.json` must already be available from GitHub Packages and this repository's workflow must have package read access. The publish workflow reads that dependency version directly and checks that exact package version before it publishes, so it fails with an actionable error instead of publishing an uninstallable API client.

Do not add every `type:lib` project to the release set. A library belongs there only when it is intended for consumers or is a required external runtime dependency of a published library.

## Release Flow

The process is two steps, preserving review before publication.

### 1. Create the release PR

Manually run [Create Library Release PR](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries.yml) from `dev`. It:

1. Creates `chore/library-release-<run_id>` from `dev`.
2. Installs dependencies from the normal npmjs.com registry and lints, tests, and builds all libraries.
3. Runs `./bin/yarn nx release version` to apply conventional-commit version bumps, create the release commit, and create one tag per independently versioned package.
4. Pushes the branch and tags, then opens a PR labelled `publish-to-npm`. The label remains an internal compatibility marker; GitHub Packages is still an npm registry.

If no package needs a version bump, the workflow does not open a PR.

### 2. Squash-merge and publish

Review the version and changelog changes, then **squash-merge** the generated release PR into `dev`. The generated PR explicitly requests a squash merge.

The publish workflow checks out the exact merge commit, retargets the release tags from the release-PR head to that squash merge commit, installs and builds with normal npmjs.com dependency resolution, and only then configures GitHub Packages for publication. It runs `./bin/yarn nx release publish --verbose` against `https://npm.pkg.github.com`.

The tag retargeting is why squash merging is the supported strategy. Do not change the merge or tag strategy as part of a package-registry change.

## GitHub Actions Authentication

The publish workflow uses only the built-in `GITHUB_TOKEN`:

```yaml
permissions:
  contents: write
  packages: write
```

Immediately before publication, `actions/setup-node` configures the npm registry configuration used by Nx. It writes the GitHub Packages registry and token placeholder needed by `npm view` and `npm publish`; `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` supplies the short-lived token at runtime, and `GITHUB_TOKEN` remains available for Nx's GitHub release work. The external-dependency preflight reads the exact `@wireapp/protocol-messaging` version from `libraries/api-client/package.json` and checks it with `npm view`. The initial Node setup and `./bin/yarn --immutable` deliberately remain free of GitHub Packages scope routing, so existing `@wireapp/*` dependencies continue to resolve from npmjs.com during this repository's dependency installation.

This flow does not use npm trusted publishing, OIDC (`id-token: write`), npm provenance configuration, an npm token, or an organization publishing secret. Remove the npmjs.com trusted-publisher configuration for this workflow after the migration is in use.

## Package Access after First Publication

The npm registry supports package-level visibility and access settings. After the first publication of each package, a Wire organization/package administrator must:

1. Confirm the package is linked to `wireapp/wire-webapp`. The package manifests include repository metadata for this association.
2. Set the intended visibility (private, internal, or public) and review whether permissions should inherit from the source repository.
3. Under **Package settings → Manage Actions access**, grant the required repositories access. The publishing repository needs write access; consumer workflow repositories need read access.

These settings are required in addition to the workflow's `packages: write` permission.

## Installing from GitHub Packages

GitHub Packages' npm registry requires authentication for installation, including public npm packages. Configure the `@wireapp` scope in a user-level or project-local untracked `.yarnrc.yml`; do not add this mapping or any token to this repository's root configuration.

For local use, set `GITHUB_PACKAGES_TOKEN` to a GitHub personal access token (classic) that has `read:packages` and whose user can read the package. Keep the token outside version control:

```yaml
# .yarnrc.yml (untracked)
npmScopes:
  wireapp:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAuthToken: "${GITHUB_PACKAGES_TOKEN}"
```

```bash
yarn add @wireapp/api-client
```

When another GitHub Actions repository needs the package, grant that repository read access in the package settings, then use its built-in token:

```yaml
# .yarnrc.yml in the consumer repository
npmScopes:
  wireapp:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAuthToken: "${YARN_NPM_AUTH_TOKEN}"
```

```yaml
permissions:
  contents: read
  packages: read

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: 'yarn'
  - run: ./bin/yarn --immutable
    env:
      YARN_NPM_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Its `GITHUB_TOKEN` works only after that repository has been granted package read access. A local token or a token from an unrelated repository does not bypass package access controls.

## Local Validation and Manual Publishing

Preview a release without publishing:

```bash
./bin/yarn release:dry-run
```

Yarn's `npmScopes` configuration above is sufficient for installation, but it is not sufficient for this repository's manual publication path: Nx's `@nx/js:release-publish` executor invokes `npm publish`. For an emergency/manual publication only, provide a GitHub token with `write:packages` through `NODE_AUTH_TOKEN` and point npm at a temporary configuration file. The token is never printed or committed, `NPM_CONFIG_USERCONFIG` leaves the user's normal npm configuration untouched, and npm resolves the literal `${NODE_AUTH_TOKEN}` in this temporary file at runtime:

```bash
set -euo pipefail

export NODE_AUTH_TOKEN="<GitHub token with write:packages>"

NPM_CONFIG_USERCONFIG="$(mktemp)"
export NPM_CONFIG_USERCONFIG

cleanup() {
  rm -f "$NPM_CONFIG_USERCONFIG"
}

trap cleanup EXIT

cat > "$NPM_CONFIG_USERCONFIG" <<'EOF'
@wireapp:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
EOF

./bin/yarn nx run-many -t build --projects=tag:type:lib
./bin/yarn nx release publish
```

The account represented by the token must have permission to publish every package in the release set. This is an emergency/manual path; normal GitHub Actions publication continues to use the repository's `GITHUB_TOKEN`.

Every published package has `publishConfig.registry` set to `https://npm.pkg.github.com`; that package-level setting is the authoritative safeguard against an accidental npmjs.com publication.

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| No release PR | No release-set package has a conventional-commit version bump. Run `./bin/yarn release:dry-run`. |
| Publish fails before publishing | Make the exact `@wireapp/protocol-messaging` version declared by `@wireapp/api-client` available from GitHub Packages and grant this repository's workflow read access. |
| Publish fails with 403 | Confirm the workflow has `packages: write`, the package is associated with `wireapp/wire-webapp`, and its Actions access settings permit the workflow. |
| Consumer install fails with 401 or 403 | Configure the `@wireapp` registry mapping, authenticate, and verify package/read access. |
| Release tags are missing | The release PR must be squash-merged so the workflow can retarget its tags to the merge commit. |

## References

- [Nx Release documentation](https://nx.dev/recipes/nx-release)
- [GitHub Packages npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub Actions package publishing and installation](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)
