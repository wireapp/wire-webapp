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

import {isError, isUndefined} from '@sindresorhus/is';
import {Maybe, Result, Task, task} from 'true-myth';
import {z} from 'zod';

import {formatHttpRequestFailure, isHttpRequestFailure} from './httpClient.ts';
import type {HttpClient, HttpMethod, HttpRequest} from './httpClient.ts';

export type GitHubReleaseRecord = {
  readonly tagName: string;
  readonly htmlUrl: string;
  readonly isDraft: boolean;
};

export type FindGitHubReleaseOptions = {
  readonly tagName: string;
};

export type GenerateReleaseNotesOptions = {
  readonly productionTagName: string;
  readonly precedingProductionTagName: string;
};

export type GitHubGeneratedReleaseNotes = {
  readonly name: string;
  readonly body: string;
};

export type CreateDraftReleaseOptions = {
  readonly productionTagName: string;
  readonly body: string;
};

export type GitHubReleaseClient = {
  readonly listTagNames: () => Task<readonly string[], Error>;
  readonly findReleaseByTag: (options: FindGitHubReleaseOptions) => Task<Maybe<GitHubReleaseRecord>, Error>;
  readonly generateReleaseNotes: (options: GenerateReleaseNotesOptions) => Task<GitHubGeneratedReleaseNotes, Error>;
  readonly createDraftRelease: (options: CreateDraftReleaseOptions) => Task<GitHubReleaseRecord, Error>;
};

export type CreateGitHubReleaseClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedGitHubTagPage = {
  readonly rawItemCount: number;
  readonly tagNames: readonly string[];
};

type GitHubReleasePage = {
  readonly rawItemCount: number;
  readonly releases: readonly GitHubReleaseRecord[];
};

type GitHubCreateReleaseRequestBody = {
  readonly tag_name: string;
  readonly name: string;
  readonly draft: true;
  readonly body: string;
};

type RequestGitHubJsonOptions = {
  readonly httpClient: HttpClient;
  readonly request: HttpRequest;
  readonly failureMessage: string;
  readonly githubToken: string;
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';

const githubTagResponseSchema = z.object({
  name: z.string().min(1),
});

const githubTagPageResponseSchema = z.array(githubTagResponseSchema);

const githubReleaseResponseSchema = z.object({
  tag_name: z.string().min(1),
  html_url: z.string().url(),
  draft: z.boolean(),
});

const githubReleasePageResponseSchema = z.array(githubReleaseResponseSchema);

const githubGeneratedReleaseNotesResponseSchema = z.object({
  name: z.string(),
  body: z.string(),
});

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function errorMessage(error: unknown): string {
  if (isHttpRequestFailure(error)) {
    return formatHttpRequestFailure(error);
  }

  if (isError(error)) {
    return error.message;
  }

  return 'Unknown failure';
}

function redactSecret(message: string, secret: string): string {
  if (secret.length === 0) {
    return message;
  }

  return message.replaceAll(secret, '[REDACTED]');
}

function createGitHubApiRoot(githubApiUrl: URL): URL {
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

function createGitHubHeaders(githubToken: string, includesBody: boolean): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };

  if (includesBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function createPageUrl(endpoint: URL, page: number): URL {
  const pageUrl = new URL(endpoint);
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());
  return pageUrl;
}

function createHttpRequest(
  method: HttpMethod,
  url: URL,
  headers: Readonly<Record<string, string>>,
  json: Maybe<NonNullable<unknown>>,
): HttpRequest {
  return {method, url, headers, json};
}

function parseGitHubTagPage(githubResponse: unknown): Result<ParsedGitHubTagPage, Error> {
  const validationResult = githubTagPageResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed GitHub tag response');
  }

  return createSuccess({
    rawItemCount: validationResult.data.length,
    tagNames: validationResult.data.map(tag => {
      return tag.name;
    }),
  });
}

function parseGitHubRelease(githubResponse: unknown): Result<GitHubReleaseRecord, Error> {
  const validationResult = githubReleaseResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed GitHub Release response');
  }

  return createSuccess({
    tagName: validationResult.data.tag_name,
    htmlUrl: validationResult.data.html_url,
    isDraft: validationResult.data.draft,
  });
}

function parseGitHubReleasePage(githubResponse: unknown): Result<GitHubReleasePage, Error> {
  const validationResult = githubReleasePageResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed GitHub Release collection response');
  }

  return createSuccess({
    rawItemCount: validationResult.data.length,
    releases: validationResult.data.map(release => {
      return {
        tagName: release.tag_name,
        htmlUrl: release.html_url,
        isDraft: release.draft,
      };
    }),
  });
}

function parseGitHubGeneratedReleaseNotes(githubResponse: unknown): Result<GitHubGeneratedReleaseNotes, Error> {
  const validationResult = githubGeneratedReleaseNotesResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed generated GitHub Release notes response');
  }

  return createSuccess(validationResult.data);
}

