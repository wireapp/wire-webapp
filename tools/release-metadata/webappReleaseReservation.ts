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

import {Maybe, Result} from 'true-myth';
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

export type WebAppReleaseReservation = {
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

export type WebAppReleaseReservationDependencies = {
  readonly readStableWebAppReleases: () => Promise<Result<readonly StableWebAppRelease[], Error>>;
  readonly readRemoteReleaseBranches: () => Promise<Result<readonly WebAppReleaseBranchRef[], Error>>;
  readonly isCommitAncestor: (options: VerifyWebAppReleaseCommitAncestorOptions) => Promise<Result<boolean, Error>>;
  readonly planNextWebAppRelease: (options: PlanNextWebAppReleaseOptions) => Promise<Result<WebAppReleasePlan, Error>>;
  readonly createReleaseBranch: (
    options: CreateWebAppReleaseReservationBranchOptions,
  ) => Promise<Result<WebAppReleaseReservationAction, Error>>;
};

export type ReserveWebAppReleaseOptions = {
  readonly targetCommit: string;
  readonly dependencies: WebAppReleaseReservationDependencies;
};

export type ContinueActiveWebAppReleaseDependencies = {
  readonly readStableWebAppReleases: () => Promise<Result<readonly StableWebAppRelease[], Error>>;
  readonly readRemoteReleaseBranches: () => Promise<Result<readonly WebAppReleaseBranchRef[], Error>>;
  readonly prepareRemoteReleaseBranchCommit: (options: PrepareRemoteReleaseBranchCommitOptions) => Task<Unit, Error>;
  readonly isCommitAncestor: (options: VerifyWebAppReleaseCommitAncestorOptions) => Promise<Result<boolean, Error>>;
};

export type ContinueActiveWebAppReleaseOptions = {
  readonly dependencies: ContinueActiveWebAppReleaseDependencies;
};

export type InspectActiveWebAppReleaseReservationsOptions = {
  readonly stableReleases: readonly StableWebAppRelease[];
  readonly releaseBranches: readonly WebAppReleaseBranchRef[];
};

type CreateWebAppReleaseReservationResultOptions = {
  readonly version: WebAppVersion;
  readonly releaseBranch: string;
  readonly releaseCommitSha: string;
  readonly stableBaseRelease: StableWebAppRelease;
  readonly action: WebAppReleaseReservationAction;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;
const legacyDateReleaseBranchPattern = /^release\/\d{4}-\d{2}-\d{2}\.[1-9]\d*$/;
const likelyWebAppSemVerReleaseBranchPattern = /^release\/(?:v)?\d/;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isLegacyDateReleaseBranchName(branchName: string): boolean {
  return legacyDateReleaseBranchPattern.test(branchName);
}

function isLikelyWebAppSemVerReleaseBranchName(branchName: string): boolean {
  return likelyWebAppSemVerReleaseBranchPattern.test(branchName);
}

function createReservationResult(options: CreateWebAppReleaseReservationResultOptions): WebAppReleaseReservation {
  return {
    version: options.version,
    releaseBranch: options.releaseBranch,
    releaseCommitSha: options.releaseCommitSha,
    stableBaseVersion: options.stableBaseRelease.version,
    stableBaseTag: options.stableBaseRelease.tagName,
    stableBaseCommitSha: options.stableBaseRelease.commitSha,
    action: options.action,
  };
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
  const stableWebAppReleasesByTagName = new Map<string, StableWebAppRelease>();
  for (const stableRelease of options.stableReleases) {
    stableWebAppReleasesByTagName.set(stableRelease.tagName, stableRelease);
  }

  const activeReservations: WebAppReleaseBranchRef[] = [];

  for (const releaseBranch of options.releaseBranches) {
    const releaseVersionResult = parseWebAppReleaseBranchName(releaseBranch.releaseBranch);
    if (releaseVersionResult.isErr) {
      if (isLegacyDateReleaseBranchName(releaseBranch.releaseBranch)) {
        continue;
      }

      if (isLikelyWebAppSemVerReleaseBranchName(releaseBranch.releaseBranch)) {
        return Result.err(
          new Error(`Malformed SemVer WebApp release branch found in Git history: ${releaseBranch.releaseBranch}`),
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

async function executeWebAppReleaseReservation(
  options: ReserveWebAppReleaseOptions,
): Promise<Result<WebAppReleaseReservation, Error>> {
  const targetCommit = options.targetCommit.toLowerCase();
  if (fullCommitShaPattern.test(options.targetCommit) === false) {
    return Result.err(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  const stableReleasesResult = await options.dependencies.readStableWebAppReleases();
  if (stableReleasesResult.isErr) {
    return Result.err(stableReleasesResult.error);
  }

  const latestStableReleaseResult = selectLatestStableWebAppRelease({stableReleases: stableReleasesResult.value});
  if (latestStableReleaseResult.isErr) {
    return Result.err(latestStableReleaseResult.error);
  }

  const latestStableRelease = latestStableReleaseResult.value;
  const releaseBranchesResult = await options.dependencies.readRemoteReleaseBranches();
  if (releaseBranchesResult.isErr) {
    return Result.err(releaseBranchesResult.error);
  }

  const activeReservationsResult = inspectActiveWebAppReleaseReservations({
    stableReleases: stableReleasesResult.value,
    releaseBranches: releaseBranchesResult.value,
  });
  if (activeReservationsResult.isErr) {
    return Result.err(activeReservationsResult.error);
  }

  const activeReservationCountValidationResult = validateAtMostOneActiveWebAppReleaseReservation(
    activeReservationsResult.value,
  );
  if (activeReservationCountValidationResult.isErr) {
    return Result.err(activeReservationCountValidationResult.error);
  }

  const activeReservationMaybe = Maybe.of(activeReservationsResult.value.at(0));
  if (activeReservationMaybe.isJust) {
    const activeReservation = activeReservationMaybe.value;
    if (activeReservation.releaseCommitSha !== targetCommit) {
      return Result.err(
        new Error(
          `WebApp release reservation conflict: ${activeReservation.releaseBranch} points to ${activeReservation.releaseCommitSha}, requested target is ${targetCommit}`,
        ),
      );
    }

    const activeVersionResult = parseWebAppReleaseBranchName(activeReservation.releaseBranch);
    if (activeVersionResult.isErr) {
      return Result.err(activeVersionResult.error);
    }

    return Result.ok(
      createReservationResult({
        version: activeVersionResult.value,
        releaseBranch: activeReservation.releaseBranch,
        releaseCommitSha: targetCommit,
        stableBaseRelease: latestStableRelease,
        action: 'reused',
      }),
    );
  }

  const stableBaseIsAncestorResult = await options.dependencies.isCommitAncestor({
    baseCommit: latestStableRelease.commitSha,
    targetCommit,
  });
  if (stableBaseIsAncestorResult.isErr) {
    return Result.err(stableBaseIsAncestorResult.error);
  }

  if (stableBaseIsAncestorResult.value === false) {
    return Result.err(
      new Error(
        `Stable WebApp release ${latestStableRelease.tagName} commit is not an ancestor of target commit ${targetCommit}`,
      ),
    );
  }

  const releasePlanResult = await options.dependencies.planNextWebAppRelease({
    currentVersion: latestStableRelease.version,
    baseCommit: latestStableRelease.commitSha,
    targetCommit,
  });
  if (releasePlanResult.isErr) {
    return Result.err(releasePlanResult.error);
  }

  const nextVersionResult = validateWebAppVersion(releasePlanResult.value.nextVersion);
  if (nextVersionResult.isErr) {
    return Result.err(nextVersionResult.error);
  }

  const releaseBranchNameResult = createWebAppReleaseBranchName(nextVersionResult.value);
  if (releaseBranchNameResult.isErr) {
    return Result.err(releaseBranchNameResult.error);
  }

  const branchCreationResult = await options.dependencies.createReleaseBranch({
    releaseBranch: releaseBranchNameResult.value,
    targetCommit,
  });
  if (branchCreationResult.isErr) {
    return Result.err(branchCreationResult.error);
  }

  return Result.ok(
    createReservationResult({
      version: nextVersionResult.value,
      releaseBranch: releaseBranchNameResult.value,
      releaseCommitSha: targetCommit,
      stableBaseRelease: latestStableRelease,
      action: branchCreationResult.value,
    }),
  );
}

async function executeWebAppReleaseContinuation(
  options: ContinueActiveWebAppReleaseOptions,
): Promise<Result<WebAppReleaseReservation, Error>> {
  const stableReleasesResult = await options.dependencies.readStableWebAppReleases();
  if (stableReleasesResult.isErr) {
    return Result.err(stableReleasesResult.error);
  }

  const latestStableReleaseResult = selectLatestStableWebAppRelease({stableReleases: stableReleasesResult.value});
  if (latestStableReleaseResult.isErr) {
    return Result.err(latestStableReleaseResult.error);
  }

  const latestStableRelease = latestStableReleaseResult.value;
  const releaseBranchesResult = await options.dependencies.readRemoteReleaseBranches();
  if (releaseBranchesResult.isErr) {
    return Result.err(releaseBranchesResult.error);
  }

  const activeReservationsResult = inspectActiveWebAppReleaseReservations({
    stableReleases: stableReleasesResult.value,
    releaseBranches: releaseBranchesResult.value,
  });
  if (activeReservationsResult.isErr) {
    return Result.err(activeReservationsResult.error);
  }

  const activeReservationCountValidationResult = validateAtMostOneActiveWebAppReleaseReservation(
    activeReservationsResult.value,
  );
  if (activeReservationCountValidationResult.isErr) {
    return Result.err(activeReservationCountValidationResult.error);
  }

  const activeReservationMaybe = Maybe.of(activeReservationsResult.value.at(0));
  if (activeReservationMaybe.isNothing) {
    return Result.err(new Error('No active WebApp SemVer release exists'));
  }

  const activeReservation = activeReservationMaybe.value;
  const activeVersionResult = parseWebAppReleaseBranchName(activeReservation.releaseBranch);
  if (activeVersionResult.isErr) {
    return Result.err(activeVersionResult.error);
  }

  const preparedReleaseCommitResult = await options.dependencies
    .prepareRemoteReleaseBranchCommit({
      releaseBranch: activeReservation.releaseBranch,
      expectedCommitSha: activeReservation.releaseCommitSha,
    })
    .toPromise();
  if (preparedReleaseCommitResult.isErr) {
    return Result.err(preparedReleaseCommitResult.error);
  }

  const stableBaseIsAncestorResult = await options.dependencies.isCommitAncestor({
    baseCommit: latestStableRelease.commitSha,
    targetCommit: activeReservation.releaseCommitSha,
  });
  if (stableBaseIsAncestorResult.isErr) {
    return Result.err(stableBaseIsAncestorResult.error);
  }

  if (stableBaseIsAncestorResult.value === false) {
    return Result.err(
      new Error(
        `Stable WebApp release ${latestStableRelease.tagName} commit is not an ancestor of active release commit ${activeReservation.releaseCommitSha}`,
      ),
    );
  }

  return Result.ok(
    createReservationResult({
      version: activeVersionResult.value,
      releaseBranch: activeReservation.releaseBranch,
      releaseCommitSha: activeReservation.releaseCommitSha,
      stableBaseRelease: latestStableRelease,
      action: 'reused',
    }),
  );
}

export async function reserveWebAppRelease(
  options: ReserveWebAppReleaseOptions,
): Promise<Result<WebAppReleaseReservation, Error>> {
  try {
    return await executeWebAppReleaseReservation(options);
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to reserve WebApp release: ${errorMessage(error)}`, {cause: error}));
  }
}

export async function continueActiveWebAppRelease(
  options: ContinueActiveWebAppReleaseOptions,
): Promise<Result<WebAppReleaseReservation, Error>> {
  try {
    return await executeWebAppReleaseContinuation(options);
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to continue WebApp release: ${errorMessage(error)}`, {cause: error}));
  }
}
