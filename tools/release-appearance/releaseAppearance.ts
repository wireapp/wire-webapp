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
import {Maybe, Result, Unit} from 'true-myth';

import {
  betaCandidateTagPattern,
  parseReleaseAppearanceMarkerState,
  productionTagPattern,
} from './releaseAppearanceMarkerSchema.ts';

export type ReleaseAppearanceState = {
  readonly beta?: string;
  readonly production?: string;
};

export type BetaCandidate = {
  readonly releaseIdentifier: string;
  readonly candidateNumber: bigint;
};

export type ProductionTag = {
  readonly releaseIdentifier: string;
};

export type ReleaseAppearanceResult<valueType> = Result<valueType, Error>;

const markerPrefixPattern = /<!--\s*wire-webapp-release-appearance:/g;
const markerHeaderPattern = /<!--\s*wire-webapp-release-appearance:v([^\s\r\n]+)\s*\n/g;

function createSuccess<valueType>(value: valueType): ReleaseAppearanceResult<valueType> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): ReleaseAppearanceResult<valueType> {
  return Result.err<valueType, Error>(new Error(message));
}

export function parseBetaCandidateTag(betaCandidateTag: string): ReleaseAppearanceResult<BetaCandidate> {
  const betaCandidateTagMatch = betaCandidateTagPattern.exec(betaCandidateTag);

  if (is.nullOrUndefined(betaCandidateTagMatch)) {
    return createFailure(`Invalid Beta candidate tag: ${betaCandidateTag}`);
  }

  return createSuccess({
    releaseIdentifier: betaCandidateTagMatch[1],
    candidateNumber: BigInt(betaCandidateTagMatch[2]),
  });
}

export function parseProductionTag(productionTag: string): ReleaseAppearanceResult<ProductionTag> {
  const productionTagMatch = productionTagPattern.exec(productionTag);

  if (is.nullOrUndefined(productionTagMatch)) {
    return createFailure(`Invalid Production tag: ${productionTag}`);
  }

  return createSuccess({releaseIdentifier: productionTagMatch[1]});
}

export function compareBetaCandidates(leftCandidate: BetaCandidate, rightCandidate: BetaCandidate): number {
  if (leftCandidate.candidateNumber < rightCandidate.candidateNumber) {
    return -1;
  }

  if (leftCandidate.candidateNumber > rightCandidate.candidateNumber) {
    return 1;
  }

  return 0;
}

export function validateSameReleaseIdentifier(
  betaCandidate: Pick<BetaCandidate, 'releaseIdentifier'>,
  productionTag: Pick<ProductionTag, 'releaseIdentifier'>,
): ReleaseAppearanceResult<string> {
  if (betaCandidate.releaseIdentifier !== productionTag.releaseIdentifier) {
    return createFailure(
      `Beta candidate and Production tag belong to different releases: ${betaCandidate.releaseIdentifier} and ${productionTag.releaseIdentifier}`,
    );
  }

  return createSuccess(betaCandidate.releaseIdentifier);
}

type ParsedMarkerTag = {
  readonly tagName: string;
  readonly releaseIdentifier: string;
};

type ParseOptionalMarkerTagOptions = {
  readonly parsedMarkerState: ReleaseAppearanceState;
  readonly markerFieldName: 'beta' | 'production';
  readonly parseTag: (tagName: string) => ReleaseAppearanceResult<Pick<ParsedMarkerTag, 'releaseIdentifier'>>;
};

function parseOptionalMarkerTag(
  parseOptionalMarkerTagOptions: ParseOptionalMarkerTagOptions,
): ReleaseAppearanceResult<Maybe<ParsedMarkerTag>> {
  const {parsedMarkerState, markerFieldName, parseTag} = parseOptionalMarkerTagOptions;

  return Maybe.of(parsedMarkerState[markerFieldName]).match({
    Just(markerFieldValue) {
      const parsedTagResult = parseTag(markerFieldValue);
      if (parsedTagResult.isErr) {
        return createFailure(`Malformed release-appearance marker state: ${parsedTagResult.error.message}`);
      }

      return createSuccess(
        Maybe.just({tagName: markerFieldValue, releaseIdentifier: parsedTagResult.value.releaseIdentifier}),
      );
    },
    Nothing() {
      return createSuccess(Maybe.nothing<ParsedMarkerTag>());
    },
  });
}

