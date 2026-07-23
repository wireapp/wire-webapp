# Validate release appearance comments without a release

The release appearance implementation has three validation levels. None of these creates a Beta or Production deployment, moves a release tag, publishes an image or chart, updates `wire-builds`, or triggers `Release WebApp`.

## Automated tests

Run the focused workspace-tools suite through Nx:

```bash
./bin/yarn nx run workspace-tools:test -- --runInBand \
  bin/releaseAppearance.test.ts \
  bin/releaseAppearanceCli.test.ts \
  bin/releaseAppearanceGit.integration.test.ts
```

The range integration tests create temporary local Git repositories, use fixed commit metadata, create annotated tags, and invoke real Git commands. GitHub access remains behind the injected client used by the orchestration tests.

## Historical dry run

Run **⚠️ TEST ONLY — Release appearance comments (NO DEPLOYMENT)** from the Actions tab with `test_mode: dry-run`.

Select an existing immutable Beta or Production tag. Leave `release_commit_sha`, `baseline_tag`, and `pull_request_number` empty unless a specific historical commit or baseline override is required. If a release commit is supplied, it must be the exact commit resolved from the deployment tag. A baseline override must be an existing valid tag with a reachable merge-base; an unrelated tag is rejected.

The dry-run job fetches complete history and tags, resolves the normal or explicit baseline, discovers the historical merged pull requests, reads their paginated comments, computes the exact machine-readable state and rendered Markdown, and makes no create or update API requests. Its summary includes the mode, stage, tag, commit, baseline, merge base, revision range, inspected commits, discovered pull requests, proposed creates, proposed updates, unchanged comments, commits without pull requests, failures, and reason.

An empty change set is successful and is reported as such. A successful dry run proves the range, discovery, state, and GitHub read/write decision logic, but it does not prove the dependency graph or ordering of the normal release workflow.

## Controlled single-pull-request live test

Use the same workflow with `test_mode: single-pull-request-live-test`, an existing tag for the selected stage, one existing pull request in the current repository, and `confirm_live_write: true`. The workflow rejects missing or malformed pull request numbers, mismatched tags and commits, baseline overrides, locked or unmerged pull requests, and pull requests targeting unsupported branches.

This mode skips release-range discovery and operates on exactly the selected pull request. It uses the same state parser, transition logic, Markdown renderer, GitHub client, retries, and update behavior as production, but uses the fixed implementation-owned marker `<!-- wire-webapp-release-appearance-test:v1`.

The visible comment is explicitly labeled as test data. The production marker is never used or modified by test mode. No automatic deletion is provided; remove the test comment manually after validation if desired.

Supported sequence:

1. Run with a Beta tag and the selected pull request.
2. Confirm the test comment shows the first Beta tag and `Not yet deployed`.
3. Run again with a later Beta tag and confirm the original Beta tag remains.
4. Run with a Production tag and confirm Production is added to the same test comment.
5. Run again with a later Production tag and confirm the original Production tag remains.

The next normal Beta release remains the final integration verification because it exercises the real release job dependencies, immutable tag creation, deployment gates, and non-gating comment jobs. Do not create an extra Beta solely to test this feature.
