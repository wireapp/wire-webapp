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

import {match} from 'ts-pattern';

import type {PullRequestAppearance, DiscoveryRange} from './releaseAppearanceCommandDiscovery.ts';
import type {ParsedCommand, ReleaseAppearanceCommandStage} from './releaseAppearanceCommandParsing.ts';
import type {ReleaseHistoryPlan} from './releaseHistory.ts';

export type SummaryOptions = {
  readonly stage: ReleaseAppearanceCommandStage;
  readonly releaseTag: string;
  readonly bootstrap: boolean;
  readonly precedingProductionTag: string;
  readonly candidateRanges: readonly DiscoveryRange[];
  readonly commitsInspected: readonly string[];
  readonly pullRequestsDiscovered: readonly PullRequestAppearance[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly failedPullRequests: readonly number[];
};

function formatStringList(values: readonly string[]): string {
  if (values.length === 0) {
    return 'none';
  }

  return values.join(', ');
}

function formatNumberList(values: readonly number[]): string {
  if (values.length === 0) {
    return 'none';
  }

  return values
    .map(value => {
      return `#${value}`;
    })
    .join(', ');
}

function formatCandidateRanges(summaryOptions: SummaryOptions): string {
  if (summaryOptions.candidateRanges.length === 0) {
    return 'not applicable';
  }

  return summaryOptions.candidateRanges
    .map(candidateRange => {
      return `${candidateRange.candidateTag}: ${candidateRange.commitRange.startTag} -> ${candidateRange.commitRange.endTag}`;
    })
    .join('; ');
}

export function createSummary(summaryOptions: SummaryOptions): string {
  const {
    stage,
    releaseTag,
    bootstrap,
    precedingProductionTag,
    commitsInspected,
    pullRequestsDiscovered,
    commitsWithoutPullRequests,
    commentsCreated,
    commentsUpdated,
    commentsUnchanged,
    failedPullRequests,
  } = summaryOptions;

  return [
    '### Release appearance',
    '',
    `- Stage: ${stage}`,
    `- Release tag: \`${releaseTag}\``,
    `- Bootstrap: ${bootstrap ? 'yes' : 'no'}`,
    `- Preceding Production tag: ${precedingProductionTag}`,
    `- Beta candidate ranges for Production: ${formatCandidateRanges(summaryOptions)}`,
    `- Commits inspected: ${commitsInspected.length} (${formatStringList(commitsInspected)})`,
    `- Pull requests discovered: ${pullRequestsDiscovered.length} (${formatNumberList(
      pullRequestsDiscovered.map(pullRequest => {
        return pullRequest.number;
      }),
    )})`,
    `- Comments created: ${commentsCreated}`,
    `- Comments updated: ${commentsUpdated}`,
    `- Comments unchanged: ${commentsUnchanged}`,
    `- Failed pull requests: ${formatNumberList(failedPullRequests)}`,
    `- Commits without associated pull requests: ${formatStringList(commitsWithoutPullRequests)}`,
  ].join('\n');
}

export function createEmptySummaryOptions(parsedCommand: ParsedCommand): SummaryOptions {
  return {
    stage: parsedCommand.stage,
    releaseTag: parsedCommand.releaseTag,
    bootstrap: false,
    precedingProductionTag: 'unavailable',
    candidateRanges: [],
    commitsInspected: [],
    pullRequestsDiscovered: [],
    commitsWithoutPullRequests: [],
    commentsCreated: 0,
    commentsUpdated: 0,
    commentsUnchanged: 0,
    failedPullRequests: [],
  };
}

export function createPlanSummaryOptions(
  parsedCommand: ParsedCommand,
  releaseHistoryPlan: ReleaseHistoryPlan,
): Pick<SummaryOptions, 'bootstrap' | 'precedingProductionTag' | 'candidateRanges'> {
  return match(releaseHistoryPlan)
    .with({kind: 'bootstrap'}, () => {
      return {
        bootstrap: true,
        precedingProductionTag: 'not applicable',
        candidateRanges: [],
      };
    })
    .with({kind: 'beta'}, betaPlan => {
      return {
        bootstrap: false,
        precedingProductionTag: betaPlan.precedingProductionTag,
        candidateRanges: [
          {
            candidateTag: parsedCommand.releaseTag,
            commitRange: betaPlan.commitRange,
          },
        ],
      };
    })
    .with({kind: 'production'}, productionPlan => {
      return {
        bootstrap: false,
        precedingProductionTag: productionPlan.precedingProductionTag,
        candidateRanges: productionPlan.candidateRanges,
      };
    })
    .exhaustive();
}
