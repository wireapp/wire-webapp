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

import {Maybe, Result} from 'true-myth';
import {match} from 'ts-pattern';
import {z} from 'zod';

import {parseWebAppProductionRelease} from '../release-metadata/webappProductionRelease.ts';
import {parseBetaWebAppTagName} from '../release-metadata/webappReleaseIdentity.ts';
import type {WebAppVersion} from '../release-metadata/webappVersion.ts';

export type SerializedReleaseAppearanceState = {
  readonly beta?: string;
  readonly production?: string;
};

export type ReleaseAppearanceState = {
  readonly beta: Maybe<string>;
  readonly production: Maybe<string>;
};

export type ReleaseAppearanceIdentity =
  | {
      readonly kind: 'legacy';
      readonly releaseIdentifier: string;
    }
  | {
      readonly kind: 'semver';
      readonly version: WebAppVersion;
    };

export type BetaCandidate = {
  readonly release: ReleaseAppearanceIdentity;
  readonly candidateNumber: bigint;
};

export type ProductionTag = {
  readonly release: ReleaseAppearanceIdentity;
};

const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;
const betaCandidateTagPattern = new RegExp(String.raw`^(${releaseIdentifierPattern})-beta\.([1-9]\d*)$`);
const markerPrefixPattern = /<!--\s*wire-webapp-release-appearance:/g;
const markerHeaderPattern = /<!--\s*wire-webapp-release-appearance:v([^\s\r\n]+)\s*\n/g;
const releaseIdentifierCaptureIndex = 1;
const betaCandidateNumberCaptureIndex = 2;
const markerVersionCaptureIndex = 1;

const releaseAppearanceMarkerStateSchema = z
  .object({
    beta: z
      .string()
      .refine(betaCandidateTag => {
        return parseBetaCandidateTag(betaCandidateTag).isOk;
      })
      .optional(),
    production: z
      .string()
      .refine(productionTag => {
        return parseProductionTag(productionTag).isOk;
      })
      .optional(),
  })
  .strict();

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function readRegexCapture(regexMatch: RegExpExecArray, captureIndex: number): Maybe<string> {
  return Maybe.of(regexMatch[captureIndex]);
}

export function parseBetaCandidateTag(betaCandidateTag: string): Result<BetaCandidate, Error> {
  const betaCandidateTagMatch = Maybe.of(betaCandidateTagPattern.exec(betaCandidateTag));
  if (betaCandidateTagMatch.isJust) {
    const releaseIdentifier = readRegexCapture(betaCandidateTagMatch.value, releaseIdentifierCaptureIndex);
    const candidateNumber = readRegexCapture(betaCandidateTagMatch.value, betaCandidateNumberCaptureIndex);
    if (releaseIdentifier.isNothing || candidateNumber.isNothing) {
      return createFailure(`Invalid Beta candidate tag: ${betaCandidateTag}`);
    }

    return createSuccess({
      release: {kind: 'legacy', releaseIdentifier: releaseIdentifier.value},
      candidateNumber: BigInt(candidateNumber.value),
    });
  }

  const semverBetaCandidateResult = parseBetaWebAppTagName(betaCandidateTag);
  if (semverBetaCandidateResult.isErr) {
    return createFailure(`Invalid Beta candidate tag: ${betaCandidateTag}`, semverBetaCandidateResult.error);
  }

  return createSuccess({
    release: {kind: 'semver', version: semverBetaCandidateResult.value.version},
    candidateNumber: BigInt(semverBetaCandidateResult.value.candidateNumber),
  });
}

export function parseProductionTag(productionTag: string): Result<ProductionTag, Error> {
  const productionReleaseResult = parseWebAppProductionRelease(productionTag);
  if (productionReleaseResult.isErr) {
    return createFailure(`Invalid Production tag: ${productionTag}`, productionReleaseResult.error);
  }

  return match(productionReleaseResult.value)
    .returnType<Result<ProductionTag, Error>>()
    .with({kind: 'legacy'}, legacyRelease => {
      return createSuccess({release: {kind: 'legacy', releaseIdentifier: legacyRelease.buildVersion}});
    })
    .with({kind: 'semver'}, semverRelease => {
      return createSuccess({release: {kind: 'semver', version: semverRelease.version}});
    })
    .exhaustive();
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
  betaCandidate: Pick<BetaCandidate, 'release'>,
  productionTag: Pick<ProductionTag, 'release'>,
): Result<ReleaseAppearanceIdentity, Error> {
  if (haveSameReleaseAppearanceIdentity(betaCandidate.release, productionTag.release) === false) {
    return createFailure(
      `Beta candidate and Production tag belong to different releases: ${describeReleaseAppearanceIdentity(betaCandidate.release)} and ${describeReleaseAppearanceIdentity(productionTag.release)}`,
    );
  }

  return createSuccess(betaCandidate.release);
}

export function haveSameReleaseAppearanceIdentity(
  leftRelease: ReleaseAppearanceIdentity,
  rightRelease: ReleaseAppearanceIdentity,
): boolean {
  return match({leftRelease, rightRelease})
    .with({leftRelease: {kind: 'legacy'}, rightRelease: {kind: 'legacy'}}, matchingLegacyReleases => {
      return (
        matchingLegacyReleases.leftRelease.releaseIdentifier === matchingLegacyReleases.rightRelease.releaseIdentifier
      );
    })
    .with({leftRelease: {kind: 'semver'}, rightRelease: {kind: 'semver'}}, matchingSemverReleases => {
      return matchingSemverReleases.leftRelease.version === matchingSemverReleases.rightRelease.version;
    })
    .otherwise(() => {
      return false;
    });
}

