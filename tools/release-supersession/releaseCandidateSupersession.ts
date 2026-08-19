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

import {isInteger} from '@sindresorhus/is';
import {maybe, Result} from 'true-myth';

export type WorkflowRunStatus = 'completed' | 'in_progress' | 'pending' | 'queued' | 'requested' | 'waiting';

export type WorkflowRunConclusion =
  | 'action_required'
  | 'cancelled'
  | 'failure'
  | 'neutral'
  | 'skipped'
  | 'stale'
  | 'startup_failure'
  | 'success'
  | 'timed_out';

export type WorkflowJobStatus = WorkflowRunStatus;

export type WorkflowJobConclusion = WorkflowRunConclusion;

export type ReleaseWorkflowRun = {
  readonly id: number;
  readonly status: WorkflowRunStatus;
  readonly conclusion: WorkflowRunConclusion | null;
  readonly createdAt: string;
};

export type ReleaseWorkflowJob = {
  readonly name: string;
  readonly status: WorkflowJobStatus;
  readonly conclusion: WorkflowJobConclusion | null;
};

export type ReleaseCandidateObservation = {
  readonly run: ReleaseWorkflowRun;
  readonly jobs: readonly ReleaseWorkflowJob[];
};

export type ReleaseCandidateState = 'promotable' | 'superseded' | 'productionStarted' | 'completed';

export type SupersedableReleaseCandidate = {
  readonly run: ReleaseWorkflowRun;
  readonly state: 'superseded';
};

export type SelectSupersedableReleaseCandidatesOptions = {
  readonly currentRunId: number;
  readonly observations: readonly ReleaseCandidateObservation[];
};

type ValidatedReleaseCandidateObservation = {
  readonly observation: ReleaseCandidateObservation;
  readonly state: ReleaseCandidateState;
};

export const productionOperationJobName = 'Deploy to Production';

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function validateWorkflowRun(run: ReleaseWorkflowRun): Result<void, Error> {
  if (isInteger(run.id) === false || run.id <= 0) {
    return createFailure(`Workflow run has an invalid id: ${run.id}`);
  }

  if (run.createdAt.length === 0) {
    return createFailure(`Workflow run ${run.id} has no creation timestamp`);
  }

  if (run.status === 'completed' && run.conclusion === null) {
    return createFailure(`Completed workflow run ${run.id} has no conclusion`);
  }

  if (run.status !== 'completed' && run.conclusion !== null) {
    return createFailure(`Incomplete workflow run ${run.id} has a conclusion: ${run.conclusion}`);
  }

  return createSuccess(undefined);
}

function validateWorkflowJob(job: ReleaseWorkflowJob, runId: number): Result<void, Error> {
  if (job.name.length === 0) {
    return createFailure(`Workflow run ${runId} contains a job without a name`);
  }

  if (job.status === 'completed' && job.conclusion === null) {
    return createFailure(`Completed job ${job.name} in workflow run ${runId} has no conclusion`);
  }

  if (job.status !== 'completed' && job.conclusion !== null) {
    return createFailure(`Incomplete job ${job.name} in workflow run ${runId} has a conclusion: ${job.conclusion}`);
  }

  return createSuccess(undefined);
}

function compareReleaseWorkflowRuns(leftRun: ReleaseWorkflowRun, rightRun: ReleaseWorkflowRun): number {
  const creationTimestampComparison = leftRun.createdAt.localeCompare(rightRun.createdAt);

  if (creationTimestampComparison !== 0) {
    return creationTimestampComparison;
  }

  return leftRun.id - rightRun.id;
}

function isProductionOperationStarted(productionJobs: readonly ReleaseWorkflowJob[]): boolean {
  return productionJobs.some(productionJob => {
    if (productionJob.status === 'in_progress') {
      return true;
    }

    if (productionJob.status === 'completed') {
      return productionJob.conclusion !== 'skipped';
    }

    return false;
  });
}

export function determineReleaseCandidateState(
  releaseCandidateObservation: ReleaseCandidateObservation,
): Result<ReleaseCandidateState, Error> {
  const runValidationResult = validateWorkflowRun(releaseCandidateObservation.run);
  if (runValidationResult.isErr) {
    return createFailure(runValidationResult.error.message);
  }

  for (const job of releaseCandidateObservation.jobs) {
    const jobValidationResult = validateWorkflowJob(job, releaseCandidateObservation.run.id);
    if (jobValidationResult.isErr) {
      return createFailure(jobValidationResult.error.message);
    }
  }

  if (releaseCandidateObservation.run.status === 'completed') {
    return createSuccess('completed');
  }

  const productionJobs = releaseCandidateObservation.jobs.filter(job => {
    return job.name === productionOperationJobName;
  });

  if (isProductionOperationStarted(productionJobs)) {
    return createSuccess('productionStarted');
  }

  return createSuccess('promotable');
}

export function selectSupersedableReleaseCandidates(
  options: SelectSupersedableReleaseCandidatesOptions,
): Result<readonly SupersedableReleaseCandidate[], Error> {
  if (isInteger(options.currentRunId) === false || options.currentRunId <= 0) {
    return createFailure(`Current workflow run has an invalid id: ${options.currentRunId}`);
  }

  const currentObservation = maybe.find(observation => {
    return observation.run.id === options.currentRunId;
  }, options.observations);

  if (currentObservation.isNothing) {
    return createFailure(`Current workflow run ${options.currentRunId} is missing from GitHub Actions state`);
  }

  const observedRunIds = new Set<number>();
  const validatedObservations: ValidatedReleaseCandidateObservation[] = [];

  for (const observation of options.observations) {
    if (observedRunIds.has(observation.run.id)) {
      return createFailure(`GitHub Actions state contains duplicate workflow run ${observation.run.id}`);
    }

    observedRunIds.add(observation.run.id);

    const candidateStateResult = determineReleaseCandidateState(observation);
    if (candidateStateResult.isErr) {
      return createFailure(candidateStateResult.error.message);
    }

    validatedObservations.push({observation, state: candidateStateResult.value});
  }

  const sortedObservations = validatedObservations.toSorted((leftObservation, rightObservation) => {
    return compareReleaseWorkflowRuns(leftObservation.observation.run, rightObservation.observation.run);
  });
  const supersedableCandidates: SupersedableReleaseCandidate[] = [];

  for (const validatedObservation of sortedObservations) {
    const {observation, state} = validatedObservation;

    if (
      observation.run.id === options.currentRunId ||
      compareReleaseWorkflowRuns(observation.run, currentObservation.value.run) >= 0
    ) {
      continue;
    }

    if (state === 'promotable') {
      supersedableCandidates.push({run: observation.run, state: 'superseded'});
    }
  }

  return createSuccess(supersedableCandidates);
}
