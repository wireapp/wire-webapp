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

import {listMergedSupportedPullRequests} from './releaseAppearanceCommandGitHub.ts';
import type {GitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';
import type {CommitRange} from './releaseHistory.ts';

export type PullRequestAppearance = {
  readonly number: number;
  readonly earliestBetaTag: string;
};

export type DiscoveryRange = {
  readonly candidateTag: string;
  readonly commitRange: CommitRange;
};

export type DiscoveryOptions = {
  readonly ranges: readonly DiscoveryRange[];
  readonly githubRequests: GitHubRequestBehavior;
  readonly githubToken: string;
};

export type DiscoveryResult = {
  readonly pullRequests: readonly PullRequestAppearance[];
  readonly commitsInspected: readonly string[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly errors: readonly string[];
};

export async function discoverPullRequests(discoveryOptions: DiscoveryOptions): Promise<DiscoveryResult> {
  const {ranges, githubRequests, githubToken} = discoveryOptions;
  const pullRequestsByNumber = new Map<number, PullRequestAppearance>();
  const commitsInspected = new Set<string>();
  const commitsWithoutPullRequests = new Set<string>();
  const errors: string[] = [];

  for (const range of ranges) {
    for (const commitSha of range.commitRange.commits) {
      commitsInspected.add(commitSha);
      const pullRequestsResult = await listMergedSupportedPullRequests({
        commitSha,
        githubRequests,
        githubToken,
      });

      if (pullRequestsResult.isErr) {
        errors.push(pullRequestsResult.error.message);
        continue;
      }

      if (pullRequestsResult.value.length === 0) {
        commitsWithoutPullRequests.add(commitSha);
      }

      for (const pullRequest of pullRequestsResult.value) {
        if (!pullRequestsByNumber.has(pullRequest.number)) {
          pullRequestsByNumber.set(pullRequest.number, {
            number: pullRequest.number,
            earliestBetaTag: range.candidateTag,
          });
        }
      }
    }
  }

  return {
    pullRequests: [...pullRequestsByNumber.values()].toSorted((leftPullRequest, rightPullRequest) => {
      return leftPullRequest.number - rightPullRequest.number;
    }),
    commitsInspected: [...commitsInspected],
    commitsWithoutPullRequests: [...commitsWithoutPullRequests],
    errors,
  };
}
