# Library Publishing Guide

This document explains how automated publishing works for the Wire monorepo libraries.

## Overview

The monorepo uses **Nx Release** to automate versioning and publishing of libraries (like `@wireapp/api-client` and `@wireapp/core`) to npm with **Trusted Publishing** (provenance).

## How It Works

### Automatic Publishing

When you push changes to libraries on specific branches:

1. **`main` branch**: 
   - Automatically versions, creates tags, and publishes to npm
   - Uses conventional commits to determine version bump (major/minor/patch)
   - Creates GitHub releases
   - Publishes with npm provenance for security

2. **`dev` branch**:
   - Creates versions and changelogs but does NOT publish
   - Useful for testing the release process

### Workflow Trigger

The workflow (`.github/workflows/publish-libraries.yml`) runs when:
- Changes are pushed to `libraries/**` on `main` or `dev` branches
- Manually triggered via GitHub Actions UI

### Publishing Behavior

**Main Branch (Stable Releases)**
- Publishes to npm with the `latest` tag
- Version format: `1.0.0`, `1.1.0`, `2.0.0`
- Users install with: `npm install @wireapp/api-client`

**Dev Branch (Beta Releases)**  
- Publishes to npm with the `beta` tag
- Version format: `1.0.0-beta.0`, `1.0.0-beta.1`, `1.1.0-beta.0`
- Users install with: `npm install @wireapp/api-client@beta`
- Does not affect the `latest` tag

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

### Option 1: Automatic - Main Branch (Stable Release)

1. Make changes to a library (e.g., `libraries/api-client/`)
2. Commit with conventional commit messages:
   ```bash
   git commit -m "feat: add new API method"      # → minor bump
   git commit -m "fix: resolve auth issue"       # → patch bump
   git commit -m "feat!: breaking API change"    # → major bump
   ```
3. Push to `main`:
   ```bash
   git push origin main
   ```
4. GitHub Actions will automatically:
   - Build and test the library
   - Determine version bump from commits
   - Update `package.json` version (e.g., `1.0.0` → `1.1.0`)
   - Create CHANGELOG
   - Create git tag
   - Publish to npm with `latest` tag
   - Create GitHub release

### Option 2: Automatic - Dev Branch (Beta Release)

1. Make changes to a library and merge to `dev`
2. Push to `dev`:
   ```bash
   git push origin dev
   ```
3. GitHub Actions will automatically:
   - Build and test the library
   - Determine version bump from commits
   - Update `package.json` version with beta prerelease (e.g., `1.0.0` → `1.1.0-beta.0`)
   - Create CHANGELOG
   - Create git tag
   - Publish to npm with `beta` tag
   - Users can test with: `npm install @wireapp/api-client@beta`

### Option 3: Manual Testing

Test the release locally before pushing:

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

The workflow uses **npm provenance** for secure, keyless publishing:

### Requirements:
1. **GitHub Actions workflow** named `publish-libraries.yml` 
2. **Permissions** in workflow:
   ```yaml
   permissions:
     id-token: write  # for provenance
     contents: write  # for tags/commits
   ```
3. **NPM package settings**:
   - Enable "Require 2FA or Automation tokens" 
   - Configure trusted publisher:
     - **Workflow**: `publish-libraries.yml`
     - **Repository**: `wireapp/wire-webapp`

4. **NPM_TOKEN secret** in GitHub repository settings

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
- Ensure commits are on `main` branch

### Publish fails
- Verify `NPM_TOKEN` secret is set in GitHub
- Check npm package permissions
- Review workflow logs in GitHub Actions

### Want to skip a release
- Add `[skip ci]` to commit message
- Or manually increment version in affected `package.json` files

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
