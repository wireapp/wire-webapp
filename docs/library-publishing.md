# Library Publishing Guide

This guide explains how to publish Wire monorepo libraries to npm using the two-step GitHub Actions workflow.

## Quick Links

| Workflow | Purpose | Link |
|----------|---------|------|
| **Create Library Release PR** | Bumps versions and opens a release PR | [Run workflow](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries.yml) |
| **Publish packages to npm** | Publishes to npm when the release PR is merged | [View runs](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries-on-merge.yml) |

---

## Which Libraries Get Published?

Only libraries tagged `npm:public` in their `project.json` are versioned and published by `nx release`. Currently that is:

| Library | npm Package | Tag |
|---------|-------------|-----|
| `libraries/api-client` | `@wireapp/api-client` | `npm:public` |

Other libraries (`core`, `config`) have `type:lib` but **not** `npm:public`, so they are linted, tested, and built by the release workflow but are **not** versioned or published.

> **To add a new library to the publish set**, add the `npm:public` tag to its `project.json` tags array and configure a trusted publisher on npmjs.com (see [NPM Trusted Publishing](#npm-trusted-publishing-setup) below).

---

## How It Works

The release process is a **two-step workflow** triggered manually and gated by a PR review.

### Step 1 — Create the Release PR

Trigger: **Manual** (`workflow_dispatch`) from the [Create Library Release PR](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries.yml) action page.

What it does:

1. Checks out `dev` and creates a release branch (`chore/library-release-<run_id>`).
2. Installs dependencies (`yarn --immutable`).
3. Lints, tests, and builds **all** libraries (`tag:type:lib`).
4. Runs `nx release version` which:
   - Reads conventional commits since the last release tag.
   - Bumps versions in `package.json` for each `npm:public` library.
   - Creates a git commit and tag per version bump.
5. Pushes the branch with tags and opens a PR to `dev` with the **`publish-to-npm`** label.

If no version changes are detected the workflow exits without creating a PR.

### Step 2 — Publish on Merge

Trigger: **Automatic** when a PR with the `publish-to-npm` label is merged to `dev` (or via `workflow_dispatch` from the [Publish packages to npm](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries-on-merge.yml) action page).

What it does:

1. Checks out the **exact merge commit** (to avoid publishing unrelated changes).
2. Installs dependencies and builds all libraries (`tag:type:lib`).
3. Runs `nx release publish` which publishes every `npm:public` library to npm with provenance.

---

## Step-by-Step Guide

### 1. Write Your Changes with Conventional Commits

Merge your library changes to `dev` using conventional commit messages so that `nx release` can determine the correct version bump:

```bash
git commit -m "feat(api-client): add new endpoint"   # → minor bump
git commit -m "fix(api-client): handle timeout"       # → patch bump
git commit -m "feat(api-client)!: drop legacy auth"   # → major bump
```

### 2. Trigger the Release PR

1. Open the [**Create Library Release PR**](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries.yml) workflow page.
2. Click **Run workflow** (branch: `dev`).
3. Wait for the workflow to complete — it will open a PR automatically.

### 3. Review the PR

- Verify the version bumps match what you expect.
- Check the generated changelog entries.

### 4. Merge the PR

> **⚠️ Important:** Use **"Merge commit"** — do **NOT** squash merge. Squash merging destroys the git tags that `nx release` created, and the publish step will fail.

### 5. Confirm the Publish

After merging, the [publish workflow](https://github.com/wireapp/wire-webapp/actions/workflows/publish-libraries-on-merge.yml) runs automatically. Check its output to confirm the packages were published successfully.

---

## Conventional Commit Reference

| Prefix | Version Bump | Example |
|--------|-------------|---------|
| `feat:` | Minor (0.**X**.0) | `feat(api-client): add cells support` |
| `fix:` | Patch (0.0.**X**) | `fix(api-client): resolve retry logic` |
| `feat!:` / `BREAKING CHANGE:` | Major (**X**.0.0) | `feat(api-client)!: remove deprecated methods` |
| `chore:`, `docs:`, `refactor:` | None | `chore: update dev dependencies` |

Only commits scoped to a published library (or unscoped commits touching its files) trigger a version bump for that library.

---

## Local Testing (Dry Run)

Preview what a release would do without publishing:

```bash
# Full dry run (version + publish simulation)
yarn release:dry-run

# Version only (no publish)
yarn release:version

# Publish already-versioned packages
yarn release:publish
```

---

## Configuration

### Nx Release Config (`nx.json`)

```jsonc
{
  "release": {
    "projects": ["tag:npm:public"],          // only npm:public libraries
    "projectsRelationship": "independent",   // each library versioned separately
    "version": {
      "conventionalCommits": true,
      "fallbackCurrentVersionResolver": "disk",
      "git": {
        "commit": true,
        "tag": true,
        "commitMessage": "chore(release): publish {projectName} {version} [WPB-22420]"
      }
    },
    "changelog": {
      "projectChangelogs": {
        "createRelease": "github"            // creates a GitHub release per version
      }
    }
  }
}
```

---

## NPM Trusted Publishing Setup

The publish workflow uses **OIDC-based trusted publishing** — no long-lived npm tokens are stored as secrets.

### How It Works

GitHub Actions mints a short-lived OIDC token during the workflow run. npm verifies the token against the trusted publisher configuration on the package, confirming the publish originated from the expected repository and workflow. The `NPM_CONFIG_PROVENANCE` flag attaches a cryptographic provenance attestation to the published package.

### Required Workflow Permissions

```yaml
permissions:
  id-token: write   # OIDC token for npm provenance
  contents: write   # push tags and commits
```

### NPM Package Configuration

For each `npm:public` package on [npmjs.com](https://www.npmjs.com/):

1. Go to **Settings → Publishing access → Configure trusted publishers**.
2. Add a trusted publisher:
   - **Repository**: `wireapp/wire-webapp`
   - **Workflow**: `publish-libraries-on-merge.yml`

---

## Troubleshooting

| Problem | What to Check |
|---------|---------------|
| **Version not incrementing** | Verify commits use conventional commit format. Run `yarn release:dry-run` locally. |
| **Release PR not created** | No new conventional commits since the last release tag — nothing to bump. |
| **Publish fails with 403** | The npm package may not have a trusted publisher configured for `wireapp/wire-webapp` + `publish-libraries-on-merge.yml`. |
| **Publish fails with missing tags** | The PR was squash-merged instead of merge-committed. Re-tag manually or re-run the release PR workflow. |
| **Want to skip a release** | Don't trigger the workflow, or close the release PR without merging. |

### Manual Release (Emergency)

If automation fails and you need to publish immediately:

```bash
# 1. Bump the version
cd libraries/api-client
npm version patch  # or minor / major

# 2. Build
yarn nx build api-client-lib

# 3. Publish with provenance
npm publish --provenance --access public
```

---

## References

- [Nx Release Documentation](https://nx.dev/recipes/nx-release)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