function validateMatchingMarkerTags(
  betaTag: Maybe<ParsedMarkerTag>,
  productionTag: Maybe<ParsedMarkerTag>,
): ReleaseAppearanceResult<Unit> {
  return betaTag.match({
    Just(betaTagValue) {
      return productionTag.match({
        Just(productionTagValue) {
          const sameReleaseResult = validateSameReleaseIdentifier(betaTagValue, productionTagValue);

          if (sameReleaseResult.isErr) {
            return createFailure(`Malformed release-appearance marker state: ${sameReleaseResult.error.message}`);
          }

          return createSuccess(Unit);
        },
        Nothing() {
          return createSuccess(Unit);
        },
      });
    },
    Nothing() {
      return createSuccess(Unit);
    },
  });
}

function createReleaseAppearanceState(betaTag: Maybe<string>, productionTag: Maybe<string>): ReleaseAppearanceState {
  const betaState = betaTag
    .map(tagName => {
      return {beta: tagName};
    })
    .unwrapOr({});
  const productionState = productionTag
    .map(tagName => {
      return {production: tagName};
    })
    .unwrapOr({});

  return {...betaState, ...productionState};
}

function createReleaseAppearanceStateFromMarkerTags(
  betaTag: Maybe<ParsedMarkerTag>,
  productionTag: Maybe<ParsedMarkerTag>,
): ReleaseAppearanceState {
  return createReleaseAppearanceState(
    betaTag.map(parsedTag => {
      return parsedTag.tagName;
    }),
    productionTag.map(parsedTag => {
      return parsedTag.tagName;
    }),
  );
}

function parseMarkerState(markerJson: string): ReleaseAppearanceResult<ReleaseAppearanceState> {
  const parsedMarkerStateResult = parseReleaseAppearanceMarkerState(markerJson);
  if (parsedMarkerStateResult.isErr) {
    return createFailure(parsedMarkerStateResult.error.message);
  }

  const betaTagResult = parseOptionalMarkerTag({
    parsedMarkerState: parsedMarkerStateResult.value,
    markerFieldName: 'beta',
    parseTag: parseBetaCandidateTag,
  });
  if (betaTagResult.isErr) {
    return createFailure(betaTagResult.error.message);
  }

  const productionTagResult = parseOptionalMarkerTag({
    parsedMarkerState: parsedMarkerStateResult.value,
    markerFieldName: 'production',
    parseTag: parseProductionTag,
  });
  if (productionTagResult.isErr) {
    return createFailure(productionTagResult.error.message);
  }

  const matchingTagsResult = validateMatchingMarkerTags(betaTagResult.value, productionTagResult.value);
  if (matchingTagsResult.isErr) {
    return createFailure(matchingTagsResult.error.message);
  }

  return createSuccess(createReleaseAppearanceStateFromMarkerTags(betaTagResult.value, productionTagResult.value));
}

export function parsePersistentMarkerComment(
  commentBody: string,
): ReleaseAppearanceResult<Maybe<ReleaseAppearanceState>> {
  const markerPrefixMatches = Array.from(commentBody.matchAll(markerPrefixPattern));

  if (markerPrefixMatches.length === 0) {
    return createSuccess(Maybe.nothing<ReleaseAppearanceState>());
  }

  if (markerPrefixMatches.length > 1) {
    return createFailure('Release-appearance comment contains more than one marker');
  }

  const markerHeaderMatches = Array.from(commentBody.matchAll(markerHeaderPattern));
  if (markerHeaderMatches.length === 0) {
    return createFailure('Malformed release-appearance marker: invalid marker header');
  }

  const markerHeaderMatch = markerHeaderMatches[0];
  const markerVersionResult = Maybe.of(markerHeaderMatch[1]);
  if (markerVersionResult.isNothing) {
    return createFailure('Malformed release-appearance marker: missing marker version');
  }

  const markerVersion = markerVersionResult.value;
  if (markerVersion !== '1') {
    return createFailure(`Unsupported release-appearance marker version: ${markerVersion}`);
  }

  return Maybe.of(markerHeaderMatch.index).match({
    Just(markerHeaderStart) {
      const markerStateStart = markerHeaderStart + markerHeaderMatch[0].length;
      const markerStateEnd = commentBody.indexOf('-->', markerStateStart);
      if (markerStateEnd === -1) {
        return createFailure('Malformed release-appearance marker: missing marker terminator');
      }

      return parseMarkerState(commentBody.slice(markerStateStart, markerStateEnd).trim()).map(Maybe.just);
    },
    Nothing() {
      return createFailure('Malformed release-appearance marker: missing marker position');
    },
  });
}

