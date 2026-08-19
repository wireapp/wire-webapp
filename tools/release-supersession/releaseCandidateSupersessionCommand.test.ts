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

import assert from 'node:assert';

import {Result} from 'true-myth';

import type {GitHubActionsClient} from './githubActionsClient.ts';
import {supersedePreviousReleaseCandidates} from './releaseCandidateSupersessionCommand.ts';
import {productionOperationJobName} from './releaseCandidateSupersession.ts';
import type {ReleaseWorkflowJob, ReleaseWorkflowRun} from './releaseCandidateSupersession.ts';

function createRun(runOptions: Partial<ReleaseWorkflowRun> = {}): ReleaseWorkflowRun {
  return {
    id: 1,
    status: 'in_progress',
    conclusion: null,
    createdAt: '2026-08-19T10:00:00Z',
    ...runOptions,
  };
}

function createProductionJob(jobOptions: Partial<ReleaseWorkflowJob> = {}): ReleaseWorkflowJob {
  return {
    name: productionOperationJobName,
    status: 'queued',
    conclusion: null,
    ...jobOptions,
  };
}

function createActionsClient(
  workflowRuns: readonly ReleaseWorkflowRun[],
  workflowJobsByRunId: Readonly<Record<number, readonly ReleaseWorkflowJob[]>>,
  cancelledRunIds: number[],
  cancellationResult: 'accepted' | 'conflict' = 'accepted',
): GitHubActionsClient {
  return {
    async listReleaseWorkflowRuns(): Promise<Result<readonly ReleaseWorkflowRun[], Error>> {
      return Result.ok(workflowRuns);
    },
    async listReleaseWorkflowJobs(options): Promise<Result<readonly ReleaseWorkflowJob[], Error>> {
      return Result.ok(workflowJobsByRunId[options.runId] ?? []);
    },
    async cancelWorkflowRun(runId): Promise<Result<'accepted' | 'conflict', Error>> {
      cancelledRunIds.push(runId);
      return Result.ok(cancellationResult);
    },
  };
}

describe('release candidate supersession orchestration', () => {
  it('cancels only older runs that have not started Production', async () => {
    const cancelledRunIds: number[] = [];
    const githubActionsClient = createActionsClient(
      [
        createRun({id: 10}),
        createRun({id: 20}),
        createRun({id: 30}),
        createRun({id: 40, status: 'completed', conclusion: 'success'}),
      ],
      {
        10: [],
        20: [createProductionJob({status: 'in_progress'})],
        30: [],
      },
      cancelledRunIds,
    );

    const actualResult = await supersedePreviousReleaseCandidates({
      currentRunId: 30,
      workflowFileName: 'release-webapp.yml',
      githubActionsClient,
    });

    assert(actualResult.isOk);
    expect(actualResult.value.supersededRunIds).toEqual([10]);
    expect(cancelledRunIds).toEqual([10]);
  });

  it('fails closed when workflow state cannot be inspected', async () => {
    const githubActionsClient: GitHubActionsClient = {
      async listReleaseWorkflowRuns(): Promise<Result<readonly ReleaseWorkflowRun[], Error>> {
        return Result.ok([createRun({id: 10})]);
      },
      async listReleaseWorkflowJobs(): Promise<Result<readonly ReleaseWorkflowJob[], Error>> {
        return Result.err(new Error('GitHub API unavailable'));
      },
      async cancelWorkflowRun(): Promise<Result<'accepted', Error>> {
        return Result.ok('accepted');
      },
    };

    const actualResult = await supersedePreviousReleaseCandidates({
      currentRunId: 30,
      workflowFileName: 'release-webapp.yml',
      githubActionsClient,
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('GitHub API unavailable');
  });

  it('treats a cancellation conflict as a safe Production-boundary race', async () => {
    const githubActionsClient = createActionsClient([createRun({id: 10})], {10: []}, [], 'conflict');

    const actualResult = await supersedePreviousReleaseCandidates({
      currentRunId: 30,
      workflowFileName: 'release-webapp.yml',
      githubActionsClient,
    });

    assert(actualResult.isOk);
    expect(actualResult.value.supersededRunIds).toEqual([]);
    expect(actualResult.value.cancellationConflictRunIds).toEqual([10]);
  });
});
