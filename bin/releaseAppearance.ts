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
import type {Unit} from 'true-myth';

export const releaseAppearanceCommentMarker = '<!-- wire-webapp-release-appearance:v1';
export const releaseAppearanceTestCommentMarker = '<!-- wire-webapp-release-appearance-test:v1';

const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;
const betaCandidateTagPattern = new RegExp(String.raw`^(${releaseIdentifierPattern})-beta\.(\d+)$`);
const productionTagPattern = new RegExp(String.raw`^(${releaseIdentifierPattern})-production$`);
const commitHashPattern = /^[0-9a-f]{40}$/i;

export type ReleaseAppearanceEnvironment = 'beta' | 'production';
export type ReleaseAppearanceCommentMode = 'production' | 'test';

export type BetaCandidateTag = {
  readonly candidateNumber: number;
  readonly releaseIdentifier: string;
  readonly tagName: string;
};

export type CommitRangeRelationship = {
  readonly commitDistanceFromMergeBase: number;
  readonly mergeBaseCommitHash: string;
  readonly tagCommitHash: string;
  readonly tagCreatedAtSeconds: number;
  readonly tagName: string;
};

export type ReleaseTagMetadata = {
  readonly releaseIdentifier: string;
  readonly tagCommitHash: string;
  readonly tagCreatedAtSeconds: number;
  readonly tagName: string;
};

export type ProductionReleaseTag = {
  readonly releaseIdentifier: string;
  readonly tagName: string;
};

export type CommitDiscoveryRange = {
  readonly baselineCommitHash: string;
  readonly baselineTagName: string;
  readonly mergeBaseCommitHash: string;
  readonly revisionRange: string;
};

export type BetaCandidateDiscoveryRange = {
  readonly candidateTag: BetaCandidateTag;
  readonly candidateCommitHash: string;
  readonly range: CommitDiscoveryRange;
};

export type CommitDiscoveryRangeSelection =
  | {
      readonly kind: 'bootstrap';
    }
  | {
      readonly kind: 'range';
      readonly range: CommitDiscoveryRange;
    };

