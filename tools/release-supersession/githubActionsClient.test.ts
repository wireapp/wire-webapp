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

import ky from 'ky';

import {createGitHubActionsClient} from './githubActionsClient.ts';
import type {CreateGitHubActionsClientOptions} from './githubActionsClient.ts';

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function createClient(fetchImplementation: FetchImplementation): ReturnType<typeof createGitHubActionsClient> {
  const options: CreateGitHubActionsClientOptions = {
    githubApiUrl: new URL('https://api.github.example'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken: 'github-token',
    kyInstance: ky.create({fetch: fetchImplementation}),
  };

  return createGitHubActionsClient(options);
}

function createJsonResponse(responseBody: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

function readRequestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : input.toString();
}

function createWorkflowRunPayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    id: 123,
    status: 'in_progress',
    conclusion: null,
    created_at: '2026-08-19T10:00:00Z',
    ...overrides,
  };
}

function createWorkflowJobPayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    name: 'Deploy to Production',
    status: 'queued',
    conclusion: null,
    ...overrides,
  };
}

function createWorkflowRunsPayload(
  workflowRuns: readonly unknown[] = [createWorkflowRunPayload()],
): Readonly<Record<string, unknown>> {
  return {workflow_runs: workflowRuns};
}

function createWorkflowJobsPayload(
  workflowJobs: readonly unknown[] = [createWorkflowJobPayload()],
): Readonly<Record<string, unknown>> {
  return {jobs: workflowJobs};
}

function createClientReturning(responseBody: unknown): ReturnType<typeof createClient> {
  return createClient(async (): Promise<Response> => {
    return createJsonResponse(responseBody);
  });
}

async function assertMalformedWorkflowRunsResponse(responseBody: unknown): Promise<void> {
  const githubActionsClient = createClientReturning(responseBody);
  const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

  assert(actualResult.isErr);
  expect(actualResult.error.message).toBe('Malformed GitHub workflow-runs response');
}

async function assertMalformedWorkflowJobsResponse(responseBody: unknown): Promise<void> {
  const githubActionsClient = createClientReturning(responseBody);
  const actualResult = await githubActionsClient.listReleaseWorkflowJobs({runId: 123});

  assert(actualResult.isErr);
  expect(actualResult.error.message).toBe('Malformed GitHub workflow-jobs response');
}

