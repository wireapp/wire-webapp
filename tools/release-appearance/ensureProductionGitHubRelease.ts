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

import {Maybe, Result, Task} from 'true-myth';

import type {GitHubReleaseClient, GitHubReleaseRecord} from './githubReleaseClient.ts';

import {compareWebAppVersions, validateWebAppVersion} from '../release-metadata/webappVersion.ts';
import type {WebAppVersion} from '../release-metadata/webappVersion.ts';

export type ProductionGitHubReleaseAction = 'created' | 'already_draft' | 'already_published';
export type ProductionGitHubReleaseState = 'draft' | 'published';

export type ProductionGitHubReleaseHandoff = {
  readonly action: ProductionGitHubReleaseAction;
  readonly state: ProductionGitHubReleaseState;
  readonly tagName: string;
  readonly url: string;
};

export type EnsureProductionGitHubReleaseOptions = {
  readonly productionTagName: string;
};

export type EnsureProductionGitHubReleaseDependencies = {
  readonly githubReleaseClient: GitHubReleaseClient;
};

type StableProductionTag = {
  readonly tagName: string;
  readonly version: WebAppVersion;
};

const noPrecedingProductionReleaseNotes =
  'No preceding stable WebApp Production release was found. Add the customer-facing changelog manually before publication.';

function parseStableProductionTag(productionTagName: string): Result<StableProductionTag, Error> {
  if (productionTagName.startsWith('v') === false) {
    return Result.err(new Error(`Invalid stable WebApp Production tag: ${productionTagName}`));
  }

  const versionResult = validateWebAppVersion(productionTagName.slice(1));
  if (versionResult.isErr) {
    return Result.err(
      new Error(`Invalid stable WebApp Production tag: ${productionTagName}`, {cause: versionResult.error}),
    );
  }

  if (productionTagName !== `v${versionResult.value}`) {
    return Result.err(new Error(`Invalid stable WebApp Production tag: ${productionTagName}`));
  }

  return Result.ok({tagName: productionTagName, version: versionResult.value});
}

function selectPrecedingStableProductionTag(
  productionTagNames: readonly string[],
  currentProductionTag: StableProductionTag,
): Maybe<StableProductionTag> {
  let precedingProductionTag: Maybe<StableProductionTag> = Maybe.nothing<StableProductionTag>();

  for (const productionTagName of productionTagNames) {
    const productionTagResult = parseStableProductionTag(productionTagName);
    if (productionTagResult.isErr) {
      continue;
    }

    const candidateProductionTag = productionTagResult.value;
    const currentVersionComparison = compareWebAppVersions(
      candidateProductionTag.version,
      currentProductionTag.version,
    );
    if (currentVersionComparison.isErr || currentVersionComparison.value >= 0) {
      continue;
    }

    if (precedingProductionTag.isNothing) {
      precedingProductionTag = Maybe.just(candidateProductionTag);
      continue;
    }

    const candidateComparison = compareWebAppVersions(
      candidateProductionTag.version,
      precedingProductionTag.value.version,
    );
    if (candidateComparison.isOk && candidateComparison.value > 0) {
      precedingProductionTag = Maybe.just(candidateProductionTag);
    }
  }

  return precedingProductionTag;
}

function createExistingReleaseHandoff(
  productionTagName: string,
  existingRelease: GitHubReleaseRecord,
): Result<ProductionGitHubReleaseHandoff, Error> {
  if (existingRelease.tagName !== productionTagName) {
    return Result.err(
      new Error(`The GitHub Release lookup returned tag ${existingRelease.tagName} instead of ${productionTagName}.`),
    );
  }

  if (existingRelease.isDraft) {
    return Result.ok({
      action: 'already_draft',
      state: 'draft',
      tagName: existingRelease.tagName,
      url: existingRelease.htmlUrl,
    });
  }

  return Result.ok({
    action: 'already_published',
    state: 'published',
    tagName: existingRelease.tagName,
    url: existingRelease.htmlUrl,
  });
}

function createNewReleaseHandoff(
  productionTagName: string,
  createdRelease: GitHubReleaseRecord,
): Result<ProductionGitHubReleaseHandoff, Error> {
  if (createdRelease.tagName !== productionTagName) {
    return Result.err(
      new Error(`The GitHub Release creation returned tag ${createdRelease.tagName} instead of ${productionTagName}.`),
    );
  }

  if (createdRelease.isDraft === false) {
    return Result.err(new Error(`The GitHub Release for ${productionTagName} was not created as a draft.`));
  }

  return Result.ok({action: 'created', state: 'draft', tagName: createdRelease.tagName, url: createdRelease.htmlUrl});
}

export function ensureProductionGitHubRelease(
  options: EnsureProductionGitHubReleaseOptions,
  dependencies: EnsureProductionGitHubReleaseDependencies,
): Task<ProductionGitHubReleaseHandoff, Error> {
  const productionTagResult = parseStableProductionTag(options.productionTagName);
  if (productionTagResult.isErr) {
    return Task.reject(productionTagResult.error);
  }

  const productionTagName = productionTagResult.value.tagName;
  return dependencies.githubReleaseClient.findReleaseByTag({tagName: productionTagName}).andThen(existingRelease => {
    if (existingRelease.isJust) {
      return createExistingReleaseHandoff(productionTagName, existingRelease.value);
    }

    return dependencies.githubReleaseClient.listTagNames().andThen(productionTagNames => {
      const precedingProductionTag = selectPrecedingStableProductionTag(productionTagNames, productionTagResult.value);
      if (precedingProductionTag.isNothing) {
        return dependencies.githubReleaseClient
          .createDraftRelease({productionTagName, body: noPrecedingProductionReleaseNotes})
          .andThen(createdRelease => {
            return createNewReleaseHandoff(productionTagName, createdRelease);
          });
      }

      return dependencies.githubReleaseClient
        .generateReleaseNotes({
          productionTagName,
          precedingProductionTagName: precedingProductionTag.value.tagName,
        })
        .andThen(generatedReleaseNotes => {
          return dependencies.githubReleaseClient.createDraftRelease({
            productionTagName,
            body: generatedReleaseNotes.body,
          });
        })
        .andThen(createdRelease => {
          return createNewReleaseHandoff(productionTagName, createdRelease);
        });
    });
  });
}
