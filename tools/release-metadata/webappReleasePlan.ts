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

import {Result} from 'true-myth';

import {validatePullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
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

export type ReadFirstParentHistory = (
  options: Pick<ReadWebAppReleaseHistoryOptions, 'baseCommit' | 'targetCommit'>,
) => Promise<Result<WebAppReleaseHistory, Error>>;

export type WebAppReleasePlanDependencies = {
  readonly readFirstParentHistory: ReadFirstParentHistory;
  readonly listPullRequestsForCommit: WebAppReleasePlanningGitHubClient['listPullRequestsForCommit'];
};

export type PlanWebAppReleaseOptions = {
  readonly currentVersion: string;
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly dependencies: WebAppReleasePlanDependencies;
};

export type DiscoverWebAppReleasePullRequestsOptions = {
  readonly commits: readonly string[];
  readonly listPullRequestsForCommit: WebAppReleasePlanningGitHubClient['listPullRequestsForCommit'];
};

type PullRequestReleaseImpactRecord = {
  readonly pullRequest: WebAppReleasePlanningPullRequest;
  readonly releaseImpact: PullRequestReleaseImpact;
};

export async function discoverWebAppReleasePullRequests(
  options: DiscoverWebAppReleasePullRequestsOptions,
): Promise<Result<readonly WebAppReleasePlanningPullRequest[], Error>> {
  const discoveredPullRequests: WebAppReleasePlanningPullRequest[] = [];
  const discoveredPullRequestNumbers = new Set<number>();

  for (const commitSha of options.commits) {
    const associatedPullRequestsResult = await options.listPullRequestsForCommit({commitSha});
    if (associatedPullRequestsResult.isErr) {
      return Result.err(
        new Error(
          `Unable to discover pull requests for commit ${commitSha}: ${associatedPullRequestsResult.error.message}`,
          {cause: associatedPullRequestsResult.error},
        ),
      );
    }

    const mergedMainPullRequests = [
      ...new Map(
        associatedPullRequestsResult.value
          .filter(pullRequest => {
            return pullRequest.baseBranch === 'main' && pullRequest.mergedAt.isJust;
          })
          .map(pullRequest => {
            return [pullRequest.number, pullRequest] as const;
          }),
      ).values(),
    ];
    if (mergedMainPullRequests.length === 0) {
      return Result.err(new Error(`No merged pull request targeting main is associated with commit ${commitSha}`));
    }

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

    const matchingPullRequest = mergedMainPullRequests.at(0);
    if (matchingPullRequest === undefined) {
      return Result.err(new Error(`Unable to select a merged pull request for commit ${commitSha}`));
    }

    if (discoveredPullRequestNumbers.has(matchingPullRequest.number) === false) {
      discoveredPullRequests.push(matchingPullRequest);
      discoveredPullRequestNumbers.add(matchingPullRequest.number);
    }
  }

  return Result.ok(discoveredPullRequests);
}

function validatePullRequestImpacts(
  pullRequests: readonly WebAppReleasePlanningPullRequest[],
): Result<readonly PullRequestReleaseImpactRecord[], Error> {
  return pullRequests.reduce((pullRequestImpactsResult, pullRequest) => {
    return pullRequestImpactsResult.andThen(pullRequestImpacts => {
      const releaseImpactResult = validatePullRequestReleaseImpact({
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

export async function planWebAppRelease(options: PlanWebAppReleaseOptions): Promise<Result<WebAppReleasePlan, Error>> {
  const currentVersionResult = validateWebAppVersion(options.currentVersion);
  if (currentVersionResult.isErr) {
    return Result.err(currentVersionResult.error);
  }

  const historyResult = await options.dependencies.readFirstParentHistory({
    baseCommit: options.baseCommit,
    targetCommit: options.targetCommit,
  });
  if (historyResult.isErr) {
    return Result.err(historyResult.error);
  }

  const {value: history} = historyResult;
  const pullRequestsResult = await discoverWebAppReleasePullRequests({
    commits: history.commits,
    listPullRequestsForCommit: options.dependencies.listPullRequestsForCommit,
  });
  if (pullRequestsResult.isErr) {
    return Result.err(pullRequestsResult.error);
  }

  const pullRequestImpactsResult = validatePullRequestImpacts(pullRequestsResult.value);
  if (pullRequestImpactsResult.isErr) {
    return Result.err(pullRequestImpactsResult.error);
  }

  const pullRequestImpacts = pullRequestImpactsResult.value;
  const releaseImpacts = pullRequestImpacts.map(pullRequestImpact => {
    return pullRequestImpact.releaseImpact;
  });
  const versionBumpResult = resolveWebAppVersionBump(releaseImpacts);
  if (versionBumpResult.isErr) {
    return Result.err(versionBumpResult.error);
  }

  const nextVersionResult = resolveNextWebAppReleaseVersion(options.currentVersion, releaseImpacts);
  if (nextVersionResult.isErr) {
    return Result.err(nextVersionResult.error);
  }

  return Result.ok({
    baseCommit: history.baseCommit,
    targetCommit: history.targetCommit,
    currentVersion: currentVersionResult.value,
    versionBump: versionBumpResult.value,
    nextVersion: nextVersionResult.value,
    pullRequests: createReleasePlanPullRequests(pullRequestImpacts),
  });
}
