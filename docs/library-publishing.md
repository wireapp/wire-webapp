# Library Publishing Guide

This document explains how automated publishing works for the Wire monorepo libraries.

## Overview

The monorepo uses **Nx Release** to automate versioning and publishing of libraries (like `@wireapp/api-client` and `@wireapp/core`) to npm with **Trusted Publishing** (provenance).

## How It Works

The release process is a **two-step workflow** triggered manually and gated by a PR review:

1. **Create a release PR** — Run the `Create Library Release PR` workflow from the GitHub Actions UI. It lints, tests, and builds the libraries, bumps versions using conventional commits, and opens a PR to `dev` with the `publish-to-npm` label.
2. **Publish on merge** — When the release PR is merged to `dev`, a second workflow detects the `publish-to-npm` label and publishes the built libraries to npm with provenance.

### Key Details

- Uses **conventional commits** to determine version bumps (major/minor/patch)
- Creates GitHub releases and git tags
- Publishes with **npm provenance** for supply-chain security
- The release PR must be **merge-committed** (not squash-merged) to preserve git tags

### Workflow Files

1. **`.github/workflows/publish-libraries.yml`** — Creates the release PR. Triggered manually via `workflow_dispatch`.
2. **`.github/workflows/publish-libraries-on-merge.yml`** — Publishes to npm when a PR with the `publish-to-npm` label is merged to `dev`.

### Tagged Projects

Only libraries with the `npm:public` tag in their `project.json` are published:
- `libraries/core` → `@wireapp/core`
- `libraries/api-client` → `@wireapp/api-client`

### Tagged Projects

Only libraries with the `npm:public` tag in their `project.json` are published:
- `libraries/core` → `@wireapp/core`
- `libraries/api-client` → `@wireapp/api-client`

## Configuration

### Nx Release Config (`nx.json`)

```json
{
  "release": {
    "projects": ["tag:npm:public"],
    "projectsRelationship": "independent",
    "version": {
      "conventionalCommits": true
    },
    "changelog": {
      "projectChangelogs": {
        "createRelease": "github"
      }
    }
  }
}
```

### Key Settings:
- **Independent versioning**: Each library has its own version
- **Conventional commits**: Automatically determines version bump from commit messages
- **GitHub releases**: Creates releases for each version

## Publishing Workflow

### Creating a Release

1. Merge your library changes to `dev` using conventional commit messages:
   ```bash
   git commit -m "feat: add new API method"      # → minor bump
   git commit -m "fix: resolve auth issue"       # → patch bump
   git commit -m "feat!: breaking API change"    # → major bump
   ```
2. Go to **GitHub Actions → Create Library Release PR → Run workflow**.
3. The workflow will:
   - Lint, test, and build all libraries
   - Run `nx release version` to bump versions based on conventional commits
   - Push a release branch and open a PR to `dev` with the `publish-to-npm` label
4. Review the PR — verify version bumps and changelog entries look correct.
5. **Merge the PR using a merge commit** (do NOT squash — this preserves git tags).
6. On merge, the publish workflow automatically:
   - Builds the libraries
   - Publishes to npm with provenance
   - Creates GitHub releases

### Local Testing (Dry Run)

Preview what a release would do without publishing:

```bash
# Dry run to see what would happen
yarn release:dry-run

# Create version and changelog only (no publish)
yarn release:version

# Publish already versioned packages
yarn release:publish
```

## Conventional Commit Format

Use these prefixes to control version bumps:

- `feat:` → **Minor** version bump (0.X.0)
- `fix:` → **Patch** version bump (0.0.X)
- `feat!:` or `BREAKING CHANGE:` → **Major** version bump (X.0.0)
- `chore:`, `docs:`, `refactor:` → No version bump

Examples:
```bash
git commit -m "feat(api-client): add cells support"
git commit -m "fix(core): resolve memory leak in message handling"
git commit -m "feat(api-client)!: remove deprecated auth methods"
```

## NPM Trusted Publishing Setup

The workflow uses **OIDC-based trusted publishing** for secure, keyless npm authentication — no npm tokens are stored as secrets.

### How It Works

GitHub Actions mints a short-lived OIDC token during the workflow run. npm verifies the token against the trusted publisher configuration on the package, confirming the publish originated from the expected repository and workflow. The `NPM_CONFIG_PROVENANCE` flag attaches a cryptographic provenance attestation to the published package.

### Requirements:
1. **GitHub Actions workflow** must have:
   ```yaml
   permissions:
     id-token: write  # for OIDC token / provenance
     contents: write  # for tags/commits
   ```
2. **NPM package settings** (configured per-package on npmjs.com):
   - Go to **Settings → Publishing access → Configure trusted publishers**
   - Add a trusted publisher:
     - **Repository**: `wireapp/wire-webapp`
     - **Workflow**: `publish-libraries-on-merge.yml`

### Environment Variable:
```yaml
env:
  NPM_CONFIG_PROVENANCE: true
```

This generates cryptographic proof that the package was built in GitHub Actions from your repository.

## Troubleshooting

### Version not incrementing
- Check commit messages use conventional commit format
- Run `yarn release:dry-run` to preview changes
- Ensure commits are on the `dev` branch before triggering the workflow

### Release PR not created
- The workflow skips PR creation if no version changes are detected
- Verify new conventional commits exist since the last release tag

### Publish fails
- Verify the merged PR has the `publish-to-npm` label
- Ensure the npm package has a trusted publisher configured for `wireapp/wire-webapp` and the `publish-libraries-on-merge.yml` workflow
- Check that the workflow has `id-token: write` permission
- Check npm package permissions
- Review workflow logs in GitHub Actions

### Want to skip a release
- Simply don't trigger the release workflow
- Or close the release PR without merging

## Manual Release (Emergency)

If automation fails, you can manually release:

```bash
# 1. Update version
cd libraries/api-client
npm version patch  # or minor/major

# 2. Build
yarn nx build api-client-lib

# 3. Publish (from library directory)
npm publish --provenance --access public
```

## References

- [Nx Release Documentation](https://nx.dev/recipes/nx-release)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
