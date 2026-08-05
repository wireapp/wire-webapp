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

export type DiscoveryProgress = {
  readonly completedCommits: number;
  readonly totalCommits: number;
  readonly activeRequests: number;
  readonly pullRequestsDiscovered: number;
  readonly failures: number;
  readonly elapsedMilliseconds: number;
};

export type CommentProgress = {
  readonly completedPullRequests: number;
  readonly totalPullRequests: number;
  readonly activeRequests: number;
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly failures: number;
  readonly elapsedMilliseconds: number;
};

export type ReleaseAppearanceProgressReporter = {
  readonly reportDiscoveryStarted: (progress: DiscoveryProgress) => void;
  readonly reportDiscoveryProgress: (progress: DiscoveryProgress) => void;
  readonly reportDiscoveryCompleted: (progress: DiscoveryProgress) => void;
  readonly reportCommentProcessingStarted: (progress: CommentProgress) => void;
  readonly reportCommentProcessingProgress: (progress: CommentProgress) => void;
  readonly reportCommentProcessingCompleted: (progress: CommentProgress) => void;
};

export type ReleaseAppearanceClock = () => number;

export type ReleaseAppearanceProgressScheduler<TimerHandle extends {}> = {
  readonly schedule: (callback: () => void, delayMilliseconds: number) => TimerHandle;
  readonly cancel: (timerHandle: TimerHandle) => void;
};

export const pullRequestDiscoveryConcurrency = 8;
export const commentProcessingConcurrency = 4;
export const progressPercentageStep = 10;
export const maximumProgressSilenceMilliseconds = 15_000;

export function createNoOpReleaseAppearanceProgressReporter(): ReleaseAppearanceProgressReporter {
  return {
    reportDiscoveryStarted(progress) {
      void progress;
    },
    reportDiscoveryProgress(progress) {
      void progress;
    },
    reportDiscoveryCompleted(progress) {
      void progress;
    },
    reportCommentProcessingStarted(progress) {
      void progress;
    },
    reportCommentProcessingProgress(progress) {
      void progress;
    },
    reportCommentProcessingCompleted(progress) {
      void progress;
    },
  };
}
