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

import * as actionsCore from '@actions/core';
import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

import type {
  CommentProgress,
  DiscoveryProgress,
  ReleaseAppearanceProgressReporter,
} from './releaseAppearanceProgress.ts';
import {
  commentProcessingConcurrency,
  progressPercentageStep,
  pullRequestDiscoveryConcurrency,
} from './releaseAppearanceProgress.ts';

type ActionsCoreProgressAdapter = Pick<typeof actionsCore, 'endGroup' | 'info' | 'startGroup'>;

type ProgressPhase = 'discovery' | 'comments';

type ProgressSnapshot =
  | {
      readonly phase: 'discovery';
      readonly progress: DiscoveryProgress;
    }
  | {
      readonly phase: 'comments';
      readonly progress: CommentProgress;
    };

type ProgressReporterState = {
  readonly phase: ProgressPhase;
  readonly lastEmittedProgressBoundary: number;
  readonly isGroupOpen: boolean;
};

export type CreateGitHubActionsProgressReporterOptions = {
  readonly actionsCore: ActionsCoreProgressAdapter;
};

const completeProgressPercentage = 100;
const millisecondsPerSecond = 1_000;

function progressPercentage(completedItems: number, totalItems: number): number {
  if (totalItems === 0) {
    return completeProgressPercentage;
  }

  return Math.floor((completedItems * completeProgressPercentage) / totalItems);
}

function progressBoundary(completedItems: number, totalItems: number): number {
  return Math.floor(progressPercentage(completedItems, totalItems) / progressPercentageStep) * progressPercentageStep;
}

function formatElapsedSeconds(elapsedMilliseconds: number): number {
  return Math.floor(elapsedMilliseconds / millisecondsPerSecond);
}

function progressCompletedItems(progressSnapshot: ProgressSnapshot): number {
  return match(progressSnapshot)
    .with({phase: 'discovery'}, ({progress}) => {
      return progress.completedCommits;
    })
    .with({phase: 'comments'}, ({progress}) => {
      return progress.completedPullRequests;
    })
    .exhaustive();
}

function progressTotalItems(progressSnapshot: ProgressSnapshot): number {
  return match(progressSnapshot)
    .with({phase: 'discovery'}, ({progress}) => {
      return progress.totalCommits;
    })
    .with({phase: 'comments'}, ({progress}) => {
      return progress.totalPullRequests;
    })
    .exhaustive();
}

function createProgressStartMessage(progressSnapshot: ProgressSnapshot): string {
  return match(progressSnapshot)
    .with({phase: 'discovery'}, ({progress}) => {
      if (progress.totalCommits === 0) {
        return 'Release appearance: no commits require pull-request discovery';
      }

      return `Release appearance: discovering pull requests for ${progress.totalCommits} commits with concurrency ${pullRequestDiscoveryConcurrency}`;
    })
    .with({phase: 'comments'}, ({progress}) => {
      if (progress.totalPullRequests === 0) {
        return 'Release appearance: no pull-request comments require processing';
      }

      return `Release appearance: processing comments for ${progress.totalPullRequests} PRs with concurrency ${commentProcessingConcurrency}`;
    })
    .exhaustive();
}

function createProgressMessage(progressSnapshot: ProgressSnapshot): string {
  return match(progressSnapshot)
    .with({phase: 'discovery'}, ({progress}) => {
      const {completedCommits, failures, activeRequests, pullRequestsDiscovered, elapsedMilliseconds, totalCommits} =
        progress;
      const percentage = progressPercentage(completedCommits, totalCommits);
      return `Release appearance: discovery ${completedCommits}/${totalCommits} (${percentage}%) · ${pullRequestsDiscovered} PRs · ${failures} failures · ${activeRequests} active · elapsed ${formatElapsedSeconds(elapsedMilliseconds)}s`;
    })
    .with({phase: 'comments'}, ({progress}) => {
      const {
        completedPullRequests,
        totalPullRequests,
        commentsCreated,
        commentsUpdated,
        commentsUnchanged,
        failures,
        activeRequests,
        elapsedMilliseconds,
      } = progress;
      const percentage = progressPercentage(completedPullRequests, totalPullRequests);
      return `Release appearance: comments ${completedPullRequests}/${totalPullRequests} (${percentage}%) · created ${commentsCreated} · updated ${commentsUpdated} · unchanged ${commentsUnchanged} · failed ${failures} · ${activeRequests} active · elapsed ${formatElapsedSeconds(elapsedMilliseconds)}s`;
    })
    .exhaustive();
}

