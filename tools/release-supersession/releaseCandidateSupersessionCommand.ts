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

import type {GitHubActionsClient} from './githubActionsClient.ts';
import {selectSupersedableReleaseCandidates} from './releaseCandidateSupersession.ts';
import type {ReleaseCandidateObservation, ReleaseWorkflowRun} from './releaseCandidateSupersession.ts';

export type SupersedePreviousReleaseCandidatesOptions = {
  readonly currentRunId: number;
  readonly workflowFileName: string;
  readonly githubActionsClient: GitHubActionsClient;
};

export type SupersessionResult = {
  readonly supersededRunIds: readonly number[];
};

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

async function createObservationsForRuns(
  options: SupersedePreviousReleaseCandidatesOptions,
  workflowRuns: readonly ReleaseWorkflowRun[],
): Promise<Result<readonly ReleaseCandidateObservation[], Error>> {
  const observations: ReleaseCandidateObservation[] = [];

  for (const workflowRun of workflowRuns) {
    if (workflowRun.id === options.currentRunId || workflowRun.status === 'completed') {
      observations.push({run: workflowRun, jobs: []});
      continue;
    }

    const workflowJobsResult = await options.githubActionsClient.listReleaseWorkflowJobs({runId: workflowRun.id});
    if (workflowJobsResult.isErr) {
      return createFailure(`Unable to inspect workflow run ${workflowRun.id}: ${workflowJobsResult.error.message}`);
    }

    observations.push({run: workflowRun, jobs: workflowJobsResult.value});
  }

  return createSuccess(observations);
}

export async function supersedePreviousReleaseCandidates(
  options: SupersedePreviousReleaseCandidatesOptions,
): Promise<Result<SupersessionResult, Error>> {
  const workflowRunsResult = await options.githubActionsClient.listReleaseWorkflowRuns({
    workflowFileName: options.workflowFileName,
  });
  if (workflowRunsResult.isErr) {
    return createFailure(`Unable to list Release WebApp workflow runs: ${workflowRunsResult.error.message}`);
  }

  const observationsResult = await createObservationsForRuns(options, workflowRunsResult.value);
  if (observationsResult.isErr) {
    return createFailure(observationsResult.error.message);
  }

  const candidatesResult = selectSupersedableReleaseCandidates({
    currentRunId: options.currentRunId,
    observations: observationsResult.value,
  });
  if (candidatesResult.isErr) {
    return createFailure(`Unable to determine supersedable release runs: ${candidatesResult.error.message}`);
  }

  return createSuccess({
    supersededRunIds: candidatesResult.value.map(candidate => {
      return candidate.run.id;
    }),
  });
}

export function renderSupersessionSummary(currentRunId: number, supersessionResult: SupersessionResult): string {
  const supersededRunIds =
    supersessionResult.supersededRunIds.length > 0 ? supersessionResult.supersededRunIds.join(', ') : 'none';

  return [
    '## Beta candidate supersession',
    '',
    `- Current Release WebApp run: ${currentRunId}`,
    `- Superseded older runs: ${supersededRunIds}`,
    '- Older workflows remain visible; the final live-Beta guard blocks stale Production promotion.',
    '- Production operations are never automatically cancelled.',
  ].join('\n');
}
