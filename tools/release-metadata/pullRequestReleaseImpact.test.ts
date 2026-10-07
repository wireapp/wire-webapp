/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import assert from 'node:assert';

import {resolvePullRequestReleaseImpact, validatePullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
import type {PullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';

const releaseImpactCases: readonly {readonly label: string; readonly impact: PullRequestReleaseImpact}[] = [
  {label: 'semver:major', impact: 'major'},
  {label: 'semver:minor', impact: 'minor'},
  {label: 'semver:patch', impact: 'patch'},
  {label: 'semver:none', impact: 'none'},
];
const supportedLabelNames = ['semver:major', 'semver:minor', 'semver:patch', 'semver:none'];

describe('pull request release-impact resolution', () => {
  it.each(releaseImpactCases)('resolves $label to $impact', options => {
    const actualResult = resolvePullRequestReleaseImpact([options.label]);

    assert(actualResult.isOk);
    expect(actualResult.value).toBe(options.impact);
  });

  it.each(releaseImpactCases)('ignores unrelated labels alongside $label', options => {
    const actualResult = resolvePullRequestReleaseImpact([
      'bug',
      'feature',
      'documentation',
      'run-e2e',
      'major',
      'minor',
      'patch',
      options.label,
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toBe(options.impact);
  });

  it.each([
    {labels: []},
    {labels: ['bug']},
    {labels: ['major', 'minor', 'patch']},
    {labels: ['semver:unknown']},
    {labels: ['Semver:patch']},
  ])('rejects missing supported labels in $labels', options => {
    const actualResult = resolvePullRequestReleaseImpact(options.labels);

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('no release-impact label');
    for (const label of supportedLabelNames) {
      expect(actualResult.error.message).toContain(label);
    }
  });

  it.each([
    {labels: ['semver:patch', 'semver:minor']},
    {labels: ['semver:major', 'semver:minor', 'semver:patch', 'semver:none']},
    {labels: ['semver:none', 'semver:patch']},
    {labels: ['semver:patch', 'semver:patch']},
  ])('rejects conflicting release-impact labels in $labels', options => {
    const actualResult = resolvePullRequestReleaseImpact(options.labels);

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('conflicting release-impact labels');
    for (const label of supportedLabelNames) {
      expect(actualResult.error.message).toContain(label);
    }
  });
});

describe('pull request target-branch release-impact policy', () => {
  it.each(releaseImpactCases)('accepts $label targeting main', options => {
    const actualResult = validatePullRequestReleaseImpact({targetBranch: 'main', labels: [options.label]});

    assert(actualResult.isOk);
    expect(actualResult.value).toBe(options.impact);
  });

  describe.each(['release/2026-10-06.1', 'maintenance/2026-07-27.1-airgap-a'])('%s', targetBranch => {
    it.each([
      {label: 'semver:patch', impact: 'patch'},
      {label: 'semver:none', impact: 'none'},
    ])('accepts $label', options => {
      const actualResult = validatePullRequestReleaseImpact({targetBranch, labels: ['renovate', options.label]});

      assert(actualResult.isOk);
      expect(actualResult.value).toBe(options.impact);
    });

    it.each(['semver:major', 'semver:minor'])('rejects %s', label => {
      const actualResult = validatePullRequestReleaseImpact({targetBranch, labels: [label]});

      assert(actualResult.isErr);
      expect(actualResult.error.message).toContain(targetBranch);
      expect(actualResult.error.message).toContain(label);
      expect(actualResult.error.message).toContain('allow only semver:patch or semver:none');
    });
  });

  it.each(['main', 'release/2026-10-06.1', 'maintenance/2026-07-27.1-airgap-a'])(
    'requires exactly one label targeting %s',
    targetBranch => {
      for (const labels of [[], ['semver:patch', 'semver:none']]) {
        const actualResult = validatePullRequestReleaseImpact({targetBranch, labels});

        assert(actualResult.isErr);
        expect(actualResult.error.message).toContain(targetBranch);
        expect(actualResult.error.message).toContain('exactly one');
      }
    },
  );

  it.each([
    '',
    'develop',
    'feature/example',
    'main/example',
    'release',
    'release/',
    'maintenance',
    'maintenance/',
    'release/example/nested',
    'maintenance/example/nested',
  ])('rejects unsupported target %s explicitly', targetBranch => {
    const actualResult = validatePullRequestReleaseImpact({targetBranch, labels: ['semver:patch']});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Unsupported pull request target branch');
    expect(actualResult.error.message).toContain('main, release/*, or maintenance/*');
  });
});
