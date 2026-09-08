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

import {Result, Task} from 'true-myth';

import type {GitHubReleaseClient, GitHubReleaseRecord} from './githubReleaseClient.ts';

import {selectPrecedingProductionTag, validateProductionTagName} from '../release-metadata/releaseMetadata.ts';

export type ProductionGitHubReleaseAction = 'created' | 'already_draft' | 'already_published';
export type ProductionGitHubReleaseState = 'draft' | 'published';

export type ProductionGitHubReleaseHandoff = {
  readonly action: ProductionGitHubReleaseAction;
  readonly state: ProductionGitHubReleaseState;
  readonly tagName: string;
  readonly url: string;
};

export type EnsureProductionGitHubReleaseOptions = {
  readonly currentProductionTagName: string;
  readonly githubReleaseClient: GitHubReleaseClient;
};

const noPrecedingProductionReleaseNotes =
  'No preceding ADR Production release was found. Add the customer-facing changelog manually before publication.';

function createExistingReleaseHandoff(
  currentProductionTagName: string,
  existingRelease: GitHubReleaseRecord,
): Result<ProductionGitHubReleaseHandoff, Error> {
  if (existingRelease.tagName !== currentProductionTagName) {
    return Result.err(
      new Error(
        `The GitHub Release lookup returned tag ${existingRelease.tagName} instead of ${currentProductionTagName}.`,
      ),
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

  return Result.ok({
    action: 'created',
    state: 'draft',
    tagName: createdRelease.tagName,
    url: createdRelease.htmlUrl,
  });
}

export function ensureProductionGitHubRelease(
  options: EnsureProductionGitHubReleaseOptions,
): Task<ProductionGitHubReleaseHandoff, Error> {
  const validatedProductionTagNameResult = validateProductionTagName(options.currentProductionTagName);

  if (validatedProductionTagNameResult.isErr) {
    return Task.reject<ProductionGitHubReleaseHandoff, Error>(validatedProductionTagNameResult.error);
  }

  const productionTagName = validatedProductionTagNameResult.value;
  return options.githubReleaseClient
    .findReleaseByTag({
      tagName: productionTagName,
    })
    .andThen(existingRelease => {
      if (existingRelease.isJust) {
        return createExistingReleaseHandoff(productionTagName, existingRelease.value);
      }

      return options.githubReleaseClient.listTagNames().andThen(existingTagNames => {
        const precedingProductionTagResult = selectPrecedingProductionTag(productionTagName, existingTagNames);

        if (precedingProductionTagResult.isErr) {
          return Task.reject<ProductionGitHubReleaseHandoff, Error>(precedingProductionTagResult.error);
        }

        if (precedingProductionTagResult.value.isJust) {
          return options.githubReleaseClient
            .generateReleaseNotes({
              productionTagName,
              precedingProductionTagName: precedingProductionTagResult.value.value,
            })
            .andThen(generatedReleaseNotes => {
              return options.githubReleaseClient.createDraftRelease({
                productionTagName,
                body: generatedReleaseNotes.body,
              });
            })
            .andThen(createdRelease => {
              return createNewReleaseHandoff(productionTagName, createdRelease);
            });
        }

        return options.githubReleaseClient
          .createDraftRelease({
            productionTagName,
            body: noPrecedingProductionReleaseNotes,
          })
          .andThen(createdRelease => {
            return createNewReleaseHandoff(productionTagName, createdRelease);
          });
      });
    });
}
