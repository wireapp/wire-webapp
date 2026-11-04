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

import {Maybe, Result, task} from 'true-myth';
import type {Task, Unit} from 'true-myth';

import {
  createStableWebAppTagName,
  createWebAppReleaseBranchName,
  parseWebAppReleaseBranchName,
} from './webappReleaseIdentity.ts';
import type {WebAppReleasePlan} from './webappReleasePlan.ts';
import type {StableWebAppRelease} from './webappStableReleaseGit.ts';
import {selectLatestStableWebAppRelease} from './webappStableReleaseGit.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {validateWebAppVersion} from './webappVersion.ts';

export type WebAppReleaseReservationAction = 'created' | 'reused';

export type WebAppReleaseBranchRef = {
  readonly releaseBranch: string;
  readonly releaseCommitSha: string;
};

export type WebAppReleasePreparation = {
  readonly operation: 'start' | 'continue';
  readonly version: WebAppVersion;
  readonly releaseBranch: string;
  readonly releaseCommitSha: string;
  readonly stableBaseVersion: WebAppVersion;
  readonly stableBaseTag: string;
  readonly stableBaseCommitSha: string;
  readonly action: WebAppReleaseReservationAction;
};

export type PlanNextWebAppReleaseOptions = {
  readonly currentVersion: WebAppVersion;
  readonly baseCommit: string;
  readonly targetCommit: string;
};

export type VerifyWebAppReleaseCommitAncestorOptions = {
  readonly baseCommit: string;
  readonly targetCommit: string;
};

export type PrepareRemoteReleaseBranchCommitOptions = {
  readonly releaseBranch: string;
  readonly expectedCommitSha: string;
};

export type CreateWebAppReleaseReservationBranchOptions = {
  readonly releaseBranch: string;
  readonly targetCommit: string;
};

export type PrepareWebAppReleaseDependencies = {
  readonly readStableWebAppReleases: () => Task<readonly StableWebAppRelease[], Error>;
  readonly readRemoteReleaseBranches: () => Task<readonly WebAppReleaseBranchRef[], Error>;
  readonly isCommitAncestor: (options: VerifyWebAppReleaseCommitAncestorOptions) => Task<boolean, Error>;
  readonly planNextWebAppRelease: (options: PlanNextWebAppReleaseOptions) => Task<WebAppReleasePlan, Error>;
  readonly prepareRemoteReleaseBranchCommit: (options: PrepareRemoteReleaseBranchCommitOptions) => Task<Unit, Error>;
  readonly createReleaseBranch: (
    options: CreateWebAppReleaseReservationBranchOptions,
  ) => Task<WebAppReleaseReservationAction, Error>;
};

export type PrepareWebAppReleaseOptions =
  | {
      readonly operation: 'start';
      readonly targetCommit: string;
    }
  | {
      readonly operation: 'continue';
    };

type StartWebAppReleaseOptions = {
  readonly targetCommit: string;
};

export type InspectActiveWebAppReleaseReservationsOptions = {
  readonly stableReleases: readonly StableWebAppRelease[];
  readonly releaseBranches: readonly WebAppReleaseBranchRef[];
};