function createProgressGroupName(phase: ProgressPhase): string {
  return match(phase)
    .with('discovery', () => {
      return 'Discover pull requests';
    })
    .with('comments', () => {
      return 'Process release-appearance comments';
    })
    .exhaustive();
}

function createInitialProgressReporterState(progressSnapshot: ProgressSnapshot): ProgressReporterState {
  return {
    phase: progressSnapshot.phase,
    lastEmittedProgressBoundary: 0,
    isGroupOpen: false,
  };
}

export function createGitHubActionsProgressReporter(
  createGitHubActionsProgressReporterOptions: CreateGitHubActionsProgressReporterOptions,
): ReleaseAppearanceProgressReporter {
  const {actionsCore: actionsCoreAdapter} = createGitHubActionsProgressReporterOptions;
  let progressReporterState: Maybe<ProgressReporterState> = Maybe.nothing<ProgressReporterState>();

  function startProgress(progressSnapshot: ProgressSnapshot): void {
    const initialProgressReporterState = createInitialProgressReporterState(progressSnapshot);
    progressReporterState = Maybe.just(initialProgressReporterState);
    actionsCoreAdapter.startGroup(createProgressGroupName(progressSnapshot.phase));
    progressReporterState = Maybe.just({...initialProgressReporterState, isGroupOpen: true});
    actionsCoreAdapter.info(createProgressStartMessage(progressSnapshot));
  }

  function reportProgress(progressSnapshot: ProgressSnapshot): void {
    if (progressReporterState.isNothing) {
      return;
    }

    const currentProgressBoundary = progressBoundary(
      progressCompletedItems(progressSnapshot),
      progressTotalItems(progressSnapshot),
    );
    if (currentProgressBoundary <= progressReporterState.value.lastEmittedProgressBoundary) {
      return;
    }

    actionsCoreAdapter.info(createProgressMessage(progressSnapshot));
    progressReporterState = Maybe.just({
      ...progressReporterState.value,
      lastEmittedProgressBoundary: currentProgressBoundary,
    });
  }

  function finishProgress(progressSnapshot: ProgressSnapshot): void {
    if (progressReporterState.isNothing) {
      return;
    }

    try {
      actionsCoreAdapter.info(createProgressMessage(progressSnapshot));
    } finally {
      try {
        if (progressReporterState.value.isGroupOpen) {
          actionsCoreAdapter.endGroup();
        }
      } finally {
        progressReporterState = Maybe.nothing<ProgressReporterState>();
      }
    }
  }

  return {
    reportDiscoveryStarted(progress) {
      startProgress({phase: 'discovery', progress});
    },
    reportDiscoveryProgress(progress) {
      reportProgress({phase: 'discovery', progress});
    },
    reportDiscoveryCompleted(progress) {
      finishProgress({phase: 'discovery', progress});
    },
    reportCommentProcessingStarted(progress) {
      startProgress({phase: 'comments', progress});
    },
    reportCommentProcessingProgress(progress) {
      reportProgress({phase: 'comments', progress});
    },
    reportCommentProcessingCompleted(progress) {
      finishProgress({phase: 'comments', progress});
    },
  };
}

export function createDefaultGitHubActionsProgressReporter(): ReleaseAppearanceProgressReporter {
  return createGitHubActionsProgressReporter({actionsCore});
}
