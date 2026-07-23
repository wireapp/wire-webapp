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

import is from '@sindresorhus/is';
import {Maybe, Result} from 'true-myth';

export const releaseAppearanceCommentMarker = '<!-- wire-webapp-release-appearance:v1';

const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;
const betaCandidateTagPattern = new RegExp(String.raw`^(${releaseIdentifierPattern})-beta\.(\d+)$`);
const productionTagPattern = new RegExp(String.raw`^${releaseIdentifierPattern}-production$`);
const commitHashPattern = /^[0-9a-f]{40}$/i;

export type ReleaseAppearanceEnvironment = 'beta' | 'production';

export type BetaCandidateTag = {
  readonly candidateNumber: number;
  readonly releaseIdentifier: string;
  readonly tagName: string;
};

export type CommitRangeRelationship = {
  readonly commitDistanceFromMergeBase: number;
  readonly mergeBaseCommitHash: string;
  readonly tagCommitHash: string;
  readonly tagName: string;
  readonly tagTimestampSeconds: number;
};

export type CommitDiscoveryRange = {
  readonly baselineCommitHash: string;
  readonly baselineTagName: string;
  readonly mergeBaseCommitHash: string;
  readonly revisionRange: string;
};

export type ReleaseAppearanceValue = {
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

export type ReleaseAppearanceCommentState = {
  readonly beta: Maybe<ReleaseAppearanceValue>;
  readonly production: Maybe<ReleaseAppearanceValue>;
};

type SerializedReleaseAppearanceCommentState = {
  readonly beta?: ReleaseAppearanceValue;
  readonly production?: ReleaseAppearanceValue;
};

export type ReleaseAppearanceComment = {
  readonly commentId: number;
  readonly body: string;
};

export type PreparedReleaseAppearanceComment =
  | {
      readonly action: 'create';
      readonly body: string;
    }
  | {
      readonly action: 'unchanged' | 'update';
      readonly body: string;
      readonly commentId: number;
    };

export type BetaDiscoveryRangeSelectionParameters = {
  readonly currentBetaTagName: string;
  readonly currentCommitHash: string;
  readonly betaTagRelationships: readonly CommitRangeRelationship[];
  readonly existingBetaTagNames: readonly string[];
  readonly productionTagRelationships: readonly CommitRangeRelationship[];
};

export type ProductionDiscoveryRangeSelectionParameters = {
  readonly currentCommitHash: string;
  readonly currentProductionTagName: string;
  readonly productionTagRelationships: readonly CommitRangeRelationship[];
};

export type PrepareReleaseAppearanceCommentParameters = {
  readonly comments: readonly ReleaseAppearanceComment[];
  readonly environment: ReleaseAppearanceEnvironment;
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

function isValidCommitHash(commitHash: string): boolean {
  return is.nonEmptyString(commitHash) && commitHashPattern.test(commitHash);
}

function isValidWorkflowRunUrl(workflowRunUrl: string): boolean {
  if (!is.urlString(workflowRunUrl)) {
    return false;
  }

  try {
    const parsedWorkflowRunUrl = new URL(workflowRunUrl);
    return parsedWorkflowRunUrl.protocol === 'https:' || parsedWorkflowRunUrl.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidReleaseAppearanceValue(
  value: unknown,
  environment: ReleaseAppearanceEnvironment,
): value is ReleaseAppearanceValue {
  if (!is.plainObject(value) || !is.nonEmptyString(value.tagName) || !is.nonEmptyString(value.workflowRunUrl)) {
    return false;
  }

  const hasValidTagName =
    environment === 'beta' ? betaCandidateTagPattern.test(value.tagName) : productionTagPattern.test(value.tagName);

  return hasValidTagName && isValidWorkflowRunUrl(value.workflowRunUrl);
}

function isValidReleaseAppearanceCommentState(value: unknown): value is SerializedReleaseAppearanceCommentState {
  if (!is.plainObject(value)) {
    return false;
  }

  const hasValidBetaValue = is.undefined(value.beta) || isValidReleaseAppearanceValue(value.beta, 'beta');
  const hasValidProductionValue =
    is.undefined(value.production) || isValidReleaseAppearanceValue(value.production, 'production');

  return hasValidBetaValue && hasValidProductionValue;
}

function createReleaseAppearanceValue(
  environment: ReleaseAppearanceEnvironment,
  tagName: string,
  workflowRunUrl: string,
): Result<ReleaseAppearanceValue, Error> {
  if (!isValidReleaseAppearanceValue({tagName, workflowRunUrl}, environment)) {
    return Result.err(new Error(`Invalid ${environment} release appearance value.`));
  }

  return Result.ok({tagName, workflowRunUrl});
}

export function parseBetaCandidateTag(tagName: string): Result<BetaCandidateTag, Error> {
  const betaCandidateTagMatch = betaCandidateTagPattern.exec(tagName);

  if (betaCandidateTagMatch === null) {
    return Result.err(new Error(`Invalid Beta candidate tag name: ${tagName}`));
  }

  const candidateNumber = Number(betaCandidateTagMatch[2]);

  if (!is.integer(candidateNumber) || candidateNumber < 1) {
    return Result.err(new Error(`Invalid Beta candidate tag number: ${tagName}`));
  }

  return Result.ok({
    candidateNumber,
    releaseIdentifier: betaCandidateTagMatch[1],
    tagName,
  });
}

export function selectPreviousBetaTag(
  currentBetaTagName: string,
  existingTagNames: readonly string[],
): Result<Maybe<BetaCandidateTag>, Error> {
  const currentBetaCandidateTagResult = parseBetaCandidateTag(currentBetaTagName);

  if (currentBetaCandidateTagResult.isErr) {
    return Result.err(currentBetaCandidateTagResult.error);
  }

  const currentBetaCandidateTag = currentBetaCandidateTagResult.value;
  const previousBetaCandidateTags = existingTagNames.flatMap(existingTagName => {
    const existingBetaCandidateTagResult = parseBetaCandidateTag(existingTagName);

    if (existingBetaCandidateTagResult.isErr) {
      return [];
    }

    const existingBetaCandidateTag = existingBetaCandidateTagResult.value;

    if (
      existingBetaCandidateTag.releaseIdentifier !== currentBetaCandidateTag.releaseIdentifier ||
      existingBetaCandidateTag.candidateNumber >= currentBetaCandidateTag.candidateNumber
    ) {
      return [];
    }

    return [existingBetaCandidateTag];
  });

  const previousBetaCandidateTag = previousBetaCandidateTags.reduce<Maybe<BetaCandidateTag>>(
    (latestBetaCandidateTag, candidateTag) => {
      if (
        latestBetaCandidateTag.isNothing ||
        candidateTag.candidateNumber > latestBetaCandidateTag.value.candidateNumber
      ) {
        return Maybe.just(candidateTag);
      }

      return latestBetaCandidateTag;
    },
    Maybe.nothing(),
  );

  return Result.ok(previousBetaCandidateTag);
}

function compareProductionBaselineCandidates(
  leftCandidate: CommitRangeRelationship,
  rightCandidate: CommitRangeRelationship,
): number {
  const leftIsDirectAncestor = leftCandidate.tagCommitHash === leftCandidate.mergeBaseCommitHash;
  const rightIsDirectAncestor = rightCandidate.tagCommitHash === rightCandidate.mergeBaseCommitHash;

  if (leftIsDirectAncestor !== rightIsDirectAncestor) {
    return leftIsDirectAncestor ? -1 : 1;
  }

  if (leftCandidate.commitDistanceFromMergeBase !== rightCandidate.commitDistanceFromMergeBase) {
    return leftCandidate.commitDistanceFromMergeBase - rightCandidate.commitDistanceFromMergeBase;
  }

  if (leftCandidate.tagTimestampSeconds !== rightCandidate.tagTimestampSeconds) {
    return rightCandidate.tagTimestampSeconds - leftCandidate.tagTimestampSeconds;
  }

  return leftCandidate.tagName.localeCompare(rightCandidate.tagName);
}

export function selectPreviousProductionBaseline(
  currentProductionTagName: string,
  currentCommitHash: string,
  productionTagRelationships: readonly CommitRangeRelationship[],
): Result<CommitRangeRelationship, Error> {
  if (!productionTagPattern.test(currentProductionTagName)) {
    return Result.err(new Error(`Invalid Production tag name: ${currentProductionTagName}`));
  }

  if (!isValidCommitHash(currentCommitHash)) {
    return Result.err(new Error(`Invalid current release commit SHA: ${currentCommitHash}`));
  }

  const previousProductionBaselineCandidates = productionTagRelationships.filter(productionTagRelationship => {
    return (
      productionTagRelationship.tagName !== currentProductionTagName &&
      productionTagRelationship.tagCommitHash !== currentCommitHash &&
      isValidCommitHash(productionTagRelationship.tagCommitHash) &&
      isValidCommitHash(productionTagRelationship.mergeBaseCommitHash) &&
      productionTagRelationship.commitDistanceFromMergeBase >= 0
    );
  });

  const selectedProductionBaseline = Maybe.of(
    previousProductionBaselineCandidates.toSorted(compareProductionBaselineCandidates)[0],
  );

  if (selectedProductionBaseline.isNothing) {
    return Result.err(new Error('Unable to find a verified Production baseline without using the repository root.'));
  }

  return Result.ok(selectedProductionBaseline.value);
}

function findCommitRangeRelationship(
  tagName: string,
  relationships: readonly CommitRangeRelationship[],
): Result<CommitRangeRelationship, Error> {
  const relationship = Maybe.of(
    relationships.find(candidateRelationship => {
      return candidateRelationship.tagName === tagName;
    }),
  );

  if (relationship.isNothing) {
    return Result.err(new Error(`Missing commit relationship for baseline tag: ${tagName}`));
  }

  return Result.ok(relationship.value);
}

function createCommitDiscoveryRange(
  baselineRelationship: CommitRangeRelationship,
  currentCommitHash: string,
): Result<CommitDiscoveryRange, Error> {
  if (!isValidCommitHash(currentCommitHash)) {
    return Result.err(new Error(`Invalid current release commit SHA: ${currentCommitHash}`));
  }

  if (
    !isValidCommitHash(baselineRelationship.tagCommitHash) ||
    !isValidCommitHash(baselineRelationship.mergeBaseCommitHash)
  ) {
    return Result.err(new Error(`Invalid commit relationship for baseline tag: ${baselineRelationship.tagName}`));
  }

  return Result.ok({
    baselineCommitHash: baselineRelationship.tagCommitHash,
    baselineTagName: baselineRelationship.tagName,
    mergeBaseCommitHash: baselineRelationship.mergeBaseCommitHash,
    revisionRange: `${baselineRelationship.mergeBaseCommitHash}..${currentCommitHash}`,
  });
}

export function selectBetaDiscoveryRange(
  parameters: BetaDiscoveryRangeSelectionParameters,
): Result<CommitDiscoveryRange, Error> {
  const previousBetaTagResult = selectPreviousBetaTag(parameters.currentBetaTagName, parameters.existingBetaTagNames);

  if (previousBetaTagResult.isErr) {
    return Result.err(previousBetaTagResult.error);
  }

  const currentBetaCandidateTagResult = parseBetaCandidateTag(parameters.currentBetaTagName);

  if (currentBetaCandidateTagResult.isErr) {
    return Result.err(currentBetaCandidateTagResult.error);
  }

  let baselineTagName: string;

  if (previousBetaTagResult.value.isJust) {
    baselineTagName = previousBetaTagResult.value.value.tagName;
  } else {
    const previousProductionBaselineResult = selectPreviousProductionBaseline(
      `${currentBetaCandidateTagResult.value.releaseIdentifier}-production`,
      parameters.currentCommitHash,
      parameters.productionTagRelationships,
    );

    if (previousProductionBaselineResult.isErr) {
      return Result.err(previousProductionBaselineResult.error);
    }

    baselineTagName = previousProductionBaselineResult.value.tagName;
  }

  const baselineRelationships = previousBetaTagResult.value.isJust
    ? parameters.betaTagRelationships
    : parameters.productionTagRelationships;
  const baselineRelationshipResult = findCommitRangeRelationship(baselineTagName, baselineRelationships);

  if (baselineRelationshipResult.isErr) {
    return Result.err(baselineRelationshipResult.error);
  }

  return createCommitDiscoveryRange(baselineRelationshipResult.value, parameters.currentCommitHash);
}

export function selectProductionDiscoveryRange(
  parameters: ProductionDiscoveryRangeSelectionParameters,
): Result<CommitDiscoveryRange, Error> {
  const previousProductionBaselineResult = selectPreviousProductionBaseline(
    parameters.currentProductionTagName,
    parameters.currentCommitHash,
    parameters.productionTagRelationships,
  );

  if (previousProductionBaselineResult.isErr) {
    return Result.err(previousProductionBaselineResult.error);
  }

  return createCommitDiscoveryRange(previousProductionBaselineResult.value, parameters.currentCommitHash);
}

function parseAppearanceCommentState(commentBody: string): Result<ReleaseAppearanceCommentState, Error> {
  const markerIndex = commentBody.indexOf(releaseAppearanceCommentMarker);

  if (markerIndex === -1) {
    return Result.err(new Error('Release appearance marker is missing.'));
  }

  const secondMarkerIndex = commentBody.indexOf(
    releaseAppearanceCommentMarker,
    markerIndex + releaseAppearanceCommentMarker.length,
  );

  if (secondMarkerIndex !== -1) {
    return Result.err(new Error('Release appearance marker occurs more than once in one comment.'));
  }

  const commentEndIndex = commentBody.indexOf('-->', markerIndex + releaseAppearanceCommentMarker.length);

  if (commentEndIndex === -1) {
    return Result.err(new Error('Release appearance comment is missing its closing marker.'));
  }

  const serializedState = commentBody
    .slice(markerIndex + releaseAppearanceCommentMarker.length, commentEndIndex)
    .trim();

  try {
    const parsedState: unknown = JSON.parse(serializedState);

    if (!isValidReleaseAppearanceCommentState(parsedState)) {
      return Result.err(new Error('Release appearance comment contains invalid state.'));
    }

    return Result.ok({
      beta: is.undefined(parsedState.beta) ? Maybe.nothing() : Maybe.just(parsedState.beta),
      production: is.undefined(parsedState.production) ? Maybe.nothing() : Maybe.just(parsedState.production),
    });
  } catch {
    return Result.err(new Error('Release appearance comment contains invalid JSON state.'));
  }
}

function countMarkerComments(comments: readonly ReleaseAppearanceComment[]): number {
  return comments.reduce((markerCommentCount, comment) => {
    return comment.body.includes(releaseAppearanceCommentMarker) ? markerCommentCount + 1 : markerCommentCount;
  }, 0);
}

function createCommentState(
  environment: ReleaseAppearanceEnvironment,
  tagName: string,
  workflowRunUrl: string,
): Result<ReleaseAppearanceCommentState, Error> {
  return addMissingCommentStateValue(
    {
      beta: Maybe.nothing(),
      production: Maybe.nothing(),
    },
    environment,
    tagName,
    workflowRunUrl,
  );
}

function addMissingCommentStateValue(
  state: ReleaseAppearanceCommentState,
  environment: ReleaseAppearanceEnvironment,
  tagName: string,
  workflowRunUrl: string,
): Result<ReleaseAppearanceCommentState, Error> {
  const releaseAppearanceValueResult = createReleaseAppearanceValue(environment, tagName, workflowRunUrl);

  if (releaseAppearanceValueResult.isErr) {
    return Result.err(releaseAppearanceValueResult.error);
  }

  return Result.ok(
    environment === 'beta'
      ? {...state, beta: Maybe.just(releaseAppearanceValueResult.value)}
      : {...state, production: Maybe.just(releaseAppearanceValueResult.value)},
  );
}

function serializeReleaseAppearanceCommentState(
  state: ReleaseAppearanceCommentState,
): SerializedReleaseAppearanceCommentState {
  return {
    ...(state.beta.isJust ? {beta: state.beta.value} : {}),
    ...(state.production.isJust ? {production: state.production.value} : {}),
  };
}

export function renderReleaseAppearanceComment(state: ReleaseAppearanceCommentState): string {
  const betaReleaseTag = state.beta
    .map(releaseAppearanceValue => {
      return releaseAppearanceValue.tagName;
    })
    .unwrapOr('Not yet deployed');
  const productionReleaseTag = state.production
    .map(releaseAppearanceValue => {
      return releaseAppearanceValue.tagName;
    })
    .unwrapOr('Not yet deployed');

  return [
    releaseAppearanceCommentMarker,
    JSON.stringify(serializeReleaseAppearanceCommentState(state)),
    '-->',
    '',
    '### First appeared in',
    '',
    '| Environment | Release |',
    '| --- | --- |',
    `| Beta | ${betaReleaseTag} |`,
    `| Production | ${productionReleaseTag} |`,
  ].join('\n');
}

export function prepareReleaseAppearanceComment(
  parameters: PrepareReleaseAppearanceCommentParameters,
): Result<PreparedReleaseAppearanceComment, Error> {
  const markerCommentCount = countMarkerComments(parameters.comments);

  if (markerCommentCount > 1) {
    return Result.err(new Error('More than one release appearance marker comment exists.'));
  }

  if (markerCommentCount === 0) {
    const commentStateResult = createCommentState(
      parameters.environment,
      parameters.tagName,
      parameters.workflowRunUrl,
    );

    if (commentStateResult.isErr) {
      return Result.err(commentStateResult.error);
    }

    return Result.ok({action: 'create', body: renderReleaseAppearanceComment(commentStateResult.value)});
  }

  const markerComment = Maybe.of(
    parameters.comments.find(comment => {
      return comment.body.includes(releaseAppearanceCommentMarker);
    }),
  );

  if (markerComment.isNothing) {
    return Result.err(new Error('Unable to resolve the release appearance marker comment.'));
  }

  const existingStateResult = parseAppearanceCommentState(markerComment.value.body);

  if (existingStateResult.isErr) {
    return Result.err(existingStateResult.error);
  }

  const existingReleaseAppearanceValue = existingStateResult.value[parameters.environment];

  if (existingReleaseAppearanceValue.isJust) {
    return Result.ok({
      action: 'unchanged',
      body: markerComment.value.body,
      commentId: markerComment.value.commentId,
    });
  }

  const updatedStateResult = addMissingCommentStateValue(
    existingStateResult.value,
    parameters.environment,
    parameters.tagName,
    parameters.workflowRunUrl,
  );

  if (updatedStateResult.isErr) {
    return Result.err(updatedStateResult.error);
  }

  return Result.ok({
    action: 'update',
    body: renderReleaseAppearanceComment(updatedStateResult.value),
    commentId: markerComment.value.commentId,
  });
}