function describeReleaseAppearanceIdentity(releaseIdentity: ReleaseAppearanceIdentity): string {
  return match(releaseIdentity)
    .with({kind: 'legacy'}, legacyRelease => {
      return legacyRelease.releaseIdentifier;
    })
    .with({kind: 'semver'}, semverRelease => {
      return `v${semverRelease.version}`;
    })
    .exhaustive();
}

export function deserializeReleaseAppearanceState(
  serializedReleaseAppearanceState: SerializedReleaseAppearanceState,
): ReleaseAppearanceState {
  return {
    beta: Maybe.of(serializedReleaseAppearanceState.beta),
    production: Maybe.of(serializedReleaseAppearanceState.production),
  };
}

export function serializeReleaseAppearanceState(
  releaseAppearanceState: ReleaseAppearanceState,
): SerializedReleaseAppearanceState {
  const serializedBetaState = releaseAppearanceState.beta
    .map(betaTag => {
      return {beta: betaTag};
    })
    .unwrapOr({});
  const serializedProductionState = releaseAppearanceState.production
    .map(productionTag => {
      return {production: productionTag};
    })
    .unwrapOr({});

  return {...serializedBetaState, ...serializedProductionState};
}

function parseMarkerState(markerJson: string): Result<ReleaseAppearanceState, Error> {
  let parsedMarkerState: unknown;

  try {
    parsedMarkerState = JSON.parse(markerJson) as unknown;
  } catch (error: unknown) {
    return createFailure('Malformed release-appearance marker state: invalid JSON', error);
  }

  const validationResult = releaseAppearanceMarkerStateSchema.safeParse(parsedMarkerState);
  if (!validationResult.success) {
    return createFailure('Malformed release-appearance marker state', validationResult.error);
  }

  return createSuccess(deserializeReleaseAppearanceState(validationResult.data));
}

export function parsePersistentMarkerComment(commentBody: string): Result<Maybe<ReleaseAppearanceState>, Error> {
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

  const markerHeaderMatch = Maybe.of(markerHeaderMatches[0]);
  if (markerHeaderMatch.isNothing) {
    return createFailure('Malformed release-appearance marker: missing marker header');
  }

  const markerVersion = readRegexCapture(markerHeaderMatch.value, markerVersionCaptureIndex);
  if (markerVersion.isNothing) {
    return createFailure('Malformed release-appearance marker: missing marker version');
  }

  if (markerVersion.value !== '1') {
    return createFailure(`Unsupported release-appearance marker version: ${markerVersion.value}`);
  }

  const markerHeaderStart = Maybe.of(markerHeaderMatch.value.index);
  if (markerHeaderStart.isNothing) {
    return createFailure('Malformed release-appearance marker: missing marker position');
  }

  const markerStateStart = markerHeaderStart.value + markerHeaderMatch.value[0].length;
  const markerStateEnd = commentBody.indexOf('-->', markerStateStart);
  if (markerStateEnd === -1) {
    return createFailure('Malformed release-appearance marker: missing marker terminator');
  }

  return parseMarkerState(commentBody.slice(markerStateStart, markerStateEnd).trim()).map(releaseAppearanceState => {
    return Maybe.just(releaseAppearanceState);
  });
}

export function mergeReleaseAppearanceState(
  existingReleaseState: ReleaseAppearanceState,
  desiredReleaseState: ReleaseAppearanceState,
): ReleaseAppearanceState {
  const mergedBetaTag = existingReleaseState.beta.or(desiredReleaseState.beta);
  const mergedProductionTag = existingReleaseState.production.or(desiredReleaseState.production);

  if (mergedBetaTag === existingReleaseState.beta && mergedProductionTag === existingReleaseState.production) {
    return existingReleaseState;
  }

  return {
    beta: mergedBetaTag,
    production: mergedProductionTag,
  };
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

export function renderPersistentComment(releaseAppearanceState: ReleaseAppearanceState): string {
  const serializedState = JSON.stringify(serializeReleaseAppearanceState(releaseAppearanceState));

  return `<!-- wire-webapp-release-appearance:v1
${serializedState}
-->

### First appeared in

| Environment | Release |
| --- | --- |
| Beta | ${renderReleaseValue(releaseAppearanceState.beta)} |
| Production | ${renderReleaseValue(releaseAppearanceState.production)} |`;
}

export function mergeReleaseAppearanceComments(
  existingComments: readonly string[],
  desiredReleaseState: ReleaseAppearanceState,
): Result<readonly string[], Error> {
  let markerCommentIndex: Maybe<number> = Maybe.nothing<number>();
  let existingReleaseState: Maybe<ReleaseAppearanceState> = Maybe.nothing<ReleaseAppearanceState>();

  for (let commentIndex = 0; commentIndex < existingComments.length; commentIndex += 1) {
    const existingComment = Maybe.of(existingComments[commentIndex]);
    if (existingComment.isNothing) {
      return createFailure('Release-appearance comment was not found');
    }

    const parsedComment = parsePersistentMarkerComment(existingComment.value);
    if (parsedComment.isErr) {
      return createFailure(parsedComment.error.message, parsedComment.error);
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

  if (markerCommentIndex.isNothing) {
    return createSuccess([...existingComments, renderPersistentComment(desiredReleaseState)]);
  }

  if (existingReleaseState.isNothing) {
    return createFailure('Release-appearance marker state is missing');
  }

  const mergedReleaseState = mergeReleaseAppearanceState(existingReleaseState.value, desiredReleaseState);
  if (mergedReleaseState === existingReleaseState.value) {
    return createSuccess(existingComments);
  }

  return createSuccess(
    existingComments.toSpliced(markerCommentIndex.value, 1, renderPersistentComment(mergedReleaseState)),
  );
}