export type ReleaseAppearanceValue = {
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

export type ReleaseAppearanceCommentState = {
  readonly beta: Maybe<ReleaseAppearanceValue>;
  readonly production: Maybe<ReleaseAppearanceValue>;
};

export type DesiredReleaseAppearanceCommentState = ReleaseAppearanceCommentState;

type SerializedReleaseAppearanceCommentState = {
  readonly version?: 1;
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
  readonly currentBetaTagCreatedAtSeconds: number;
  readonly currentCommitHash: string;
  readonly betaTagRelationships: readonly CommitRangeRelationship[];
  readonly existingBetaTagNames: readonly string[];
  readonly productionTagRelationships: readonly CommitRangeRelationship[];
};

export type ProductionDiscoveryRangeSelectionParameters = {
  readonly currentCommitHash: string;
  readonly currentProductionTagCreatedAtSeconds: number;
  readonly currentProductionTagName: string;
  readonly productionTagRelationships: readonly CommitRangeRelationship[];
};

export type PrepareReleaseAppearanceCommentParameters = {
  readonly comments: readonly ReleaseAppearanceComment[];
  readonly commentMode?: ReleaseAppearanceCommentMode;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

export type PrepareReleaseAppearanceCommentWithDesiredStateParameters = {
  readonly comments: readonly ReleaseAppearanceComment[];
  readonly commentMode?: ReleaseAppearanceCommentMode;
  readonly desiredState: DesiredReleaseAppearanceCommentState;
};

type CreateReleaseAppearanceValueParameters = {
  readonly environment: ReleaseAppearanceEnvironment;
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

export type SelectPreviousProductionBaselineParameters = {
  readonly currentReleaseIdentifier: string;
  readonly currentTagCreatedAtSeconds: number;
  readonly currentTagName: string;
  readonly productionTagRelationships: readonly CommitRangeRelationship[];
};

export type PreviousProductionBaselineSelection =
  | {
      readonly kind: 'bootstrap';
    }
  | {
      readonly kind: 'baseline';
      readonly relationship: CommitRangeRelationship;
    };

type CreateCommentStateParameters = {
  readonly environment: ReleaseAppearanceEnvironment;
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

type AddMissingCommentStateValueParameters = {
  readonly environment: ReleaseAppearanceEnvironment;
  readonly state: ReleaseAppearanceCommentState;
  readonly tagName: string;
  readonly workflowRunUrl: string;
};

export function getReleaseAppearanceCommentMarker(commentMode: ReleaseAppearanceCommentMode): string {
  return commentMode === 'test' ? releaseAppearanceTestCommentMarker : releaseAppearanceCommentMarker;
}

export function isProductionReleaseTagName(tagName: string): boolean {
  return productionTagPattern.test(tagName);
}

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

  const hasSupportedVersion = is.undefined(value.version) || value.version === 1;
  const hasValidBetaValue = is.undefined(value.beta) || isValidReleaseAppearanceValue(value.beta, 'beta');
  const hasValidProductionValue =
    is.undefined(value.production) || isValidReleaseAppearanceValue(value.production, 'production');

  return hasSupportedVersion && hasValidBetaValue && hasValidProductionValue;
}

function createReleaseAppearanceValue(
  parameters: CreateReleaseAppearanceValueParameters,
): Result<ReleaseAppearanceValue, Error> {
  if (
    !isValidReleaseAppearanceValue(
      {tagName: parameters.tagName, workflowRunUrl: parameters.workflowRunUrl},
      parameters.environment,
    )
  ) {
    return Result.err(new Error(`Invalid ${parameters.environment} release appearance value.`));
  }

  return Result.ok({tagName: parameters.tagName, workflowRunUrl: parameters.workflowRunUrl});
}

export function parseBetaCandidateTag(tagName: string): Result<BetaCandidateTag, Error> {
  const betaCandidateTagMatch = Maybe.of(betaCandidateTagPattern.exec(tagName));

  if (betaCandidateTagMatch.isNothing) {
    return Result.err(new Error(`Invalid Beta candidate tag name: ${tagName}`));
  }

  const candidateNumber = Number(betaCandidateTagMatch.value[2]);

  if (!is.integer(candidateNumber) || candidateNumber < 1) {
    return Result.err(new Error(`Invalid Beta candidate tag number: ${tagName}`));
  }

  return Result.ok({
    candidateNumber,
    releaseIdentifier: betaCandidateTagMatch.value[1],
    tagName,
  });
}

export function parseProductionReleaseTag(tagName: string): Result<ProductionReleaseTag, Error> {
  const productionTagMatch = Maybe.of(productionTagPattern.exec(tagName));

  if (productionTagMatch.isNothing) {
    return Result.err(new Error(`Invalid Production tag name: ${tagName}`));
  }

  return Result.ok({
    releaseIdentifier: productionTagMatch.value[1],
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

export function selectCurrentReleaseBetaCandidates(
  currentBetaTagName: string,
  existingTagNames: readonly string[],
): Result<readonly BetaCandidateTag[], Error> {
  const currentBetaCandidateTagResult = parseBetaCandidateTag(currentBetaTagName);

  if (currentBetaCandidateTagResult.isErr) {
    return Result.err(currentBetaCandidateTagResult.error);
  }

  const currentBetaCandidateTag = currentBetaCandidateTagResult.value;
  const candidateTags = existingTagNames.flatMap(existingTagName => {
    const betaCandidateTagResult = parseBetaCandidateTag(existingTagName);

    if (betaCandidateTagResult.isErr) {
      return [];
    }

    const betaCandidateTag = betaCandidateTagResult.value;

    return betaCandidateTag.releaseIdentifier === currentBetaCandidateTag.releaseIdentifier &&
      betaCandidateTag.candidateNumber <= currentBetaCandidateTag.candidateNumber
      ? [betaCandidateTag]
      : [];
  });
  const includesCurrentBetaCandidate = candidateTags.some(candidateTag => {
    return candidateTag.tagName === currentBetaCandidateTag.tagName;
  });
  const candidateTagsIncludingCurrent = includesCurrentBetaCandidate
    ? candidateTags
    : [...candidateTags, currentBetaCandidateTag];

  return Result.ok(
    candidateTagsIncludingCurrent.toSorted((leftCandidateTag, rightCandidateTag) => {
      return leftCandidateTag.candidateNumber - rightCandidateTag.candidateNumber;
    }),
  );
}

function compareReleaseIdentifiers(leftReleaseIdentifier: string, rightReleaseIdentifier: string): number {
  const releaseIdentifierPatternMatch = /^(\d{4}-\d{2}-\d{2})\.([1-9]\d*)$/u;
  const leftMatch = Maybe.of(releaseIdentifierPatternMatch.exec(leftReleaseIdentifier));
  const rightMatch = Maybe.of(releaseIdentifierPatternMatch.exec(rightReleaseIdentifier));

  if (leftMatch.isNothing || rightMatch.isNothing) {
    return leftReleaseIdentifier.localeCompare(rightReleaseIdentifier);
  }

  const dateComparison = leftMatch.value[1].localeCompare(rightMatch.value[1]);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const releaseSequenceComparison = Number(leftMatch.value[2]) - Number(rightMatch.value[2]);

  if (releaseSequenceComparison !== 0) {
    return releaseSequenceComparison;
  }

  return leftReleaseIdentifier.localeCompare(rightReleaseIdentifier);
}

function compareProductionBaselineCandidates(
  leftCandidate: CommitRangeRelationship,
  rightCandidate: CommitRangeRelationship,
): number {
  if (leftCandidate.tagCreatedAtSeconds !== rightCandidate.tagCreatedAtSeconds) {
    return rightCandidate.tagCreatedAtSeconds - leftCandidate.tagCreatedAtSeconds;
  }

  const leftReleaseTagResult = parseProductionReleaseTag(leftCandidate.tagName);
  const rightReleaseTagResult = parseProductionReleaseTag(rightCandidate.tagName);

  if (leftReleaseTagResult.isOk && rightReleaseTagResult.isOk) {
    const releaseIdentifierComparison = compareReleaseIdentifiers(
      rightReleaseTagResult.value.releaseIdentifier,
      leftReleaseTagResult.value.releaseIdentifier,
    );

    if (releaseIdentifierComparison !== 0) {
      return releaseIdentifierComparison;
    }
  }

  return rightCandidate.tagName.localeCompare(leftCandidate.tagName);
}

export function selectPreviousProductionBaseline(
  parameters: SelectPreviousProductionBaselineParameters,
): Result<PreviousProductionBaselineSelection, Error> {
  if (!productionTagPattern.test(`${parameters.currentReleaseIdentifier}-production`)) {
    return Result.err(new Error(`Invalid release identifier: ${parameters.currentReleaseIdentifier}`));
  }

  if (!is.integer(parameters.currentTagCreatedAtSeconds) || parameters.currentTagCreatedAtSeconds < 0) {
    return Result.err(new Error(`Invalid tag creation time for ${parameters.currentTagName}`));
  }

  const previousProductionBaselineCandidates = parameters.productionTagRelationships.filter(
    productionTagRelationship => {
      const productionTagResult = parseProductionReleaseTag(productionTagRelationship.tagName);

      return (
        productionTagResult.isOk &&
        productionTagResult.value.releaseIdentifier !== parameters.currentReleaseIdentifier &&
        productionTagRelationship.tagName !== parameters.currentTagName &&
        productionTagRelationship.tagCreatedAtSeconds < parameters.currentTagCreatedAtSeconds &&
        isValidCommitHash(productionTagRelationship.tagCommitHash) &&
        isValidCommitHash(productionTagRelationship.mergeBaseCommitHash) &&
        productionTagRelationship.commitDistanceFromMergeBase >= 0
      );
    },
  );

  const selectedProductionBaseline = Maybe.of(
    previousProductionBaselineCandidates.toSorted(compareProductionBaselineCandidates)[0],
  );

  if (selectedProductionBaseline.isNothing) {
    return Result.ok({kind: 'bootstrap'});
  }

  return Result.ok({kind: 'baseline', relationship: selectedProductionBaseline.value});
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
): Result<CommitDiscoveryRangeSelection, Error> {
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
    const previousProductionBaselineResult = selectPreviousProductionBaseline({
      currentReleaseIdentifier: currentBetaCandidateTagResult.value.releaseIdentifier,
      currentTagCreatedAtSeconds: parameters.currentBetaTagCreatedAtSeconds,
      currentTagName: parameters.currentBetaTagName,
      productionTagRelationships: parameters.productionTagRelationships,
    });

    if (previousProductionBaselineResult.isErr) {
      return Result.err(previousProductionBaselineResult.error);
    }

    if (previousProductionBaselineResult.value.kind === 'bootstrap') {
      return Result.ok({kind: 'bootstrap'});
    }

    baselineTagName = previousProductionBaselineResult.value.relationship.tagName;
  }

  const baselineRelationships = previousBetaTagResult.value.isJust
    ? parameters.betaTagRelationships
    : parameters.productionTagRelationships;
  const baselineRelationshipResult = findCommitRangeRelationship(baselineTagName, baselineRelationships);

  if (baselineRelationshipResult.isErr) {
    return Result.err(baselineRelationshipResult.error);
  }

  const commitDiscoveryRangeResult = createCommitDiscoveryRange(
    baselineRelationshipResult.value,
    parameters.currentCommitHash,
  );

  return commitDiscoveryRangeResult.map(range => {
    return {kind: 'range', range};
  });
}

export function selectProductionDiscoveryRange(
  parameters: ProductionDiscoveryRangeSelectionParameters,
): Result<CommitDiscoveryRangeSelection, Error> {
  const currentProductionTagResult = parseProductionReleaseTag(parameters.currentProductionTagName);

  if (currentProductionTagResult.isErr) {
    return Result.err(currentProductionTagResult.error);
  }

  const previousProductionBaselineResult = selectPreviousProductionBaseline({
    currentReleaseIdentifier: currentProductionTagResult.value.releaseIdentifier,
    currentTagCreatedAtSeconds: parameters.currentProductionTagCreatedAtSeconds,
    currentTagName: parameters.currentProductionTagName,
    productionTagRelationships: parameters.productionTagRelationships,
  });

  if (previousProductionBaselineResult.isErr) {
    return Result.err(previousProductionBaselineResult.error);
  }

  if (previousProductionBaselineResult.value.kind === 'bootstrap') {
    return Result.ok({kind: 'bootstrap'});
  }

  return createCommitDiscoveryRange(
    previousProductionBaselineResult.value.relationship,
    parameters.currentCommitHash,
  ).map(range => {
    return {kind: 'range', range};
  });
}

function parseAppearanceCommentState(
  commentBody: string,
  commentMarker: string,
): Result<ReleaseAppearanceCommentState, Error> {
  const markerIndex = commentBody.indexOf(commentMarker);

  if (markerIndex === -1) {
    return Result.err(new Error('Release appearance marker is missing.'));
  }

  const secondMarkerIndex = commentBody.indexOf(commentMarker, markerIndex + commentMarker.length);

  if (secondMarkerIndex !== -1) {
    return Result.err(new Error('Release appearance marker occurs more than once in one comment.'));
  }

  const commentEndIndex = commentBody.indexOf('-->', markerIndex + commentMarker.length);

  if (commentEndIndex === -1) {
    return Result.err(new Error('Release appearance comment is missing its closing marker.'));
  }

  const serializedState = commentBody.slice(markerIndex + commentMarker.length, commentEndIndex).trim();

  try {
    const parsedState: unknown = JSON.parse(serializedState);

    if (!isValidReleaseAppearanceCommentState(parsedState)) {
      return Result.err(new Error('Release appearance comment contains invalid state.'));
    }

    return Result.ok({
      beta: Maybe.of(parsedState.beta),
      production: Maybe.of(parsedState.production),
    });
  } catch {
    return Result.err(new Error('Release appearance comment contains invalid JSON state.'));
  }
}

function countMarkerComments(comments: readonly ReleaseAppearanceComment[], commentMarker: string): number {
  return comments.reduce((markerCommentCount, comment) => {
    return comment.body.includes(commentMarker) ? markerCommentCount + 1 : markerCommentCount;
  }, 0);
}

function createCommentState(parameters: CreateCommentStateParameters): Result<ReleaseAppearanceCommentState, Error> {
  return addMissingCommentStateValue({
    environment: parameters.environment,
    state: {
      beta: Maybe.nothing(),
      production: Maybe.nothing(),
    },
    tagName: parameters.tagName,
    workflowRunUrl: parameters.workflowRunUrl,
  });
}

function addMissingCommentStateValue(
  parameters: AddMissingCommentStateValueParameters,
): Result<ReleaseAppearanceCommentState, Error> {
  const releaseAppearanceValueResult = createReleaseAppearanceValue({
    environment: parameters.environment,
    tagName: parameters.tagName,
    workflowRunUrl: parameters.workflowRunUrl,
  });

  if (releaseAppearanceValueResult.isErr) {
    return Result.err(releaseAppearanceValueResult.error);
  }

  return Result.ok({
    beta: parameters.environment === 'beta' ? Maybe.just(releaseAppearanceValueResult.value) : parameters.state.beta,
    production:
      parameters.environment === 'production'
        ? Maybe.just(releaseAppearanceValueResult.value)
        : parameters.state.production,
  });
}

function validateDesiredReleaseAppearanceCommentState(
  desiredState: DesiredReleaseAppearanceCommentState,
): Result<Unit, Error> {
  if (desiredState.beta.isJust && !isValidReleaseAppearanceValue(desiredState.beta.value, 'beta')) {
    return Result.err(new Error('Desired Beta release appearance value is invalid.'));
  }

  if (desiredState.production.isJust && !isValidReleaseAppearanceValue(desiredState.production.value, 'production')) {
    return Result.err(new Error('Desired Production release appearance value is invalid.'));
  }

  if (desiredState.beta.isNothing && desiredState.production.isNothing) {
    return Result.err(new Error('Desired release appearance state must contain Beta or Production metadata.'));
  }

  return Result.ok();
}

function mergeReleaseAppearanceCommentState(
  existingState: ReleaseAppearanceCommentState,
  desiredState: DesiredReleaseAppearanceCommentState,
): ReleaseAppearanceCommentState {
  return {
    beta: existingState.beta.isJust ? existingState.beta : desiredState.beta,
    production: existingState.production.isJust ? existingState.production : desiredState.production,
  };
}

function areReleaseAppearanceValuesEqual(
  leftValue: Maybe<ReleaseAppearanceValue>,
  rightValue: Maybe<ReleaseAppearanceValue>,
): boolean {
  if (leftValue.isNothing || rightValue.isNothing) {
    return leftValue.isNothing === rightValue.isNothing;
  }

  return (
    leftValue.value.tagName === rightValue.value.tagName &&
    leftValue.value.workflowRunUrl === rightValue.value.workflowRunUrl
  );
}

function areReleaseAppearanceCommentStatesEqual(
  leftState: ReleaseAppearanceCommentState,
  rightState: ReleaseAppearanceCommentState,
): boolean {
  return (
    areReleaseAppearanceValuesEqual(leftState.beta, rightState.beta) &&
    areReleaseAppearanceValuesEqual(leftState.production, rightState.production)
  );
}

function serializeReleaseAppearanceCommentState(
  state: ReleaseAppearanceCommentState,
): SerializedReleaseAppearanceCommentState {
  return {
    version: 1,
    ...state.beta
      .map(releaseAppearanceValue => {
        return {beta: releaseAppearanceValue};
      })
      .unwrapOr({}),
    ...state.production
      .map(releaseAppearanceValue => {
        return {production: releaseAppearanceValue};
      })
      .unwrapOr({}),
  };
}

export function renderReleaseAppearanceComment(
  state: ReleaseAppearanceCommentState,
  commentMode: ReleaseAppearanceCommentMode = 'production',
): string {
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
    ...(commentMode === 'test'
      ? [
          '> Test comment created by the manual release-appearance validation workflow.',
          '> It does not represent an actual deployment.',
          '',
        ]
      : []),
    getReleaseAppearanceCommentMarker(commentMode),
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
  const commentStateResult = createCommentState({
    environment: parameters.environment,
    tagName: parameters.tagName,
    workflowRunUrl: parameters.workflowRunUrl,
  });

  if (commentStateResult.isErr) {
    return Result.err(commentStateResult.error);
  }

  return prepareReleaseAppearanceCommentWithDesiredState({
    comments: parameters.comments,
    commentMode: parameters.commentMode,
    desiredState: commentStateResult.value,
  });
}

export function prepareReleaseAppearanceCommentWithDesiredState(
  parameters: PrepareReleaseAppearanceCommentWithDesiredStateParameters,
): Result<PreparedReleaseAppearanceComment, Error> {
  const desiredStateValidationResult = validateDesiredReleaseAppearanceCommentState(parameters.desiredState);

  if (desiredStateValidationResult.isErr) {
    return Result.err(desiredStateValidationResult.error);
  }

  const commentMode = Maybe.of(parameters.commentMode).unwrapOr('production');
  const commentMarker = getReleaseAppearanceCommentMarker(commentMode);
  const markerCommentCount = countMarkerComments(parameters.comments, commentMarker);

  if (markerCommentCount > 1) {
    return Result.err(new Error('More than one release appearance marker comment exists.'));
  }

  if (markerCommentCount === 0) {
    return Result.ok({
      action: 'create',
      body: renderReleaseAppearanceComment(parameters.desiredState, commentMode),
    });
  }

  const markerComment = Maybe.of(
    parameters.comments.find(comment => {
      return comment.body.includes(commentMarker);
    }),
  );

  if (markerComment.isNothing) {
    return Result.err(new Error('Unable to resolve the release appearance marker comment.'));
  }

  const existingStateResult = parseAppearanceCommentState(markerComment.value.body, commentMarker);

  if (existingStateResult.isErr) {
    return Result.err(existingStateResult.error);
  }

  const mergedState = mergeReleaseAppearanceCommentState(existingStateResult.value, parameters.desiredState);

  if (areReleaseAppearanceCommentStatesEqual(existingStateResult.value, mergedState)) {
    return Result.ok({
      action: 'unchanged',
      body: markerComment.value.body,
      commentId: markerComment.value.commentId,
    });
  }

  return Result.ok({
    action: 'update',
    body: renderReleaseAppearanceComment(mergedState, commentMode),
    commentId: markerComment.value.commentId,
  });
}