export function mergeReleaseAppearanceState(
  existingReleaseState: ReleaseAppearanceState,
  desiredReleaseState: ReleaseAppearanceState,
): ReleaseAppearanceState {
  const existingBetaTag = Maybe.of(existingReleaseState.beta);
  const existingProductionTag = Maybe.of(existingReleaseState.production);
  const mergedBetaTag = existingBetaTag.or(Maybe.of(desiredReleaseState.beta));
  const mergedProductionTag = existingProductionTag.or(Maybe.of(desiredReleaseState.production));

  if (mergedBetaTag === existingBetaTag && mergedProductionTag === existingProductionTag) {
    return existingReleaseState;
  }

  return createReleaseAppearanceState(mergedBetaTag, mergedProductionTag);
}

function renderReleaseValue(releaseTag: Maybe<string>): string {
  return releaseTag.match({
    Just(tagName) {
      return `\`${tagName}\``;
    },
    Nothing() {
      return 'Not yet deployed';
    },
  });
}

export function renderPersistentComment(state: ReleaseAppearanceState): string {
  const betaTag = Maybe.of(state.beta);
  const productionTag = Maybe.of(state.production);
  const serializedState = JSON.stringify(createReleaseAppearanceState(betaTag, productionTag));

  return `<!-- wire-webapp-release-appearance:v1
${serializedState}
-->

### First appeared in

| Environment | Release |
| --- | --- |
| Beta | ${renderReleaseValue(betaTag)} |
| Production | ${renderReleaseValue(productionTag)} |`;
}

export function mergeReleaseAppearanceComments(
  existingComments: readonly string[],
  desiredReleaseState: ReleaseAppearanceState,
): ReleaseAppearanceResult<readonly string[]> {
  let markerCommentIndex: Maybe<number> = Maybe.nothing<number>();
  let existingReleaseState: Maybe<ReleaseAppearanceState> = Maybe.nothing<ReleaseAppearanceState>();

  for (let commentIndex = 0; commentIndex < existingComments.length; commentIndex += 1) {
    const parsedComment = parsePersistentMarkerComment(existingComments[commentIndex]);

    if (parsedComment.isErr) {
      return createFailure(parsedComment.error.message);
    }

    if (parsedComment.value.isNothing) {
      continue;
    }

    if (markerCommentIndex.isJust) {
      return createFailure('More than one release-appearance marker comment exists');
    }

    markerCommentIndex = Maybe.just(commentIndex);
    existingReleaseState = parsedComment.value;
  }

  return markerCommentIndex.match({
    Just(markerCommentIndexValue) {
      return existingReleaseState.match({
        Just(existingReleaseStateValue) {
          const mergedReleaseState = mergeReleaseAppearanceState(existingReleaseStateValue, desiredReleaseState);
          if (mergedReleaseState === existingReleaseStateValue) {
            return createSuccess(existingComments);
          }

          return createSuccess(
            existingComments.toSpliced(markerCommentIndexValue, 1, renderPersistentComment(mergedReleaseState)),
          );
        },
        Nothing() {
          return createFailure('Release-appearance marker state is missing');
        },
      });
    },
    Nothing() {
      return createSuccess([...existingComments, renderPersistentComment(desiredReleaseState)]);
    },
  });
}
