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

import {isNonEmptyArray} from '@sindresorhus/is';
import {Result} from 'true-myth';

export type PullRequestReleaseImpact = 'major' | 'minor' | 'patch' | 'none';

// These describe released-product impact; none is deliberately not a version increment.
export const pullRequestReleaseImpactLabels = {
  // Breaks the documented WebApp compatibility contract.
  major: 'semver:major',
  // Adds backward-compatible product functionality.
  minor: 'semver:minor',
  // Changes the released product without new functionality (fixes, security, dependencies).
  patch: 'semver:patch',
  // Does not affect the product version (bookkeeping, CI/tooling, documentation, tests).
  none: 'semver:none',
} as const satisfies Readonly<Record<PullRequestReleaseImpact, string>>;

export type ValidatePullRequestReleaseImpactOptions = {
  readonly targetBranch: string;
  readonly labels: readonly string[];
};

const pullRequestReleaseImpacts: readonly PullRequestReleaseImpact[] = ['major', 'minor', 'patch', 'none'];
const supportedLabelsDiagnostic = Object.values(pullRequestReleaseImpactLabels).join(', ');

export function resolvePullRequestReleaseImpact(labels: readonly string[]): Result<PullRequestReleaseImpact, Error> {
  const matchingImpacts = pullRequestReleaseImpacts.flatMap(impact => {
    return labels
      .filter(label => {
        return label === pullRequestReleaseImpactLabels[impact];
      })
      .map(() => {
        return impact;
      });
  });

  if (!isNonEmptyArray(matchingImpacts)) {
    return Result.err(
      new Error(`Pull request has no release-impact label. Apply exactly one of: ${supportedLabelsDiagnostic}`),
    );
  }

  const [releaseImpact, ...remainingImpacts] = matchingImpacts;

  if (isNonEmptyArray(remainingImpacts)) {
    const matchingLabels = matchingImpacts.map(impact => {
      return pullRequestReleaseImpactLabels[impact];
    });

    return Result.err(
      new Error(
        `Pull request has conflicting release-impact labels: ${matchingLabels.join(', ')}. Apply exactly one of: ${supportedLabelsDiagnostic}`,
      ),
    );
  }

  return Result.ok(releaseImpact);
}

export function validatePullRequestReleaseImpact(
  options: ValidatePullRequestReleaseImpactOptions,
): Result<PullRequestReleaseImpact, Error> {
  const {targetBranch, labels} = options;
  const isPatchOnlyTarget = /^(?:release|maintenance)\/[^/]+$/.test(targetBranch);

  if (targetBranch !== 'main' && !isPatchOnlyTarget) {
    return Result.err(
      new Error(
        `Unsupported pull request target branch: ${targetBranch}. Expected main, release/*, or maintenance/*. Supported release-impact labels: ${supportedLabelsDiagnostic}`,
      ),
    );
  }

  return resolvePullRequestReleaseImpact(labels).match({
    Err(error) {
      return Result.err(new Error(`Target branch ${targetBranch}: ${error.message}`));
    },
    Ok(releaseImpact) {
      if (isPatchOnlyTarget && (releaseImpact === 'major' || releaseImpact === 'minor')) {
        return Result.err(
          new Error(
            `Pull request targeting ${targetBranch} cannot use ${pullRequestReleaseImpactLabels[releaseImpact]}. Release candidates and maintenance lines allow only ${pullRequestReleaseImpactLabels.patch} or ${pullRequestReleaseImpactLabels.none}; new functionality and breaking changes must target main.`,
          ),
        );
      }

      return Result.ok(releaseImpact);
    },
  });
}
