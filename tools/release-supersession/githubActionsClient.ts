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

import {isError} from '@sindresorhus/is';
import ky, {isHTTPError} from 'ky';
import {Result} from 'true-myth';
import type {KyInstance} from 'ky';
import {z} from 'zod';

import type {ReleaseWorkflowJob, ReleaseWorkflowRun} from './releaseCandidateSupersession.ts';

export type ListReleaseWorkflowRunsOptions = {
  readonly workflowFileName: string;
};

export type ListReleaseWorkflowJobsOptions = {
  readonly runId: number;
};

export type GitHubActionsClient = {
  readonly listReleaseWorkflowRuns: (
    options: ListReleaseWorkflowRunsOptions,
  ) => Promise<Result<readonly ReleaseWorkflowRun[], Error>>;
  readonly listReleaseWorkflowJobs: (
    options: ListReleaseWorkflowJobsOptions,
  ) => Promise<Result<readonly ReleaseWorkflowJob[], Error>>;
};

export type CreateGitHubActionsClientOptions = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
  readonly kyInstance: KyInstance;
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';

const workflowRunStatusSchema = z.enum(['completed', 'in_progress', 'pending', 'queued', 'requested', 'waiting']);

const workflowRunConclusionSchema = z
  .enum([
    'action_required',
    'cancelled',
    'failure',
    'neutral',
    'skipped',
    'stale',
    'startup_failure',
    'success',
    'timed_out',
  ])
  .nullable();

const workflowRunResponseSchema = z.object({
  id: z.number().int().positive(),
  status: workflowRunStatusSchema,
  conclusion: workflowRunConclusionSchema,
  created_at: z.string().min(1),
});

const workflowRunPageResponseSchema = z.object({
  workflow_runs: z.array(workflowRunResponseSchema),
});

const workflowJobResponseSchema = z.object({
  name: z.string().min(1),
  status: workflowRunStatusSchema,
  conclusion: workflowRunConclusionSchema,
});

const workflowJobPageResponseSchema = z.object({
  jobs: z.array(workflowJobResponseSchema),
});

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function createApiRoot(githubApiUrl: URL): URL {
  const githubApiUrlString = githubApiUrl.toString();

  return new URL(githubApiUrlString.endsWith('/') ? githubApiUrlString : `${githubApiUrlString}/`);
}

function encodeRepositoryName(githubRepository: string): string {
  return githubRepository
    .split('/')
    .map(repositoryPart => {
      return encodeURIComponent(repositoryPart);
    })
    .join('/');
}

function createGitHubHeaders(githubToken: string): Readonly<Record<string, string>> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };
}

function createPageUrl(endpoint: URL, page: number): URL {
  const pageUrl = new URL(endpoint);
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());

  return pageUrl;
}

function formatApiFailure(error: unknown, requestUrl: URL, githubToken: string): string {
  const failureMessage = isHTTPError(error)
    ? `HTTP status ${error.response.status}`
    : isError(error)
      ? error.message
      : 'Unknown GitHub API failure';

  return failureMessage.replaceAll(githubToken, '[REDACTED]') + `; Request: ${requestUrl.toString()}`;
}

async function requestGitHubJson(
  kyInstance: KyInstance,
  requestUrl: URL,
  headers: Readonly<Record<string, string>>,
  githubToken: string,
): Promise<Result<unknown, Error>> {
  try {
    const response = await kyInstance(requestUrl, {headers, method: 'get'}).json<unknown>();

    return createSuccess(response);
  } catch (error: unknown) {
    return createFailure(`GitHub API request failed: ${formatApiFailure(error, requestUrl, githubToken)}`, error);
  }
}

function parseWorkflowRunPage(response: unknown): Result<readonly ReleaseWorkflowRun[], Error> {
  const validationResult = workflowRunPageResponseSchema.safeParse(response);
  if (validationResult.success === false) {
    return createFailure('Malformed GitHub workflow-runs response');
  }

  const workflowRuns: ReleaseWorkflowRun[] = validationResult.data.workflow_runs.map(workflowRun => {
    return {
      id: workflowRun.id,
      status: workflowRun.status,
      conclusion: workflowRun.conclusion,
      createdAt: workflowRun.created_at,
    };
  });

  return createSuccess(workflowRuns);
}

function parseWorkflowJobPage(response: unknown): Result<readonly ReleaseWorkflowJob[], Error> {
  const validationResult = workflowJobPageResponseSchema.safeParse(response);
  if (validationResult.success === false) {
    return createFailure('Malformed GitHub workflow-jobs response');
  }

  const workflowJobs: ReleaseWorkflowJob[] = validationResult.data.jobs.map(workflowJob => {
    return {
      name: workflowJob.name,
      status: workflowJob.status,
      conclusion: workflowJob.conclusion,
    };
  });

  return createSuccess(workflowJobs);
}

export function createGitHubActionsClient(options: CreateGitHubActionsClientOptions): GitHubActionsClient {
  const apiRoot = createApiRoot(options.githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(options.githubRepository);
  const requestHeaders = createGitHubHeaders(options.githubToken);

  return {
    async listReleaseWorkflowRuns(
      listOptions: ListReleaseWorkflowRunsOptions,
    ): Promise<Result<readonly ReleaseWorkflowRun[], Error>> {
      const workflowRuns: ReleaseWorkflowRun[] = [];

      for (let page = 1; ; page += 1) {
        const requestUrl = new URL(
          `repos/${encodedRepositoryName}/actions/workflows/${encodeURIComponent(listOptions.workflowFileName)}/runs`,
          apiRoot,
        );
        requestUrl.searchParams.set('event', 'workflow_dispatch');
        const pageUrl = createPageUrl(requestUrl, page);
        const responseResult = await requestGitHubJson(
          options.kyInstance,
          pageUrl,
          requestHeaders,
          options.githubToken,
        );

        if (responseResult.isErr) {
          return createFailure(responseResult.error.message);
        }

        const pageResult = parseWorkflowRunPage(responseResult.value);
        if (pageResult.isErr) {
          return createFailure(pageResult.error.message);
        }

        workflowRuns.push(...pageResult.value);
        if (pageResult.value.length < githubPageSize) {
          break;
        }
      }

      return createSuccess(workflowRuns);
    },

    async listReleaseWorkflowJobs(
      listOptions: ListReleaseWorkflowJobsOptions,
    ): Promise<Result<readonly ReleaseWorkflowJob[], Error>> {
      const workflowJobs: ReleaseWorkflowJob[] = [];

      for (let page = 1; ; page += 1) {
        const requestUrl = new URL(`repos/${encodedRepositoryName}/actions/runs/${listOptions.runId}/jobs`, apiRoot);
        requestUrl.searchParams.set('filter', 'latest');
        const pageUrl = createPageUrl(requestUrl, page);
        const responseResult = await requestGitHubJson(
          options.kyInstance,
          pageUrl,
          requestHeaders,
          options.githubToken,
        );

        if (responseResult.isErr) {
          return createFailure(responseResult.error.message);
        }

        const pageResult = parseWorkflowJobPage(responseResult.value);
        if (pageResult.isErr) {
          return createFailure(pageResult.error.message);
        }

        workflowJobs.push(...pageResult.value);
        if (pageResult.value.length < githubPageSize) {
          break;
        }
      }

      return createSuccess(workflowJobs);
    },
  };
}

export function createRuntimeGitHubActionsClient(
  options: Omit<CreateGitHubActionsClientOptions, 'kyInstance'>,
): GitHubActionsClient {
  return createGitHubActionsClient({
    ...options,
    kyInstance: ky,
  });
}
