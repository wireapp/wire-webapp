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

import {isUndefined} from '@sindresorhus/is';
import {Maybe, Result, Task, task} from 'true-myth';
import {z} from 'zod';

import {
  createGitHubApiRoot,
  createGitHubHeaders,
  createGitHubHttpRequest,
  createGitHubPageUrl,
  encodeGitHubRepositoryName,
  formatGitHubRequestError,
  githubApiPageSize,
  redactGitHubSecret,
} from '../releaseGithub/githubApi.ts';
import type {HttpClient, HttpRequest} from '../releaseGithub/githubApi.ts';

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

function parseGitHubTagPage(githubResponse: unknown): Result<ParsedGitHubTagPage, Error> {
  const validationResult = githubTagPageResponseSchema.safeParse(githubResponse);

  if (!validationResult.success) {
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

  if (!validationResult.success) {
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

  if (!validationResult.success) {
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

  if (!validationResult.success) {
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
      const message = formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'});

      return new Error(`${options.failureMessage}: ${redactGitHubSecret(message, options.githubToken)}`, {
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
  const encodedRepositoryName = encodeGitHubRepositoryName(githubRepository);
  const readHeaders = createGitHubHeaders({githubToken, includesJsonBody: false});
  const writeHeaders = createGitHubHeaders({githubToken, includesJsonBody: true});

  return {
    listTagNames(): Task<readonly string[], Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/tags`, githubApiRoot);

      function listTagNamesPage(page: number, accumulatedTagNames: readonly string[]): Task<readonly string[], Error> {
        const request = createGitHubHttpRequest({
          method: 'get',
          url: createGitHubPageUrl({endpoint, page}),
          headers: readHeaders,
          json: Maybe.nothing(),
        });

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

          if (pageResult.value.rawItemCount !== githubApiPageSize) {
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
        const request = createGitHubHttpRequest({
          method: 'get',
          url: createGitHubPageUrl({endpoint, page}),
          headers: readHeaders,
          json: Maybe.nothing(),
        });

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

          if (!isUndefined(matchingRelease)) {
            return Result.ok<Maybe<GitHubReleaseRecord>, Error>(Maybe.just(matchingRelease));
          }

          if (pageResult.value.rawItemCount !== githubApiPageSize) {
            return Result.ok<Maybe<GitHubReleaseRecord>, Error>(Maybe.nothing<GitHubReleaseRecord>());
          }

          return findReleasePage(page + 1);
        });
      }

      return findReleasePage(1);
    },

    generateReleaseNotes(options: GenerateReleaseNotesOptions): Task<GitHubGeneratedReleaseNotes, Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/releases/generate-notes`, githubApiRoot);
      const request = createGitHubHttpRequest({
        method: 'post',
        url: endpoint,
        headers: writeHeaders,
        json: Maybe.just({
          tag_name: options.productionTagName,
          previous_tag_name: options.precedingProductionTagName,
        }),
      });

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
      const request = createGitHubHttpRequest({
        method: 'post',
        url: endpoint,
        headers: writeHeaders,
        json: Maybe.just(createDraftReleaseRequestBody(options)),
      });

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
