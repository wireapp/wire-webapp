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

import {Result, Task} from 'true-myth';

import {validatePullRequestSemverPolicy} from './pullRequestReleaseImpact.ts';
import type {PullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
import type {ReadWebAppReleaseHistoryOptions, WebAppReleaseHistory} from './webappReleaseHistoryGit.ts';
import type {
  WebAppReleasePlanningGitHubClient,
  WebAppReleasePlanningPullRequest,
} from './webappReleasePlanningGitHubClient.ts';
import {resolveNextWebAppReleaseVersion, resolveWebAppVersionBump} from './webappReleaseVersion.ts';
import type {WebAppVersion, WebAppVersionBump} from './webappVersion.ts';
import {validateWebAppVersion} from './webappVersion.ts';

export type WebAppReleasePullRequest = {
  readonly number: number;
  readonly title: string;
  readonly releaseImpact: PullRequestReleaseImpact;
};

export type WebAppReleasePlan = {
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly currentVersion: WebAppVersion;
  readonly versionBump: WebAppVersionBump;
  readonly nextVersion: WebAppVersion;
  readonly pullRequests: readonly WebAppReleasePullRequest[];
};

export type ReadFirstParentHistory = (options: ReadWebAppReleaseHistoryOptions) => Task<WebAppReleaseHistory, Error>;

export type WebAppReleasePlanDependencies = {
  readonly readFirstParentHistory: ReadFirstParentHistory;
  readonly listPullRequestsForCommit: WebAppReleasePlanningGitHubClient['listPullRequestsForCommit'];
};

export type PlanWebAppReleaseOptions = {
  readonly currentVersion: string;
  readonly baseCommit: string;
  readonly targetCommit: string;
};

export type PlanWebAppReleaseDependencies = WebAppReleasePlanDependencies;

export type DiscoverWebAppReleasePullRequestsOptions = {
  readonly commits: readonly string[];
};

export type DiscoverWebAppReleasePullRequestsDependencies = {
  readonly listPullRequestsForCommit: WebAppReleasePlanningGitHubClient['listPullRequestsForCommit'];
};

type PullRequestReleaseImpactRecord = {
  readonly pullRequest: WebAppReleasePlanningPullRequest;
  readonly releaseImpact: PullRequestReleaseImpact;
};

type DiscoverPullRequestsForCommitsOptions = {
  readonly commitIndex: number;
  readonly commits: readonly string[];
  readonly discoveredPullRequests: readonly WebAppReleasePlanningPullRequest[];
  readonly discoveredPullRequestNumbers: ReadonlySet<number>;
};

type SelectPullRequestForCommitOptions = {
  readonly commitSha: string;
  readonly associatedPullRequests: readonly WebAppReleasePlanningPullRequest[];
};

function isIntermediateTargetBranch(targetBranch: string): boolean {
  return targetBranch !== 'main' && /^(?:release|maintenance)\/[^/]+$/.test(targetBranch) === false;
}

function selectPullRequestForCommit(
  options: SelectPullRequestForCommitOptions,
): Result<WebAppReleasePlanningPullRequest, Error> {
  const {commitSha, associatedPullRequests} = options;
  const mergedPullRequests = [
    ...new Map(
      associatedPullRequests
        .filter(pullRequest => {
          return pullRequest.mergedAt.isJust;
        })
        .map(pullRequest => {
          return [pullRequest.number, pullRequest] as const;
        }),
    ).values(),
  ];
  const mergedMainPullRequests = mergedPullRequests.filter(pullRequest => {
    return pullRequest.baseBranch === 'main';
  });

  if (mergedMainPullRequests.length > 1) {
    const pullRequestNumbers = mergedMainPullRequests
      .map(pullRequest => {
        return `#${pullRequest.number}`;
      })
      .join(', ');

    return Result.err(
      new Error(
        `More than one merged pull request targeting main is associated with commit ${commitSha}: ${pullRequestNumbers}`,
      ),
    );
  }

  const matchingMainPullRequest = mergedMainPullRequests.at(0);
  if (matchingMainPullRequest !== undefined) {
    return Result.ok(matchingMainPullRequest);
  }

  const mergedIntermediatePullRequests = mergedPullRequests.filter(pullRequest => {
    return isIntermediateTargetBranch(pullRequest.baseBranch);
  });
  const attributableIntermediatePullRequests = mergedIntermediatePullRequests.filter(pullRequest => {
    return (
      pullRequest.mergeCommitSha.isJust && pullRequest.mergeCommitSha.value.toLowerCase() === commitSha.toLowerCase()
    );
  });

  if (attributableIntermediatePullRequests.length > 1) {
    const pullRequestNumbers = attributableIntermediatePullRequests
      .map(pullRequest => {
        return `#${pullRequest.number}`;
      })
      .join(', ');

    return Result.err(
      new Error(
        `More than one merged pull request targeting an intermediate branch has merge commit ${commitSha}: ${pullRequestNumbers}`,
      ),
    );
  }

  const attributablePullRequest = attributableIntermediatePullRequests.at(0);
  if (attributablePullRequest !== undefined) {
    return Result.ok(attributablePullRequest);
  }

  const associatedPullRequestDetails = mergedIntermediatePullRequests
    .map(pullRequest => {
      const mergeCommit = pullRequest.mergeCommitSha.isJust
        ? pullRequest.mergeCommitSha.value
        : 'missing merge commit SHA';

      return `#${pullRequest.number} (${pullRequest.baseBranch}, ${mergeCommit})`;
    })
    .join(', ');
  const associationDetails =
    associatedPullRequestDetails.length > 0
      ? `; merged intermediate-branch associations: ${associatedPullRequestDetails}`
      : '';

  return Result.err(
    new Error(
      `No merged pull request targeting main or a uniquely attributable intermediate branch is associated with commit ${commitSha}${associationDetails}`,
    ),
  );
}

function discoverPullRequestsForCommits(
  options: DiscoverPullRequestsForCommitsOptions,
  dependencies: DiscoverWebAppReleasePullRequestsDependencies,
): Task<readonly WebAppReleasePlanningPullRequest[], Error> {
  const commitSha = options.commits.at(options.commitIndex);
  if (commitSha === undefined) {
    return Task.resolve(options.discoveredPullRequests);
  }

  return dependencies
    .listPullRequestsForCommit({commitSha})
    .mapRejected(error => {
      return new Error(`Unable to discover pull requests for commit ${commitSha}: ${error.message}`, {cause: error});
    })
    .andThen(associatedPullRequests => {
      const selectedPullRequestResult = selectPullRequestForCommit({commitSha, associatedPullRequests});
      if (selectedPullRequestResult.isErr) {
        return Task.reject<readonly WebAppReleasePlanningPullRequest[], Error>(selectedPullRequestResult.error);
      }

      const matchingPullRequest = selectedPullRequestResult.value;
      const discoveredPullRequests = options.discoveredPullRequestNumbers.has(matchingPullRequest.number)
        ? options.discoveredPullRequests
        : [...options.discoveredPullRequests, matchingPullRequest];
      const discoveredPullRequestNumbers = new Set(options.discoveredPullRequestNumbers);
      discoveredPullRequestNumbers.add(matchingPullRequest.number);

      return discoverPullRequestsForCommits(
        {
          commitIndex: options.commitIndex + 1,
          commits: options.commits,
          discoveredPullRequests,
          discoveredPullRequestNumbers,
        },
        dependencies,
      );
    });
}

export function discoverWebAppReleasePullRequests(
  options: DiscoverWebAppReleasePullRequestsOptions,
  dependencies: DiscoverWebAppReleasePullRequestsDependencies,
): Task<readonly WebAppReleasePlanningPullRequest[], Error> {
  return discoverPullRequestsForCommits(
    {
      commitIndex: 0,
      commits: options.commits,
      discoveredPullRequests: [],
      discoveredPullRequestNumbers: new Set(),
    },
    dependencies,
  );
}

function validatePullRequestImpacts(
  pullRequests: readonly WebAppReleasePlanningPullRequest[],
): Result<readonly PullRequestReleaseImpactRecord[], Error> {
  return pullRequests.reduce((pullRequestImpactsResult, pullRequest) => {
    return pullRequestImpactsResult.andThen(pullRequestImpacts => {
      const releaseImpactResult = validatePullRequestSemverPolicy({
        targetBranch: pullRequest.baseBranch,
        labels: pullRequest.labels,
      });

      if (releaseImpactResult.isErr) {
        return Result.err(
          new Error(
            `Pull request #${pullRequest.number} has invalid release impact: ${releaseImpactResult.error.message}`,
            {cause: releaseImpactResult.error},
          ),
        );
      }

      return Result.ok([...pullRequestImpacts, {pullRequest, releaseImpact: releaseImpactResult.value}]);
    });
  }, Result.ok<readonly PullRequestReleaseImpactRecord[], Error>([]));
}

function createReleasePlanPullRequests(
  pullRequestImpacts: readonly PullRequestReleaseImpactRecord[],
): readonly WebAppReleasePullRequest[] {
  return pullRequestImpacts.map(pullRequestImpact => {
    return {
      number: pullRequestImpact.pullRequest.number,
      title: pullRequestImpact.pullRequest.title,
      releaseImpact: pullRequestImpact.releaseImpact,
    };
  });
}

export function planWebAppRelease(
  options: PlanWebAppReleaseOptions,
  dependencies: PlanWebAppReleaseDependencies,
): Task<WebAppReleasePlan, Error> {
  const {currentVersion, baseCommit, targetCommit} = options;
  const currentVersionResult = validateWebAppVersion(currentVersion);
  if (currentVersionResult.isErr) {
    return Task.reject(currentVersionResult.error);
  }

  return dependencies.readFirstParentHistory({baseCommit, targetCommit}).andThen(history => {
    return discoverWebAppReleasePullRequests(
      {commits: history.commits},
      {listPullRequestsForCommit: dependencies.listPullRequestsForCommit},
    ).andThen(pullRequests => {
      const pullRequestImpactsResult = validatePullRequestImpacts(pullRequests);
      if (pullRequestImpactsResult.isErr) {
        return Task.reject<WebAppReleasePlan, Error>(pullRequestImpactsResult.error);
      }

      const pullRequestImpacts = pullRequestImpactsResult.value;
      const releaseImpacts = pullRequestImpacts.map(pullRequestImpact => {
        return pullRequestImpact.releaseImpact;
      });
      const versionBumpResult = resolveWebAppVersionBump(releaseImpacts);
      if (versionBumpResult.isErr) {
        return Task.reject<WebAppReleasePlan, Error>(versionBumpResult.error);
      }

      const nextVersionResult = resolveNextWebAppReleaseVersion(currentVersionResult.value, releaseImpacts);
      if (nextVersionResult.isErr) {
        return Task.reject<WebAppReleasePlan, Error>(nextVersionResult.error);
      }

      return Task.resolve({
        baseCommit: history.baseCommit,
        targetCommit: history.targetCommit,
        currentVersion: currentVersionResult.value,
        versionBump: versionBumpResult.value,
        nextVersion: nextVersionResult.value,
        pullRequests: createReleasePlanPullRequests(pullRequestImpacts),
      });
    });
  });
}