describe('GitHub Actions supersession client', () => {
  it('accepts an empty workflow-runs page', async () => {
    const githubActionsClient = createClientReturning(createWorkflowRunsPayload([]));

    const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
  });

  it('scopes workflow discovery to the Release WebApp workflow and dispatch event', async () => {
    let requestedUrl = '';
    const githubActionsClient = createClient(async (input): Promise<Response> => {
      requestedUrl = readRequestUrl(input);

      return createJsonResponse({
        workflow_runs: [
          {
            id: 123,
            status: 'in_progress',
            conclusion: null,
            created_at: '2026-08-19T10:00:00Z',
          },
        ],
      });
    });

    const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

    assert(actualResult.isOk);
    expect(actualResult.value[0]).toEqual({
      id: 123,
      status: 'in_progress',
      conclusion: null,
      createdAt: '2026-08-19T10:00:00Z',
    });
    expect(requestedUrl).toBe(
      'https://api.github.example/repos/wireapp/wire-webapp/actions/workflows/release-webapp.yml/runs?event=workflow_dispatch&per_page=100&page=1',
    );
  });

  it.each([
    {description: 'zero', responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({id: 0})])},
    {description: 'a negative number', responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({id: -1})])},
    {
      description: 'a fractional number',
      responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({id: 1.5})]),
    },
    {description: 'a string', responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({id: '123'})])},
    {
      description: 'an unsupported status',
      responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({status: 'running'})]),
    },
    {
      description: 'an unsupported conclusion',
      responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({conclusion: 'cancelled_by_newer_beta'})]),
    },
    {
      description: 'an empty creation timestamp',
      responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({created_at: ''})]),
    },
    {
      description: 'a non-string creation timestamp',
      responseBody: createWorkflowRunsPayload([createWorkflowRunPayload({created_at: 123})]),
    },
  ])('rejects a workflow run with $description', async ({responseBody}) => {
    await assertMalformedWorkflowRunsResponse(responseBody);
  });

  it.each([
    {description: 'no workflow_runs field', responseBody: {}},
    {description: 'a non-array workflow_runs field', responseBody: {workflow_runs: {}}},
    {description: 'a non-object workflow run item', responseBody: createWorkflowRunsPayload([null])},
  ])('rejects a malformed workflow-runs page with $description', async ({responseBody}) => {
    await assertMalformedWorkflowRunsResponse(responseBody);
  });

  it.each(['completed', 'in_progress', 'pending', 'queued', 'requested', 'waiting'])(
    'accepts workflow run status %s',
    async status => {
      const githubActionsClient = createClientReturning(
        createWorkflowRunsPayload([createWorkflowRunPayload({status})]),
      );

      const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

      assert(actualResult.isOk);
      expect(actualResult.value[0]?.status).toBe(status);
    },
  );

  it.each([
    null,
    'action_required',
    'cancelled',
    'failure',
    'neutral',
    'skipped',
    'stale',
    'startup_failure',
    'success',
    'timed_out',
  ])('accepts workflow run conclusion %s', async conclusion => {
    const githubActionsClient = createClientReturning(
      createWorkflowRunsPayload([createWorkflowRunPayload({status: 'completed', conclusion})]),
    );

    const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

    assert(actualResult.isOk);
    expect(actualResult.value[0]?.conclusion).toBe(conclusion);
  });

  it('accepts an empty workflow-jobs page', async () => {
    const githubActionsClient = createClientReturning(createWorkflowJobsPayload([]));

    const actualResult = await githubActionsClient.listReleaseWorkflowJobs({runId: 123});

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
  });

  it('maps a valid workflow job response', async () => {
    const githubActionsClient = createClientReturning(
      createWorkflowJobsPayload([createWorkflowJobPayload({status: 'completed', conclusion: 'success'})]),
    );

    const actualResult = await githubActionsClient.listReleaseWorkflowJobs({runId: 123});

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([
      {
        name: 'Deploy to Production',
        status: 'completed',
        conclusion: 'success',
      },
    ]);
  });

  it.each([
    {description: 'no jobs field', responseBody: {}},
    {description: 'a non-array jobs field', responseBody: {jobs: {}}},
    {description: 'a non-object workflow job item', responseBody: createWorkflowJobsPayload([null])},
    {
      description: 'an empty name',
      responseBody: createWorkflowJobsPayload([createWorkflowJobPayload({name: ''})]),
    },
    {
      description: 'a non-string name',
      responseBody: createWorkflowJobsPayload([createWorkflowJobPayload({name: 123})]),
    },
    {
      description: 'an unsupported status',
      responseBody: createWorkflowJobsPayload([createWorkflowJobPayload({status: 'running'})]),
    },
    {
      description: 'an unsupported conclusion',
      responseBody: createWorkflowJobsPayload([createWorkflowJobPayload({conclusion: 'cancelled_by_newer_beta'})]),
    },
  ])('rejects a malformed workflow-jobs page with $description', async ({responseBody}) => {
    await assertMalformedWorkflowJobsResponse(responseBody);
  });

  it('rejects malformed workflow state instead of treating it as promotable', async () => {
    const githubActionsClient = createClient(async (): Promise<Response> => {
      return createJsonResponse({
        workflow_runs: [
          {
            id: 123,
            status: 'unexpected',
            conclusion: null,
            created_at: '2026-08-19T10:00:00Z',
          },
        ],
      });
    });

    const actualResult = await githubActionsClient.listReleaseWorkflowRuns({workflowFileName: 'release-webapp.yml'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Malformed GitHub workflow-runs response');
  });
});
