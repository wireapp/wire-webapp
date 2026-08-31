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

import {Maybe, Task} from 'true-myth';

import {ensureProductionGitHubRelease} from './ensureProductionGitHubRelease.ts';
import type {GitHubGeneratedReleaseNotes, GitHubReleaseClient, GitHubReleaseRecord} from './githubReleaseClient.ts';

type FakeGitHubReleaseClientOptions = {
  readonly existingRelease: Maybe<GitHubReleaseRecord>;
  readonly tagNames: readonly string[];
};

type FakeGitHubReleaseClientFixture = {
  readonly githubReleaseClient: GitHubReleaseClient;
  readonly findReleaseTagNames: string[];
  readonly listTagNamesCallCount: number[];
  readonly generateReleaseNotesOptions: Parameters<GitHubReleaseClient['generateReleaseNotes']>[0][];
  readonly createDraftReleaseOptions: Parameters<GitHubReleaseClient['createDraftRelease']>[0][];
};

const generatedReleaseNotesBody = 'Generated release notes';

function createFakeGitHubReleaseClient(
  fakeGitHubReleaseClientOptions: FakeGitHubReleaseClientOptions,
): FakeGitHubReleaseClientFixture {
  const findReleaseTagNames: string[] = [];
  const listTagNamesCallCount: number[] = [];
  const generateReleaseNotesOptions: Parameters<GitHubReleaseClient['generateReleaseNotes']>[0][] = [];
  const createDraftReleaseOptions: Parameters<GitHubReleaseClient['createDraftRelease']>[0][] = [];
  return {
    findReleaseTagNames,
    listTagNamesCallCount,
    generateReleaseNotesOptions,
    createDraftReleaseOptions,
    githubReleaseClient: {
      listTagNames(): Task<readonly string[], Error> {
        listTagNamesCallCount.push(1);
        return Task.resolve(fakeGitHubReleaseClientOptions.tagNames);
      },
      findReleaseByTag(options): Task<Maybe<GitHubReleaseRecord>, Error> {
        findReleaseTagNames.push(options.tagName);
        return Task.resolve(fakeGitHubReleaseClientOptions.existingRelease);
      },
      generateReleaseNotes(options): Task<GitHubGeneratedReleaseNotes, Error> {
        generateReleaseNotesOptions.push(options);
        return Task.resolve({name: options.productionTagName, body: generatedReleaseNotesBody});
      },
      createDraftRelease(options): Task<GitHubReleaseRecord, Error> {
        createDraftReleaseOptions.push(options);
        return Task.resolve({
          tagName: options.productionTagName,
          htmlUrl: `https://github.com/wireapp/wire-webapp/releases/tag/${options.productionTagName}`,
          isDraft: true,
        });
      },
    },
  };
}

function createExistingRelease(isDraft: boolean): GitHubReleaseRecord {
  return {
    tagName: '2026-08-28.1-production',
    htmlUrl: 'https://github.com/wireapp/wire-webapp/releases/tag/2026-08-28.1-production',
    isDraft,
  };
}

