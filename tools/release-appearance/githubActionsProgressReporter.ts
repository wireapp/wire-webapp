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
  ReleaseAppearanceClock,
  ReleaseAppearanceProgressReporter,
  ReleaseAppearanceProgressScheduler,
} from './releaseAppearanceProgress.ts';
import {maximumProgressSilenceMilliseconds, progressPercentageStep} from './releaseAppearanceProgress.ts';

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

type ProgressReporterState<TimerHandle extends {}> = {
  readonly phase: ProgressPhase;
  readonly startedAtMilliseconds: number;
  readonly lastEmittedAtMilliseconds: number;
  readonly lastEmittedProgressBoundary: number;
  readonly snapshot: ProgressSnapshot;
  readonly timerHandle: Maybe<TimerHandle>;
};

export type CreateGitHubActionsProgressReporterOptions<TimerHandle extends {}> = {
  readonly actionsCore: ActionsCoreProgressAdapter;
  readonly clock: ReleaseAppearanceClock;
  readonly scheduler: ReleaseAppearanceProgressScheduler<TimerHandle>;
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

      return `Release appearance: discovering pull requests for ${progress.totalCommits} commits`;
    })
    .with({phase: 'comments'}, ({progress}) => {
      if (progress.totalPullRequests === 0) {
        return 'Release appearance: no pull-request comments require processing';
      }

      return `Release appearance: processing comments for ${progress.totalPullRequests} PRs`;
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

function updateProgressElapsed(progressSnapshot: ProgressSnapshot, elapsedMilliseconds: number): ProgressSnapshot {
  return match(progressSnapshot)
    .returnType<ProgressSnapshot>()
    .with({phase: 'discovery'}, ({progress}) => {
      return {
        phase: 'discovery',
        progress: {...progress, elapsedMilliseconds},
      };
    })
    .with({phase: 'comments'}, ({progress}) => {
      return {
        phase: 'comments',
        progress: {...progress, elapsedMilliseconds},
      };
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

function createInitialProgressReporterState<TimerHandle extends {}>(
  progressSnapshot: ProgressSnapshot,
  startedAtMilliseconds: number,
): ProgressReporterState<TimerHandle> {
  return {
    phase: progressSnapshot.phase,
    startedAtMilliseconds,
    lastEmittedAtMilliseconds: startedAtMilliseconds,
    lastEmittedProgressBoundary: 0,
    snapshot: progressSnapshot,
    timerHandle: Maybe.nothing<TimerHandle>(),
  };
}

function clearProgressTimer<TimerHandle extends {}>(
  progressReporterState: ProgressReporterState<TimerHandle>,
  scheduler: ReleaseAppearanceProgressScheduler<TimerHandle>,
): ProgressReporterState<TimerHandle> {
  if (progressReporterState.timerHandle.isNothing) {
    return progressReporterState;
  }

  scheduler.cancel(progressReporterState.timerHandle.value);
  return {
    ...progressReporterState,
    timerHandle: Maybe.nothing<TimerHandle>(),
  };
}

export function createGitHubActionsProgressReporter<TimerHandle extends {}>(
  createGitHubActionsProgressReporterOptions: CreateGitHubActionsProgressReporterOptions<TimerHandle>,
): ReleaseAppearanceProgressReporter {
  const {actionsCore, clock, scheduler} = createGitHubActionsProgressReporterOptions;
  let progressReporterState: Maybe<ProgressReporterState<TimerHandle>> =
    Maybe.nothing<ProgressReporterState<TimerHandle>>();

  function emitProgressMessage(progressSnapshot: ProgressSnapshot, emittedAtMilliseconds: number): void {
    if (progressReporterState.isNothing) {
      return;
    }

    actionsCore.info(createProgressMessage(progressSnapshot));
    progressReporterState = Maybe.just({
      ...progressReporterState.value,
      lastEmittedAtMilliseconds: emittedAtMilliseconds,
      lastEmittedProgressBoundary: Math.max(
        progressReporterState.value.lastEmittedProgressBoundary,
        progressBoundary(progressCompletedItems(progressSnapshot), progressTotalItems(progressSnapshot)),
      ),
      snapshot: progressSnapshot,
    });
  }

  function scheduleSilenceProgress(): void {
    if (progressReporterState.isNothing) {
      return;
    }

    const currentTimeMilliseconds = clock();
    const currentSnapshot = updateProgressElapsed(
      progressReporterState.value.snapshot,
      currentTimeMilliseconds - progressReporterState.value.startedAtMilliseconds,
    );
    if (
      currentTimeMilliseconds - progressReporterState.value.lastEmittedAtMilliseconds >=
      maximumProgressSilenceMilliseconds
    ) {
      emitProgressMessage(currentSnapshot, currentTimeMilliseconds);
    } else {
      progressReporterState = Maybe.just({
        ...progressReporterState.value,
        snapshot: currentSnapshot,
      });
    }

    if (progressReporterState.isJust) {
      progressReporterState = Maybe.just({
        ...progressReporterState.value,
        timerHandle: Maybe.just(scheduler.schedule(scheduleSilenceProgress, maximumProgressSilenceMilliseconds)),
      });
    }
  }

  function startProgress(progressSnapshot: ProgressSnapshot): void {
    const startedAtMilliseconds = clock();
    const initialProgressReporterState = createInitialProgressReporterState<TimerHandle>(
      progressSnapshot,
      startedAtMilliseconds,
    );
    progressReporterState = Maybe.just(initialProgressReporterState);
    actionsCore.startGroup(createProgressGroupName(progressSnapshot.phase));
    actionsCore.info(createProgressStartMessage(progressSnapshot));
    progressReporterState = Maybe.just({
      ...initialProgressReporterState,
      timerHandle: Maybe.just(scheduler.schedule(scheduleSilenceProgress, maximumProgressSilenceMilliseconds)),
    });
  }

  function reportProgress(progressSnapshot: ProgressSnapshot): void {
    if (progressReporterState.isNothing) {
      return;
    }

    const currentTimeMilliseconds = clock();
    const hasCrossedProgressBoundary =
      progressBoundary(progressCompletedItems(progressSnapshot), progressTotalItems(progressSnapshot)) >
      progressReporterState.value.lastEmittedProgressBoundary;
    const hasExceededMaximumSilence =
      currentTimeMilliseconds - progressReporterState.value.lastEmittedAtMilliseconds >=
      maximumProgressSilenceMilliseconds;
    progressReporterState = Maybe.just({
      ...progressReporterState.value,
      snapshot: progressSnapshot,
    });
    if (hasCrossedProgressBoundary || hasExceededMaximumSilence) {
      emitProgressMessage(progressSnapshot, currentTimeMilliseconds);
    }
  }

  function finishProgress(progressSnapshot: ProgressSnapshot): void {
    if (progressReporterState.isNothing) {
      return;
    }

    progressReporterState = Maybe.just(
      clearProgressTimer(
        {
          ...progressReporterState.value,
          snapshot: progressSnapshot,
        },
        scheduler,
      ),
    );
    try {
      emitProgressMessage(progressSnapshot, clock());
    } finally {
      try {
        actionsCore.endGroup();
      } finally {
        progressReporterState = Maybe.nothing<ProgressReporterState<TimerHandle>>();
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

export function createDefaultGitHubActionsProgressReporter(
  clock: ReleaseAppearanceClock,
): ReleaseAppearanceProgressReporter {
  return createGitHubActionsProgressReporter<ReturnType<typeof setTimeout>>({
    actionsCore,
    clock,
    scheduler: {
      schedule(callback, delayMilliseconds) {
        return setTimeout(callback, delayMilliseconds);
      },
      cancel(timerHandle) {
        clearTimeout(timerHandle);
      },
    },
  });
}