function createDraftReleaseRequestBody(options: CreateDraftReleaseOptions): GitHubCreateReleaseRequestBody {
  return {
    tag_name: options.productionTagName,
    name: options.productionTagName,
    draft: true,
    body: options.body,
  };
}

function requestGitHubJson(options: RequestGitHubJsonOptions): Task<unknown, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(`${options.failureMessage}: ${redactSecret(errorMessage(error), options.githubToken)}`, {
        cause: error,
      });
    },
    (): Promise<unknown> => {
      return options.httpClient.requestJson(options.request);
    },
  );
}

export function createGitHubReleaseClient(
  createGitHubReleaseClientOptions: CreateGitHubReleaseClientOptions,
): GitHubReleaseClient {
  const {httpClient, githubApiUrl, githubRepository, githubToken} = createGitHubReleaseClientOptions;
  const githubApiRoot = createGitHubApiRoot(githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(githubRepository);
  const readHeaders = createGitHubHeaders(githubToken, false);
  const writeHeaders = createGitHubHeaders(githubToken, true);

  return {
    listTagNames(): Task<readonly string[], Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/tags`, githubApiRoot);

      function listTagNamesPage(page: number, accumulatedTagNames: readonly string[]): Task<readonly string[], Error> {
        const request = createHttpRequest('get', createPageUrl(endpoint, page), readHeaders, Maybe.nothing());

        return requestGitHubJson({
          httpClient,
          request,
          failureMessage: 'Unable to list GitHub tag names',
          githubToken,
        }).andThen(githubResponse => {
          const pageResult = parseGitHubTagPage(githubResponse);

          if (pageResult.isErr) {
            return Result.err<readonly string[], Error>(pageResult.error);
          }

          const tagNames = [...accumulatedTagNames, ...pageResult.value.tagNames];

          if (pageResult.value.rawItemCount !== githubPageSize) {
            return Result.ok<readonly string[], Error>(tagNames);
          }

          return listTagNamesPage(page + 1, tagNames);
        });
      }

      return listTagNamesPage(1, []);
    },

    findReleaseByTag(options: FindGitHubReleaseOptions): Task<Maybe<GitHubReleaseRecord>, Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/releases`, githubApiRoot);

      function findReleasePage(page: number): Task<Maybe<GitHubReleaseRecord>, Error> {
        const request = createHttpRequest('get', createPageUrl(endpoint, page), readHeaders, Maybe.nothing());

        return requestGitHubJson({
          httpClient,
          request,
          failureMessage: `Unable to find GitHub Release for tag ${options.tagName}`,
          githubToken,
        }).andThen(githubResponse => {
          const pageResult = parseGitHubReleasePage(githubResponse);

          if (pageResult.isErr) {
            return Result.err<Maybe<GitHubReleaseRecord>, Error>(pageResult.error);
          }

          const matchingRelease = pageResult.value.releases.find(release => {
            return release.tagName === options.tagName;
          });

          if (isUndefined(matchingRelease) === false) {
            return Result.ok<Maybe<GitHubReleaseRecord>, Error>(Maybe.just(matchingRelease));
          }

          if (pageResult.value.rawItemCount !== githubPageSize) {
            return Result.ok<Maybe<GitHubReleaseRecord>, Error>(Maybe.nothing<GitHubReleaseRecord>());
          }

          return findReleasePage(page + 1);
        });
      }

      return findReleasePage(1);
    },

    generateReleaseNotes(options: GenerateReleaseNotesOptions): Task<GitHubGeneratedReleaseNotes, Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/releases/generate-notes`, githubApiRoot);
      const request = createHttpRequest(
        'post',
        endpoint,
        writeHeaders,
        Maybe.just({
          tag_name: options.productionTagName,
          previous_tag_name: options.precedingProductionTagName,
        }),
      );

      return requestGitHubJson({
        httpClient,
        request,
        failureMessage: `Unable to generate GitHub Release notes for tag ${options.productionTagName}`,
        githubToken,
      }).andThen(githubResponse => {
        const generatedReleaseNotesResult = parseGitHubGeneratedReleaseNotes(githubResponse);

        if (generatedReleaseNotesResult.isErr) {
          return generatedReleaseNotesResult;
        }

        return generatedReleaseNotesResult;
      });
    },

    createDraftRelease(options: CreateDraftReleaseOptions): Task<GitHubReleaseRecord, Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/releases`, githubApiRoot);
      const request = createHttpRequest(
        'post',
        endpoint,
        writeHeaders,
        Maybe.just(createDraftReleaseRequestBody(options)),
      );

      return requestGitHubJson({
        httpClient,
        request,
        failureMessage: `Unable to create GitHub Release for tag ${options.productionTagName}`,
        githubToken,
      }).andThen(githubResponse => {
        return parseGitHubRelease(githubResponse);
      });
    },
  };
}