describe('ensureProductionGitHubRelease', () => {
  it('creates a new draft with the preceding Production tag when no Release exists', async (): Promise<void> => {
    const fakeGitHubReleaseClient = createFakeGitHubReleaseClient({
      existingRelease: Maybe.nothing(),
      tagNames: ['2026-08-07.1-production', '2026-08-28.1-beta.1', '2026-08-28-staging.0', '2026-08-28-production.0'],
    });

    const actualResult = await ensureProductionGitHubRelease({
      currentProductionTagName: '2026-08-28.1-production',
      githubReleaseClient: fakeGitHubReleaseClient.githubReleaseClient,
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      action: 'created',
      state: 'draft',
      tagName: '2026-08-28.1-production',
      url: 'https://github.com/wireapp/wire-webapp/releases/tag/2026-08-28.1-production',
    });
    expect(fakeGitHubReleaseClient.findReleaseTagNames).toEqual(['2026-08-28.1-production']);
    expect(fakeGitHubReleaseClient.listTagNamesCallCount).toHaveLength(1);
    expect(fakeGitHubReleaseClient.generateReleaseNotesOptions).toEqual([
      {
        productionTagName: '2026-08-28.1-production',
        precedingProductionTagName: '2026-08-07.1-production',
      },
    ]);
    expect(fakeGitHubReleaseClient.createDraftReleaseOptions).toEqual([
      {
        productionTagName: '2026-08-28.1-production',
        body: generatedReleaseNotesBody,
      },
    ]);
  });

  it('preserves an existing draft without listing tags or creating a Release', async (): Promise<void> => {
    const existingRelease = createExistingRelease(true);
    const fakeGitHubReleaseClient = createFakeGitHubReleaseClient({
      existingRelease: Maybe.just(existingRelease),
      tagNames: [],
    });

    const actualResult = await ensureProductionGitHubRelease({
      currentProductionTagName: '2026-08-28.1-production',
      githubReleaseClient: fakeGitHubReleaseClient.githubReleaseClient,
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      action: 'already_draft',
      state: 'draft',
      tagName: existingRelease.tagName,
      url: existingRelease.htmlUrl,
    });
    expect(fakeGitHubReleaseClient.listTagNamesCallCount).toHaveLength(0);
    expect(fakeGitHubReleaseClient.generateReleaseNotesOptions).toHaveLength(0);
    expect(fakeGitHubReleaseClient.createDraftReleaseOptions).toHaveLength(0);
  });

  it('preserves an existing published Release without listing tags or creating a Release', async (): Promise<void> => {
    const existingRelease = createExistingRelease(false);
    const fakeGitHubReleaseClient = createFakeGitHubReleaseClient({
      existingRelease: Maybe.just(existingRelease),
      tagNames: [],
    });

    const actualResult = await ensureProductionGitHubRelease({
      currentProductionTagName: '2026-08-28.1-production',
      githubReleaseClient: fakeGitHubReleaseClient.githubReleaseClient,
    });

    assert(actualResult.isOk);
    expect(actualResult.value.action).toBe('already_published');
    expect(actualResult.value.state).toBe('published');
    expect(fakeGitHubReleaseClient.listTagNamesCallCount).toHaveLength(0);
    expect(fakeGitHubReleaseClient.generateReleaseNotesOptions).toHaveLength(0);
    expect(fakeGitHubReleaseClient.createDraftReleaseOptions).toHaveLength(0);
  });

  it('creates a bootstrap draft without using the entire tag history as release notes', async (): Promise<void> => {
    const fakeGitHubReleaseClient = createFakeGitHubReleaseClient({
      existingRelease: Maybe.nothing(),
      tagNames: ['2026-07-27.1-beta.1', '2026-07-27-staging.0', '2026-07-27-production.0'],
    });

    const actualResult = await ensureProductionGitHubRelease({
      currentProductionTagName: '2026-07-27.1-production',
      githubReleaseClient: fakeGitHubReleaseClient.githubReleaseClient,
    });

    assert(actualResult.isOk);
    expect(fakeGitHubReleaseClient.generateReleaseNotesOptions).toHaveLength(0);
    expect(fakeGitHubReleaseClient.createDraftReleaseOptions).toEqual([
      {
        productionTagName: '2026-07-27.1-production',
        body: 'No preceding ADR Production release was found. Add the customer-facing changelog manually before publication.',
      },
    ]);
  });

  it('rejects a Beta tag without making any GitHub Release requests', async (): Promise<void> => {
    const fakeGitHubReleaseClient = createFakeGitHubReleaseClient({
      existingRelease: Maybe.nothing(),
      tagNames: [],
    });

    const actualResult = await ensureProductionGitHubRelease({
      currentProductionTagName: '2026-08-28.1-beta.1',
      githubReleaseClient: fakeGitHubReleaseClient.githubReleaseClient,
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Invalid production tag name: 2026-08-28.1-beta.1');
    expect(fakeGitHubReleaseClient.findReleaseTagNames).toHaveLength(0);
    expect(fakeGitHubReleaseClient.listTagNamesCallCount).toHaveLength(0);
    expect(fakeGitHubReleaseClient.generateReleaseNotesOptions).toHaveLength(0);
    expect(fakeGitHubReleaseClient.createDraftReleaseOptions).toHaveLength(0);
  });
});