type CreateWebAppReleaseReservationResultOptions = {
  readonly operation: 'start' | 'continue';
  readonly version: WebAppVersion;
  readonly releaseBranch: string;
  readonly releaseCommitSha: string;
  readonly stableBaseRelease: StableWebAppRelease;
  readonly action: WebAppReleaseReservationAction;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;
const likelyWebAppSemVerReleaseBranchPattern = /^release\/(?:v)?\d/;
const historicalWebAppDateReleaseBranchPattern = /^release\/\d{4}-\d{2}-\d{2}(?:\.\d+)?$/;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isLikelyWebAppSemVerReleaseBranchName(branchName: string): boolean {
  return (
    likelyWebAppSemVerReleaseBranchPattern.test(branchName) &&
    historicalWebAppDateReleaseBranchPattern.test(branchName) === false
  );
}

function createReservationResult(options: CreateWebAppReleaseReservationResultOptions): WebAppReleasePreparation {
  const {operation, version, releaseBranch, releaseCommitSha, stableBaseRelease, action} = options;

  return {
    operation,
    version,
    releaseBranch,
    releaseCommitSha,
    stableBaseVersion: stableBaseRelease.version,
    stableBaseTag: stableBaseRelease.tagName,
    stableBaseCommitSha: stableBaseRelease.commitSha,
    action,
  };
}

async function readTaskValue<Value>(pendingTask: Task<Value, Error>): Promise<Value> {
  const taskResult = await pendingTask.toPromise();
  if (taskResult.isErr) {
    throw taskResult.error;
  }

  return taskResult.value;
}

function validateAtMostOneActiveWebAppReleaseReservation(
  activeReservations: readonly WebAppReleaseBranchRef[],
): Result<Unit, Error> {
  if (activeReservations.length <= 1) {
    return Result.ok();
  }

  const activeReservationBranches = activeReservations
    .map(activeReservation => {
      return activeReservation.releaseBranch;
    })
    .join(', ');

  return Result.err(new Error(`Multiple unresolved WebApp release reservations exist: ${activeReservationBranches}`));
}

export function inspectActiveWebAppReleaseReservations(
  options: InspectActiveWebAppReleaseReservationsOptions,
): Result<readonly WebAppReleaseBranchRef[], Error> {
  const {stableReleases, releaseBranches} = options;
  const stableWebAppReleasesByTagName = new Map<string, StableWebAppRelease>();
  for (const stableRelease of stableReleases) {
    stableWebAppReleasesByTagName.set(stableRelease.tagName, stableRelease);
  }

  const activeReservations: WebAppReleaseBranchRef[] = [];

  for (const releaseBranch of releaseBranches) {
    const releaseVersionResult = parseWebAppReleaseBranchName(releaseBranch.releaseBranch);
    if (releaseVersionResult.isErr) {
      if (isLikelyWebAppSemVerReleaseBranchName(releaseBranch.releaseBranch)) {
        return Result.err(
          new Error(`Malformed WebApp release branch found in Git history: ${releaseBranch.releaseBranch}`),
        );
      }

      continue;
    }

    if (fullCommitShaPattern.test(releaseBranch.releaseCommitSha) === false) {
      return Result.err(new Error(`Malformed commit SHA on WebApp release branch ${releaseBranch.releaseBranch}`));
    }

    const stableTagNameResult = createStableWebAppTagName(releaseVersionResult.value);
    if (stableTagNameResult.isErr) {
      return Result.err(stableTagNameResult.error);
    }

    const matchingStableReleaseMaybe = Maybe.of(stableWebAppReleasesByTagName.get(stableTagNameResult.value));
    if (matchingStableReleaseMaybe.isJust) {
      const matchingStableRelease = matchingStableReleaseMaybe.value;
      const releaseBranchCommitSha = releaseBranch.releaseCommitSha.toLowerCase();
      const stableTagCommitSha = matchingStableRelease.commitSha.toLowerCase();

      if (releaseBranchCommitSha !== stableTagCommitSha) {
        return Result.err(
          new Error(
            `WebApp release reservation commit mismatch: ${releaseBranch.releaseBranch} points to ${releaseBranchCommitSha}, but ${matchingStableRelease.tagName} points to ${stableTagCommitSha}`,
          ),
        );
      }

      continue;
    }

    activeReservations.push({
      releaseBranch: releaseBranch.releaseBranch,
      releaseCommitSha: releaseBranch.releaseCommitSha.toLowerCase(),
    });
  }

  return Result.ok(Object.freeze(activeReservations));
}

async function executeWebAppReleaseStart(
  options: StartWebAppReleaseOptions,
  dependencies: PrepareWebAppReleaseDependencies,
): Promise<WebAppReleasePreparation> {
  const {targetCommit: requestedTargetCommit} = options;
  const {
    readStableWebAppReleases,
    readRemoteReleaseBranches,
    isCommitAncestor,
    planNextWebAppRelease,
    createReleaseBranch,
  } = dependencies;

  const targetCommit = requestedTargetCommit.toLowerCase();
  if (fullCommitShaPattern.test(requestedTargetCommit) === false) {
    throw new Error('Invalid target commit: expected a full 40-character hexadecimal SHA');
  }

  const stableReleases = await readTaskValue(readStableWebAppReleases());

  const latestStableReleaseResult = selectLatestStableWebAppRelease({stableReleases});
  if (latestStableReleaseResult.isErr) {
    throw latestStableReleaseResult.error;
  }

  const latestStableRelease = latestStableReleaseResult.value;
  const releaseBranches = await readTaskValue(readRemoteReleaseBranches());

  const activeReservationsResult = inspectActiveWebAppReleaseReservations({
    stableReleases,
    releaseBranches,
  });
  if (activeReservationsResult.isErr) {
    throw activeReservationsResult.error;
  }

  const activeReservationCountValidationResult = validateAtMostOneActiveWebAppReleaseReservation(
    activeReservationsResult.value,
  );
  if (activeReservationCountValidationResult.isErr) {
    throw activeReservationCountValidationResult.error;
  }

  const activeReservationMaybe = Maybe.of(activeReservationsResult.value.at(0));
  if (activeReservationMaybe.isJust) {
    const activeReservation = activeReservationMaybe.value;
    if (activeReservation.releaseCommitSha !== targetCommit) {
      throw new Error(
        `WebApp release reservation conflict: ${activeReservation.releaseBranch} points to ${activeReservation.releaseCommitSha}, requested target is ${targetCommit}`,
      );
    }

    const activeVersionResult = parseWebAppReleaseBranchName(activeReservation.releaseBranch);
    if (activeVersionResult.isErr) {
      throw activeVersionResult.error;
    }

    return createReservationResult({
      operation: 'start',
      version: activeVersionResult.value,
      releaseBranch: activeReservation.releaseBranch,
      releaseCommitSha: targetCommit,
      stableBaseRelease: latestStableRelease,
      action: 'reused',
    });
  }

  const stableBaseIsAncestor = await readTaskValue(
    isCommitAncestor({
      baseCommit: latestStableRelease.commitSha,
      targetCommit,
    }),
  );

  if (stableBaseIsAncestor === false) {
    throw new Error(
      `Stable WebApp release ${latestStableRelease.tagName} commit is not an ancestor of target commit ${targetCommit}`,
    );
  }

  const releasePlan = await readTaskValue(
    planNextWebAppRelease({
      currentVersion: latestStableRelease.version,
      baseCommit: latestStableRelease.commitSha,
      targetCommit,
    }),
  );

  const nextVersionResult = validateWebAppVersion(releasePlan.nextVersion);
  if (nextVersionResult.isErr) {
    throw nextVersionResult.error;
  }

  const releaseBranchNameResult = createWebAppReleaseBranchName(nextVersionResult.value);
  if (releaseBranchNameResult.isErr) {
    throw releaseBranchNameResult.error;
  }

  const branchCreationAction = await readTaskValue(
    createReleaseBranch({
      releaseBranch: releaseBranchNameResult.value,
      targetCommit,
    }),
  );

  return createReservationResult({
    operation: 'start',
    version: nextVersionResult.value,
    releaseBranch: releaseBranchNameResult.value,
    releaseCommitSha: targetCommit,
    stableBaseRelease: latestStableRelease,
    action: branchCreationAction,
  });
}

async function executeWebAppReleaseContinuation(
  dependencies: PrepareWebAppReleaseDependencies,
): Promise<WebAppReleasePreparation> {
  const {readStableWebAppReleases, readRemoteReleaseBranches, prepareRemoteReleaseBranchCommit, isCommitAncestor} =
    dependencies;

  const stableReleases = await readTaskValue(readStableWebAppReleases());

  const latestStableReleaseResult = selectLatestStableWebAppRelease({stableReleases});
  if (latestStableReleaseResult.isErr) {
    throw latestStableReleaseResult.error;
  }

  const latestStableRelease = latestStableReleaseResult.value;
  const releaseBranches = await readTaskValue(readRemoteReleaseBranches());

  const activeReservationsResult = inspectActiveWebAppReleaseReservations({
    stableReleases,
    releaseBranches,
  });
  if (activeReservationsResult.isErr) {
    throw activeReservationsResult.error;
  }

  const activeReservationCountValidationResult = validateAtMostOneActiveWebAppReleaseReservation(
    activeReservationsResult.value,
  );
  if (activeReservationCountValidationResult.isErr) {
    throw activeReservationCountValidationResult.error;
  }

  const activeReservationMaybe = Maybe.of(activeReservationsResult.value.at(0));
  if (activeReservationMaybe.isNothing) {
    throw new Error('No active WebApp SemVer release exists');
  }

  const activeReservation = activeReservationMaybe.value;
  const activeVersionResult = parseWebAppReleaseBranchName(activeReservation.releaseBranch);
  if (activeVersionResult.isErr) {
    throw activeVersionResult.error;
  }

  await readTaskValue(
    prepareRemoteReleaseBranchCommit({
      releaseBranch: activeReservation.releaseBranch,
      expectedCommitSha: activeReservation.releaseCommitSha,
    }),
  );

  const stableBaseIsAncestor = await readTaskValue(
    isCommitAncestor({
      baseCommit: latestStableRelease.commitSha,
      targetCommit: activeReservation.releaseCommitSha,
    }),
  );

  if (stableBaseIsAncestor === false) {
    throw new Error(
      `Stable WebApp release ${latestStableRelease.tagName} commit is not an ancestor of active release commit ${activeReservation.releaseCommitSha}`,
    );
  }

  return createReservationResult({
    operation: 'continue',
    version: activeVersionResult.value,
    releaseBranch: activeReservation.releaseBranch,
    releaseCommitSha: activeReservation.releaseCommitSha,
    stableBaseRelease: latestStableRelease,
    action: 'reused',
  });
}

export function prepareWebAppRelease(
  options: PrepareWebAppReleaseOptions,
  dependencies: PrepareWebAppReleaseDependencies,
): Task<WebAppReleasePreparation, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(`Unable to ${options.operation} WebApp release: ${errorMessage(error)}`, {cause: error});
    },
    async (): Promise<WebAppReleasePreparation> => {
      return options.operation === 'start'
        ? executeWebAppReleaseStart({targetCommit: options.targetCommit}, dependencies)
        : executeWebAppReleaseContinuation(dependencies);
    },
  );
}
