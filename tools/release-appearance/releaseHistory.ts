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

import {isEmptyString, isError} from '@sindresorhus/is';
import {Maybe, Result, Task, Unit, result, task} from 'true-myth';
import {match} from 'ts-pattern';

import {
  compareBetaCandidates,
  haveSameReleaseAppearanceIdentity,
  parseBetaCandidateTag,
  parseProductionTag,
  validateSameReleaseIdentifier,
} from './releaseAppearance.ts';
import type {BetaCandidate, ProductionTag, ReleaseAppearanceIdentity} from './releaseAppearance.ts';

import {compareWebAppVersions} from '../release-metadata/webappVersion.ts';

export type ExecuteGitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type BetaReleaseTagReference = {
  readonly tagName: string;
  readonly commit: string;
  readonly taggerTimestamp: bigint;
};

export type CommitRange = {
  readonly startTag: string;
  readonly endTag: string;
  readonly baseCommit: string;
  readonly endCommit: string;
  readonly commits: readonly string[];
};

export type ReleaseCandidateRange = {
  readonly candidateTag: string;
  readonly commitRange: CommitRange;
};

export type ReleaseHistoryPlan =
  | {readonly kind: 'bootstrap'}
  | {
      readonly kind: 'beta';
      readonly currentTag: string;
      readonly precedingProductionTag: string;
      readonly candidateRanges: readonly ReleaseCandidateRange[];
    }
  | {
      readonly kind: 'production';
      readonly currentTag: string;
      readonly promotedBetaTag: string;
      readonly releaseCommit: string;
      readonly precedingProductionTag: string;
      readonly candidateRanges: readonly ReleaseCandidateRange[];
    };

export type PlanBetaReleaseHistoryOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentBetaTag: string;
  readonly releaseCommit: string;
};

export type PlanProductionReleaseHistoryOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentProductionTag: string;
  readonly promotedBetaTag: string;
  readonly releaseCommit: string;
};

export type NextBetaPreviewHistoryPlan =
  | {
      readonly kind: 'unavailable';
      readonly targetMainCommit: string;
    }
  | {
      readonly kind: 'preview';
      readonly latestBetaReleaseTag: BetaReleaseTagReference;
      readonly targetMainCommit: string;
      readonly mergeBase: string;
      readonly commits: readonly string[];
    };

export type PlanNextBetaPreviewHistoryOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly targetMainCommit: string;
};

type TagAnnotation = 'annotated' | 'lightweight';

type ProductionTagRecord = ProductionTag & {
  readonly tagName: string;
};

type SemverProductionTagRecord = Omit<ProductionTagRecord, 'release'> & {
  readonly release: Extract<ReleaseAppearanceIdentity, {readonly kind: 'semver'}>;
};

type LegacyProductionTagRecord = Omit<ProductionTagRecord, 'release'> & {
  readonly release: Extract<ReleaseAppearanceIdentity, {readonly kind: 'legacy'}>;
  readonly taggerTimestamp: bigint;
};

type BetaCandidateRecord = BetaCandidate & {
  readonly tagName: string;
};

type BetaReleaseTagRecord = BetaCandidateRecord & {
  readonly commit: string;
  readonly taggerTimestamp: bigint;
};

type BetaCandidateCommitRecord = BetaCandidateRecord & {
  readonly commit: string;
};

type CompareTagOrderOptions = {
  readonly leftTaggerTimestamp: bigint;
  readonly leftReleaseIdentifier: string;
  readonly rightTaggerTimestamp: bigint;
  readonly rightReleaseIdentifier: string;
};

type FindPrecedingProductionTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentTagName: string;
  readonly currentRelease: ReleaseAppearanceIdentity;
};

type FindPrecedingLegacyProductionTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentTagName: string;
  readonly currentRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'legacy'}>;
  readonly currentTaggerTimestamp: bigint;
};

type FindPrecedingSemverProductionTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'semver'}>;
};

type CreateCommitRangeOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly startTag: string;
  readonly endTag: string;
};

type ListBetaCandidatesThroughTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly release: ReleaseAppearanceIdentity;
  readonly candidateNumber: bigint;
  readonly currentTagName: string;
};

type ParseMatchingBetaCandidateOptions = {
  readonly betaTagName: string;
  readonly release: ReleaseAppearanceIdentity;
  readonly candidateNumber: bigint;
};

type FindPrecedingLegacyProductionTagCandidateOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly productionTagName: string;
  readonly currentTagName: string;
  readonly currentRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'legacy'}>;
  readonly currentTaggerTimestamp: bigint;
};

type SelectPrecedingSemverProductionTagOptions = {
  readonly productionTagName: string;
  readonly currentRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'semver'}>;
  readonly precedingProductionTag: Maybe<SemverProductionTagRecord>;
};

type SelectSemverProductionTagCandidateOptions = {
  readonly productionTagName: string;
  readonly candidateRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'semver'}>;
  readonly currentRelease: Extract<ReleaseAppearanceIdentity, {readonly kind: 'semver'}>;
  readonly precedingProductionTag: Maybe<SemverProductionTagRecord>;
};

type ReadBetaCandidateCommitRecordOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly betaCandidate: BetaCandidateRecord;
};

type ReadBetaReleaseTagRecordOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly betaCandidate: BetaCandidateRecord;
};

type SelectLatestBetaReleaseTagOptions = {
  readonly betaReleaseTagRecord: BetaReleaseTagRecord;
  readonly latestBetaReleaseTag: Maybe<BetaReleaseTagRecord>;
};

type ConsiderBetaCandidateForLatestReleaseOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly betaCandidate: BetaCandidateRecord;
  readonly latestBetaReleaseTag: Maybe<BetaReleaseTagRecord>;
};

type CreateCandidateRangesOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly precedingProductionTagName: string;
  readonly betaCandidates: readonly BetaCandidateRecord[];
};

const betaTagListPattern = '*-beta.*';
const productionTagListPattern = '*-production';
const releaseDateLength = 10;
const releaseSequenceStartIndex = 11;
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function createGitCommandError(commandArguments: readonly string[], error: unknown): Error {
  return new Error(`Git command failed: git ${commandArguments.join(' ')}`, {cause: error});
}

function validateReleaseCommit(releaseCommit: string): Result<string, Error> {
  if (!fullGitCommitPattern.test(releaseCommit)) {
    return createFailure('Release commit SHA must contain exactly 40 hexadecimal characters');
  }

  return createSuccess(releaseCommit);
}

function executeGitCommandWithTask(
  executeGitCommand: ExecuteGitCommand,
  commandArguments: readonly string[],
): Task<string, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return createGitCommandError(commandArguments, error);
    },
    (): Promise<string> => {
      return executeGitCommand(commandArguments);
    },
  );
}

function executeSingleLineGitCommand(
  executeGitCommand: ExecuteGitCommand,
  commandArguments: readonly string[],
): Task<string, Error> {
  return executeGitCommandWithTask(executeGitCommand, commandArguments).andThen(commandOutput => {
    const trimmedCommandOutput = commandOutput.trim();
    if (isEmptyString(trimmedCommandOutput)) {
      return createFailure(`Git command returned no output: git ${commandArguments.join(' ')}`);
    }

    if (trimmedCommandOutput.split(/\r?\n/).length !== 1) {
      return createFailure(`Git command returned multiple lines: git ${commandArguments.join(' ')}`);
    }

    return createSuccess(trimmedCommandOutput);
  });
}

function splitGitLines(commandOutput: string): readonly string[] {
  return commandOutput
    .split(/\r?\n/)
    .map(line => {
      return line.trim();
    })
    .filter(line => {
      return !isEmptyString(line);
    });
}

function listTagNames(
  executeGitCommand: ExecuteGitCommand,
  tagPatterns: readonly string[],
): Task<readonly string[], Error> {
  return executeGitCommandWithTask(executeGitCommand, ['tag', '--list', '--', ...tagPatterns]).map(splitGitLines);
}

function readTagAnnotation(executeGitCommand: ExecuteGitCommand, tagName: string): Task<TagAnnotation, Error> {
  return executeSingleLineGitCommand(executeGitCommand, ['cat-file', '-t', `refs/tags/${tagName}`]).map(tagType => {
    return tagType === 'tag' ? 'annotated' : 'lightweight';
  });
}

function requireAnnotatedTag(executeGitCommand: ExecuteGitCommand, tagName: string): Task<Unit, Error> {
  return readTagAnnotation(executeGitCommand, tagName).andThen(tagAnnotation => {
    if (tagAnnotation === 'lightweight') {
      return createFailure(`Release tag must be annotated: ${tagName}`);
    }

    return createSuccess(Unit);
  });
}

function resolveTagCommit(executeGitCommand: ExecuteGitCommand, tagName: string): Task<string, Error> {
  return executeSingleLineGitCommand(executeGitCommand, ['rev-parse', '--verify', `refs/tags/${tagName}^{commit}`]);
}

function readTaggerTimestamp(executeGitCommand: ExecuteGitCommand, tagName: string): Task<bigint, Error> {
  return executeSingleLineGitCommand(executeGitCommand, [
    'for-each-ref',
    '--format=%(taggerdate:unix)',
    `refs/tags/${tagName}`,
  ]).andThen(taggerTimestamp => {
    return result.tryOrElse(
      (error: unknown): Error => {
        return new Error(`Invalid annotated tag creation time for ${tagName}`, {cause: error});
      },
      (): bigint => {
        return BigInt(taggerTimestamp);
      },
    );
  });
}

function compareReleaseIdentifiers(leftReleaseIdentifier: string, rightReleaseIdentifier: string): number {
  const leftReleaseDate = leftReleaseIdentifier.slice(0, releaseDateLength);
  const rightReleaseDate = rightReleaseIdentifier.slice(0, releaseDateLength);

  if (leftReleaseDate < rightReleaseDate) {
    return -1;
  }

  if (leftReleaseDate > rightReleaseDate) {
    return 1;
  }

  const leftReleaseSequence = BigInt(leftReleaseIdentifier.slice(releaseSequenceStartIndex));
  const rightReleaseSequence = BigInt(rightReleaseIdentifier.slice(releaseSequenceStartIndex));
  if (leftReleaseSequence < rightReleaseSequence) {
    return -1;
  }

  if (leftReleaseSequence > rightReleaseSequence) {
    return 1;
  }

  return 0;
}

function compareTagOrder(compareTagOrderOptions: CompareTagOrderOptions): number {
  const {leftTaggerTimestamp, leftReleaseIdentifier, rightTaggerTimestamp, rightReleaseIdentifier} =
    compareTagOrderOptions;

  if (leftTaggerTimestamp < rightTaggerTimestamp) {
    return -1;
  }

  if (leftTaggerTimestamp > rightTaggerTimestamp) {
    return 1;
  }

  return compareReleaseIdentifiers(leftReleaseIdentifier, rightReleaseIdentifier);
}

async function findPrecedingLegacyProductionTagCandidate(
  findPrecedingLegacyProductionTagCandidateOptions: FindPrecedingLegacyProductionTagCandidateOptions,
): Promise<Result<Maybe<LegacyProductionTagRecord>, Error>> {
  const {executeGitCommand, productionTagName, currentTagName, currentRelease, currentTaggerTimestamp} =
    findPrecedingLegacyProductionTagCandidateOptions;
  if (productionTagName === currentTagName) {
    return createSuccess(Maybe.nothing<LegacyProductionTagRecord>());
  }

  const parsedProductionTagResult = parseProductionTag(productionTagName);
  if (parsedProductionTagResult.isErr || parsedProductionTagResult.value.release.kind !== 'legacy') {
    return createSuccess(Maybe.nothing<LegacyProductionTagRecord>());
  }

  const tagAnnotationResult = await readTagAnnotation(executeGitCommand, productionTagName);
  if (tagAnnotationResult.isErr) {
    return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
  }

  if (tagAnnotationResult.value === 'lightweight') {
    return createSuccess(Maybe.nothing<LegacyProductionTagRecord>());
  }

  const taggerTimestampResult = await readTaggerTimestamp(executeGitCommand, productionTagName);
  if (taggerTimestampResult.isErr) {
    return createFailure(taggerTimestampResult.error.message, taggerTimestampResult.error);
  }

  const productionTagRecord: LegacyProductionTagRecord = {
    release: parsedProductionTagResult.value.release,
    tagName: productionTagName,
    taggerTimestamp: taggerTimestampResult.value,
  };
  const isBeforeCurrentTag =
    compareTagOrder({
      leftTaggerTimestamp: productionTagRecord.taggerTimestamp,
      leftReleaseIdentifier: productionTagRecord.release.releaseIdentifier,
      rightTaggerTimestamp: currentTaggerTimestamp,
      rightReleaseIdentifier: currentRelease.releaseIdentifier,
    }) < 0;
  if (isBeforeCurrentTag === false) {
    return createSuccess(Maybe.nothing<LegacyProductionTagRecord>());
  }

  return createSuccess(Maybe.just(productionTagRecord));
}

function selectMoreRecentLegacyProductionTag(
  existingProductionTag: Maybe<LegacyProductionTagRecord>,
  productionTagRecord: LegacyProductionTagRecord,
): LegacyProductionTagRecord {
  const shouldReplaceExistingTag = existingProductionTag
    .map(existingTag => {
      return (
        compareTagOrder({
          leftTaggerTimestamp: productionTagRecord.taggerTimestamp,
          leftReleaseIdentifier: productionTagRecord.release.releaseIdentifier,
          rightTaggerTimestamp: existingTag.taggerTimestamp,
          rightReleaseIdentifier: existingTag.release.releaseIdentifier,
        }) > 0
      );
    })
    .unwrapOr(true);

  return shouldReplaceExistingTag ? productionTagRecord : existingProductionTag.unwrapOr(productionTagRecord);
}

function selectSemverProductionTagCandidate(
  selectSemverProductionTagCandidateOptions: SelectSemverProductionTagCandidateOptions,
): Result<Maybe<SemverProductionTagRecord>, Error> {
  const {productionTagName, candidateRelease, currentRelease, precedingProductionTag} =
    selectSemverProductionTagCandidateOptions;
  const productionTagRecord: SemverProductionTagRecord = {
    release: candidateRelease,
    tagName: productionTagName,
  };
  const comparisonToCurrentResult = compareWebAppVersions(productionTagRecord.release.version, currentRelease.version);
  if (comparisonToCurrentResult.isErr) {
    return Result.err(comparisonToCurrentResult.error);
  }

  if (comparisonToCurrentResult.value >= 0) {
    return createSuccess(precedingProductionTag);
  }

  if (precedingProductionTag.isNothing || precedingProductionTag.value.release.kind !== 'semver') {
    return createSuccess(Maybe.just(productionTagRecord));
  }

  const comparisonToPrecedingResult = compareWebAppVersions(
    productionTagRecord.release.version,
    precedingProductionTag.value.release.version,
  );
  if (comparisonToPrecedingResult.isErr) {
    return Result.err(comparisonToPrecedingResult.error);
  }

  return createSuccess(
    comparisonToPrecedingResult.value > 0 ? Maybe.just(productionTagRecord) : precedingProductionTag,
  );
}

function selectPrecedingSemverProductionTag(
  selectPrecedingSemverProductionTagOptions: SelectPrecedingSemverProductionTagOptions,
): Result<Maybe<SemverProductionTagRecord>, Error> {
  const {productionTagName, currentRelease, precedingProductionTag} = selectPrecedingSemverProductionTagOptions;
  const parsedProductionTagResult = parseProductionTag(productionTagName);
  if (parsedProductionTagResult.isErr) {
    return createSuccess(precedingProductionTag);
  }

  return match(parsedProductionTagResult.value.release)
    .with({kind: 'legacy'}, () => {
      return createSuccess(precedingProductionTag);
    })
    .with({kind: 'semver'}, candidateRelease => {
      return selectSemverProductionTagCandidate({
        productionTagName,
        candidateRelease,
        currentRelease,
        precedingProductionTag,
      });
    })
    .exhaustive();
}

function parseBetaCandidateRecord(betaTagName: string): readonly BetaCandidateRecord[] {
  const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
  if (parsedBetaCandidateResult.isErr) {
    return [];
  }

  return [{...parsedBetaCandidateResult.value, tagName: betaTagName}];
}

function parseMatchingBetaCandidateRecord(
  parseMatchingBetaCandidateOptions: ParseMatchingBetaCandidateOptions,
): readonly BetaCandidateRecord[] {
  const {betaTagName, release, candidateNumber} = parseMatchingBetaCandidateOptions;
  const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
  if (parsedBetaCandidateResult.isErr) {
    return [];
  }

  const betaCandidate = {...parsedBetaCandidateResult.value, tagName: betaTagName};
  const isMatchingRelease = haveSameReleaseAppearanceIdentity(betaCandidate.release, release);
  const isThroughRequestedCandidate = betaCandidate.candidateNumber <= candidateNumber;
  if (isMatchingRelease === false || isThroughRequestedCandidate === false) {
    return [];
  }

  return [betaCandidate];
}

function findMissingBetaCandidateIndex(betaCandidates: readonly BetaCandidate[]): number {
  return betaCandidates.findIndex((betaCandidate, candidateIndex) => {
    return betaCandidate.candidateNumber !== BigInt(candidateIndex + 1);
  });
}

async function readBetaCandidateCommitRecord(
  readBetaCandidateCommitRecordOptions: ReadBetaCandidateCommitRecordOptions,
): Promise<Result<BetaCandidateCommitRecord, Error>> {
  const {executeGitCommand, betaCandidate} = readBetaCandidateCommitRecordOptions;
  const tagAnnotationResult = await readTagAnnotation(executeGitCommand, betaCandidate.tagName);
  if (tagAnnotationResult.isErr) {
    return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
  }

  if (tagAnnotationResult.value === 'lightweight') {
    return createFailure(`Beta candidate tag must be annotated: ${betaCandidate.tagName}`);
  }

  const commitResult = await resolveTagCommit(executeGitCommand, betaCandidate.tagName);
  if (commitResult.isErr) {
    return createFailure(commitResult.error.message, commitResult.error);
  }

  return createSuccess({...betaCandidate, commit: commitResult.value});
}

async function readBetaReleaseTagRecord(
  readBetaReleaseTagRecordOptions: ReadBetaReleaseTagRecordOptions,
): Promise<Result<BetaReleaseTagRecord, Error>> {
  const {executeGitCommand, betaCandidate} = readBetaReleaseTagRecordOptions;
  const annotationResult = await requireAnnotatedTag(executeGitCommand, betaCandidate.tagName);
  if (annotationResult.isErr) {
    return Result.err(annotationResult.error);
  }

  const taggerTimestampResult = await readTaggerTimestamp(executeGitCommand, betaCandidate.tagName);
  if (taggerTimestampResult.isErr) {
    return Result.err(taggerTimestampResult.error);
  }

  const commitResult = await resolveTagCommit(executeGitCommand, betaCandidate.tagName);
  if (commitResult.isErr) {
    return Result.err(commitResult.error);
  }

  return createSuccess({
    ...betaCandidate,
    commit: commitResult.value,
    taggerTimestamp: taggerTimestampResult.value,
  });
}

async function requireAnnotatedBetaCandidateTags(
  executeGitCommand: ExecuteGitCommand,
  betaCandidates: readonly BetaCandidateRecord[],
): Promise<Result<Unit, Error>> {
  for (const betaCandidate of betaCandidates) {
    const tagAnnotationResult = await readTagAnnotation(executeGitCommand, betaCandidate.tagName);
    if (tagAnnotationResult.isErr) {
      return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
    }

    if (tagAnnotationResult.value === 'lightweight') {
      return createFailure(`Beta candidate tag must be annotated: ${betaCandidate.tagName}`);
    }
  }

  return createSuccess(Unit);
}

function selectLatestBetaReleaseTag(
  selectLatestBetaReleaseTagOptions: SelectLatestBetaReleaseTagOptions,
): Result<boolean, Error> {
  const {betaReleaseTagRecord, latestBetaReleaseTag} = selectLatestBetaReleaseTagOptions;
  if (latestBetaReleaseTag.isNothing) {
    return createSuccess(true);
  }

  const existingLatestTag = latestBetaReleaseTag.value;
  return match({betaReleaseTagRecord, existingLatestTag})
    .with(
      {
        betaReleaseTagRecord: {release: {kind: 'semver'}},
        existingLatestTag: {release: {kind: 'semver'}},
      },
      matchingSemverReleases => {
        const versionComparisonResult = compareWebAppVersions(
          matchingSemverReleases.betaReleaseTagRecord.release.version,
          matchingSemverReleases.existingLatestTag.release.version,
        );
        if (versionComparisonResult.isErr) {
          return Result.err(versionComparisonResult.error);
        }

        return createSuccess(
          versionComparisonResult.value === 0
            ? compareBetaCandidates(
                matchingSemverReleases.betaReleaseTagRecord,
                matchingSemverReleases.existingLatestTag,
              ) > 0
            : versionComparisonResult.value > 0,
        );
      },
    )
    .with(
      {
        betaReleaseTagRecord: {release: {kind: 'legacy'}},
        existingLatestTag: {release: {kind: 'legacy'}},
      },
      matchingLegacyReleases => {
        const releaseOrder = compareTagOrder({
          leftTaggerTimestamp: matchingLegacyReleases.betaReleaseTagRecord.taggerTimestamp,
          leftReleaseIdentifier: matchingLegacyReleases.betaReleaseTagRecord.release.releaseIdentifier,
          rightTaggerTimestamp: matchingLegacyReleases.existingLatestTag.taggerTimestamp,
          rightReleaseIdentifier: matchingLegacyReleases.existingLatestTag.release.releaseIdentifier,
        });

        return createSuccess(
          releaseOrder === 0
            ? compareBetaCandidates(
                matchingLegacyReleases.betaReleaseTagRecord,
                matchingLegacyReleases.existingLatestTag,
              ) > 0
            : releaseOrder > 0,
        );
      },
    )
    .otherwise(() => {
      return createSuccess(false);
    });
}

async function considerBetaCandidateForLatestRelease(
  considerBetaCandidateForLatestReleaseOptions: ConsiderBetaCandidateForLatestReleaseOptions,
): Promise<Result<Maybe<BetaReleaseTagRecord>, Error>> {
  const {executeGitCommand, betaCandidate, latestBetaReleaseTag} = considerBetaCandidateForLatestReleaseOptions;
  const betaReleaseTagRecordResult = await readBetaReleaseTagRecord({executeGitCommand, betaCandidate});
  if (betaReleaseTagRecordResult.isErr) {
    return Result.err(betaReleaseTagRecordResult.error);
  }

  const shouldReplaceLatestTagResult = selectLatestBetaReleaseTag({
    betaReleaseTagRecord: betaReleaseTagRecordResult.value,
    latestBetaReleaseTag,
  });
  if (shouldReplaceLatestTagResult.isErr) {
    return Result.err(shouldReplaceLatestTagResult.error);
  }

  return createSuccess(
    shouldReplaceLatestTagResult.value ? Maybe.just(betaReleaseTagRecordResult.value) : latestBetaReleaseTag,
  );
}

async function createCandidateRanges(
  createCandidateRangesOptions: CreateCandidateRangesOptions,
): Promise<Result<readonly ReleaseCandidateRange[], Error>> {
  const {executeGitCommand, precedingProductionTagName, betaCandidates} = createCandidateRangesOptions;
  const candidateRanges: ReleaseCandidateRange[] = [];
  let precedingTag = precedingProductionTagName;

  for (const betaCandidate of betaCandidates) {
    const commitRangeResult = await createCommitRange({
      executeGitCommand,
      startTag: precedingTag,
      endTag: betaCandidate.tagName,
    });
    if (commitRangeResult.isErr) {
      return Result.err(commitRangeResult.error);
    }

    candidateRanges.push({candidateTag: betaCandidate.tagName, commitRange: commitRangeResult.value});
    precedingTag = betaCandidate.tagName;
  }

  return createSuccess(candidateRanges);
}

async function findPrecedingLegacyProductionTag(
  findPrecedingLegacyProductionTagOptions: FindPrecedingLegacyProductionTagOptions,
): Promise<Result<Maybe<ProductionTagRecord>, Error>> {
  const {executeGitCommand, currentTagName, currentRelease, currentTaggerTimestamp} =
    findPrecedingLegacyProductionTagOptions;
  const productionTagNamesResult = await listTagNames(executeGitCommand, [productionTagListPattern]);
  if (productionTagNamesResult.isErr) {
    return createFailure(productionTagNamesResult.error.message, productionTagNamesResult.error);
  }

  let precedingProductionTag: Maybe<LegacyProductionTagRecord> = Maybe.nothing<LegacyProductionTagRecord>();
  for (const productionTagName of productionTagNamesResult.value) {
    const productionTagCandidateResult = await findPrecedingLegacyProductionTagCandidate({
      executeGitCommand,
      productionTagName,
      currentTagName,
      currentRelease,
      currentTaggerTimestamp,
    });
    if (productionTagCandidateResult.isErr) {
      return Result.err(productionTagCandidateResult.error);
    }

    if (productionTagCandidateResult.value.isJust) {
      precedingProductionTag = Maybe.just(
        selectMoreRecentLegacyProductionTag(precedingProductionTag, productionTagCandidateResult.value.value),
      );
    }
  }

  return createSuccess(
    precedingProductionTag.map(existingProductionTag => {
      return {release: existingProductionTag.release, tagName: existingProductionTag.tagName};
    }),
  );
}

async function findPrecedingSemverProductionTag(
  findPrecedingSemverProductionTagOptions: FindPrecedingSemverProductionTagOptions,
): Promise<Result<Maybe<ProductionTagRecord>, Error>> {
  const {executeGitCommand, currentRelease} = findPrecedingSemverProductionTagOptions;
  const productionTagNamesResult = await listTagNames(executeGitCommand, ['v*']);
  if (productionTagNamesResult.isErr) {
    return createFailure(productionTagNamesResult.error.message, productionTagNamesResult.error);
  }

  let precedingProductionTag: Maybe<SemverProductionTagRecord> = Maybe.nothing<SemverProductionTagRecord>();
  for (const productionTagName of productionTagNamesResult.value) {
    const precedingProductionTagResult = selectPrecedingSemverProductionTag({
      productionTagName,
      currentRelease,
      precedingProductionTag,
    });
    if (precedingProductionTagResult.isErr) {
      return createFailure(precedingProductionTagResult.error.message, precedingProductionTagResult.error);
    }

    precedingProductionTag = precedingProductionTagResult.value;
  }

  if (precedingProductionTag.isJust) {
    const annotationResult = await requireAnnotatedTag(executeGitCommand, precedingProductionTag.value.tagName);
    if (annotationResult.isErr) {
      return createFailure(annotationResult.error.message, annotationResult.error);
    }
  }

  return createSuccess(precedingProductionTag);
}

async function findPrecedingProductionTag(
  findPrecedingProductionTagOptions: FindPrecedingProductionTagOptions,
): Promise<Result<Maybe<ProductionTagRecord>, Error>> {
  const {executeGitCommand, currentTagName, currentRelease} = findPrecedingProductionTagOptions;
  return match(currentRelease)
    .returnType<Promise<Result<Maybe<ProductionTagRecord>, Error>>>()
    .with({kind: 'semver'}, semverRelease => {
      return findPrecedingSemverProductionTag({executeGitCommand, currentRelease: semverRelease});
    })
    .with({kind: 'legacy'}, async legacyRelease => {
      const currentTaggerTimestampResult = await readTaggerTimestamp(executeGitCommand, currentTagName);
      if (currentTaggerTimestampResult.isErr) {
        return createFailure(currentTaggerTimestampResult.error.message, currentTaggerTimestampResult.error);
      }

      return findPrecedingLegacyProductionTag({
        executeGitCommand,
        currentTagName,
        currentRelease: legacyRelease,
        currentTaggerTimestamp: currentTaggerTimestampResult.value,
      });
    })
    .exhaustive();
}

function createBetaCandidateTagName(release: ReleaseAppearanceIdentity, candidateNumber: bigint): string {
  return match(release)
    .with({kind: 'legacy'}, legacyRelease => {
      return `${legacyRelease.releaseIdentifier}-beta.${candidateNumber}`;
    })
    .with({kind: 'semver'}, semverRelease => {
      return `v${semverRelease.version}-beta.${candidateNumber}`;
    })
    .exhaustive();
}

async function listBetaCandidatesThroughTag(
  listBetaCandidatesThroughTagOptions: ListBetaCandidatesThroughTagOptions,
): Promise<Result<readonly BetaCandidateCommitRecord[], Error>> {
  const {executeGitCommand, release, candidateNumber, currentTagName} = listBetaCandidatesThroughTagOptions;
  const betaTagNamesResult = await listTagNames(executeGitCommand, [betaTagListPattern]);
  if (betaTagNamesResult.isErr) {
    return createFailure(betaTagNamesResult.error.message, betaTagNamesResult.error);
  }

  const matchingBetaCandidates = betaTagNamesResult.value.flatMap(betaTagName => {
    return parseMatchingBetaCandidateRecord({betaTagName, release, candidateNumber});
  });

  const betaCandidateRecords: BetaCandidateCommitRecord[] = [];
  for (const betaCandidate of matchingBetaCandidates) {
    const betaCandidateCommitRecordResult = await readBetaCandidateCommitRecord({executeGitCommand, betaCandidate});
    if (betaCandidateCommitRecordResult.isErr) {
      return Result.err(betaCandidateCommitRecordResult.error);
    }

    betaCandidateRecords.push(betaCandidateCommitRecordResult.value);
  }

  const currentTagWasFound = betaCandidateRecords.some(betaCandidate => {
    return betaCandidate.tagName === currentTagName;
  });
  if (!currentTagWasFound) {
    return createFailure(`Current Beta candidate tag was not found in matching tags: ${currentTagName}`);
  }

  const sortedBetaCandidateRecords = betaCandidateRecords.toSorted((leftCandidate, rightCandidate) => {
    return compareBetaCandidates(leftCandidate, rightCandidate);
  });
  const missingCandidateIndex = findMissingBetaCandidateIndex(sortedBetaCandidateRecords);
  if (missingCandidateIndex >= 0) {
    return createFailure(
      `Missing Beta candidate ${createBetaCandidateTagName(release, BigInt(missingCandidateIndex + 1))}`,
    );
  }

  return createSuccess(sortedBetaCandidateRecords);
}

export function findLatestBetaReleaseTag(
  executeGitCommand: ExecuteGitCommand,
): Task<Maybe<BetaReleaseTagReference>, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      if (isError(error)) {
        return error;
      }

      return new Error('Latest Beta tag selection failed', {cause: error});
    },
    async (): Promise<Maybe<BetaReleaseTagReference>> => {
      const betaTagNamesResult = await listTagNames(executeGitCommand, [betaTagListPattern]);
      if (betaTagNamesResult.isErr) {
        throw betaTagNamesResult.error;
      }

      const parsedBetaCandidates = betaTagNamesResult.value.flatMap(parseBetaCandidateRecord);

      const semverBetaCandidatesExist = parsedBetaCandidates.some(betaCandidate => {
        return betaCandidate.release.kind === 'semver';
      });
      let latestBetaReleaseTag: Maybe<BetaReleaseTagRecord> = Maybe.nothing<BetaReleaseTagRecord>();
      for (const betaCandidate of parsedBetaCandidates) {
        if (semverBetaCandidatesExist !== (betaCandidate.release.kind === 'semver')) {
          continue;
        }

        const consideredBetaCandidateResult = await considerBetaCandidateForLatestRelease({
          executeGitCommand,
          betaCandidate,
          latestBetaReleaseTag,
        });
        if (consideredBetaCandidateResult.isErr) {
          throw consideredBetaCandidateResult.error;
        }

        latestBetaReleaseTag = consideredBetaCandidateResult.value;
      }

      return latestBetaReleaseTag.map(betaReleaseTag => {
        return {
          tagName: betaReleaseTag.tagName,
          commit: betaReleaseTag.commit,
          taggerTimestamp: betaReleaseTag.taggerTimestamp,
        };
      });
    },
  );
}

export function planNextBetaPreviewHistory(
  planNextBetaPreviewHistoryOptions: PlanNextBetaPreviewHistoryOptions,
): Task<NextBetaPreviewHistoryPlan, Error> {
  const {executeGitCommand, targetMainCommit} = planNextBetaPreviewHistoryOptions;

  return task.tryOrElse(
    (error: unknown): Error => {
      if (isError(error)) {
        return error;
      }

      return new Error('Next Beta preview history planning failed', {cause: error});
    },
    async (): Promise<NextBetaPreviewHistoryPlan> => {
      const targetMainCommitResult = validateReleaseCommit(targetMainCommit);
      if (targetMainCommitResult.isErr) {
        throw new Error('Target main commit SHA must contain exactly 40 hexadecimal characters');
      }

      const resolvedTargetMainCommitResult = await executeSingleLineGitCommand(executeGitCommand, [
        'rev-parse',
        '--verify',
        `${targetMainCommitResult.value}^{commit}`,
      ]);
      if (resolvedTargetMainCommitResult.isErr) {
        throw resolvedTargetMainCommitResult.error;
      }

      const latestBetaReleaseTagResult = await findLatestBetaReleaseTag(executeGitCommand);
      if (latestBetaReleaseTagResult.isErr) {
        throw latestBetaReleaseTagResult.error;
      }

      const resolvedTargetMainCommit = resolvedTargetMainCommitResult.value;
      if (latestBetaReleaseTagResult.value.isNothing) {
        return {kind: 'unavailable', targetMainCommit: resolvedTargetMainCommit};
      }

      const latestBetaReleaseTag = latestBetaReleaseTagResult.value.value;
      const mergeBaseResult = await executeSingleLineGitCommand(executeGitCommand, [
        'merge-base',
        latestBetaReleaseTag.commit,
        resolvedTargetMainCommit,
      ]);
      if (mergeBaseResult.isErr) {
        throw mergeBaseResult.error;
      }

      const commitsResult = await executeGitCommandWithTask(executeGitCommand, [
        'rev-list',
        '--reverse',
        '--topo-order',
        `${mergeBaseResult.value}..${resolvedTargetMainCommit}`,
      ]).map(splitGitLines);
      if (commitsResult.isErr) {
        throw commitsResult.error;
      }

      return {
        kind: 'preview',
        latestBetaReleaseTag,
        targetMainCommit: resolvedTargetMainCommit,
        mergeBase: mergeBaseResult.value,
        commits: commitsResult.value,
      };
    },
  );
}

function createCommitRange(createCommitRangeOptions: CreateCommitRangeOptions): Task<CommitRange, Error> {
  const {executeGitCommand, startTag, endTag} = createCommitRangeOptions;

  return resolveTagCommit(executeGitCommand, endTag).andThen(endCommit => {
    return executeSingleLineGitCommand(executeGitCommand, [
      'merge-base',
      `refs/tags/${startTag}`,
      `refs/tags/${endTag}`,
    ]).andThen(baseCommit => {
      return executeGitCommandWithTask(executeGitCommand, ['rev-list', '--reverse', `${baseCommit}..${endCommit}`]).map(
        commitList => {
          return {
            startTag,
            endTag,
            baseCommit,
            endCommit,
            commits: splitGitLines(commitList),
          };
        },
      );
    });
  });
}

async function listBetaCandidatesThroughPromotedTag(
  listBetaCandidatesThroughPromotedTagOptions: ListBetaCandidatesThroughTagOptions,
): Promise<Result<readonly BetaCandidateRecord[], Error>> {
  const {executeGitCommand, release, candidateNumber, currentTagName} = listBetaCandidatesThroughPromotedTagOptions;
  const betaTagNamesResult = await listTagNames(executeGitCommand, [betaTagListPattern]);
  if (betaTagNamesResult.isErr) {
    return createFailure(betaTagNamesResult.error.message, betaTagNamesResult.error);
  }

  const betaCandidateRecords = betaTagNamesResult.value.flatMap(betaTagName => {
    return parseMatchingBetaCandidateRecord({betaTagName, release, candidateNumber});
  });

  const promotedBetaTagWasFound = betaCandidateRecords.some(betaCandidate => {
    return betaCandidate.tagName === currentTagName;
  });
  if (promotedBetaTagWasFound === false) {
    return createFailure(`Promoted Beta tag was not found in matching tags: ${currentTagName}`);
  }

  const candidatesThroughPromotedTag = betaCandidateRecords.toSorted((leftCandidate, rightCandidate) => {
    return compareBetaCandidates(leftCandidate, rightCandidate);
  });
  const missingCandidateIndex = findMissingBetaCandidateIndex(candidatesThroughPromotedTag);
  if (missingCandidateIndex >= 0) {
    return createFailure(
      `Missing Beta candidate ${createBetaCandidateTagName(release, BigInt(missingCandidateIndex + 1))}`,
    );
  }

  const annotatedBetaCandidateTagsResult = await requireAnnotatedBetaCandidateTags(
    executeGitCommand,
    candidatesThroughPromotedTag,
  );
  if (annotatedBetaCandidateTagsResult.isErr) {
    return Result.err(annotatedBetaCandidateTagsResult.error);
  }

  return createSuccess(candidatesThroughPromotedTag);
}

export async function planBetaReleaseHistory(
  planBetaReleaseHistoryOptions: PlanBetaReleaseHistoryOptions,
): Promise<Result<ReleaseHistoryPlan, Error>> {
  const {executeGitCommand, currentBetaTag, releaseCommit} = planBetaReleaseHistoryOptions;
  const releaseCommitResult = validateReleaseCommit(releaseCommit);
  if (releaseCommitResult.isErr) {
    return createFailure(releaseCommitResult.error.message, releaseCommitResult.error);
  }

  const parsedBetaCandidateResult = parseBetaCandidateTag(currentBetaTag);
  if (parsedBetaCandidateResult.isErr) {
    return createFailure(parsedBetaCandidateResult.error.message, parsedBetaCandidateResult.error);
  }

  const currentTagAnnotationResult = await requireAnnotatedTag(executeGitCommand, currentBetaTag);
  if (currentTagAnnotationResult.isErr) {
    return createFailure(currentTagAnnotationResult.error.message, currentTagAnnotationResult.error);
  }

  const currentBetaCommitResult = await resolveTagCommit(executeGitCommand, currentBetaTag);
  if (currentBetaCommitResult.isErr) {
    return createFailure(currentBetaCommitResult.error.message, currentBetaCommitResult.error);
  }

  if (currentBetaCommitResult.value !== releaseCommitResult.value) {
    return createFailure(`Beta tag does not point to the release commit: ${currentBetaTag}`);
  }

  const precedingProductionTagResult = await findPrecedingProductionTag({
    executeGitCommand,
    currentTagName: currentBetaTag,
    currentRelease: parsedBetaCandidateResult.value.release,
  });
  if (precedingProductionTagResult.isErr) {
    return createFailure(precedingProductionTagResult.error.message, precedingProductionTagResult.error);
  }

  if (precedingProductionTagResult.value.isNothing) {
    return createSuccess({kind: 'bootstrap'});
  }

  const precedingProductionTag = precedingProductionTagResult.value.value;
  const betaCandidatesResult = await listBetaCandidatesThroughTag({
    executeGitCommand,
    release: parsedBetaCandidateResult.value.release,
    candidateNumber: parsedBetaCandidateResult.value.candidateNumber,
    currentTagName: currentBetaTag,
  });
  if (betaCandidatesResult.isErr) {
    return createFailure(betaCandidatesResult.error.message, betaCandidatesResult.error);
  }

  const candidateRangesResult = await createCandidateRanges({
    executeGitCommand,
    precedingProductionTagName: precedingProductionTag.tagName,
    betaCandidates: betaCandidatesResult.value,
  });
  if (candidateRangesResult.isErr) {
    return createFailure(candidateRangesResult.error.message, candidateRangesResult.error);
  }

  return createSuccess({
    kind: 'beta',
    currentTag: currentBetaTag,
    precedingProductionTag: precedingProductionTag.tagName,
    candidateRanges: candidateRangesResult.value,
  });
}

export async function planProductionReleaseHistory(
  planProductionReleaseHistoryOptions: PlanProductionReleaseHistoryOptions,
): Promise<Result<ReleaseHistoryPlan, Error>> {
  const {executeGitCommand, currentProductionTag, promotedBetaTag, releaseCommit} = planProductionReleaseHistoryOptions;
  const releaseCommitResult = validateReleaseCommit(releaseCommit);
  if (releaseCommitResult.isErr) {
    return createFailure(releaseCommitResult.error.message, releaseCommitResult.error);
  }

  const parsedProductionTagResult = parseProductionTag(currentProductionTag);
  if (parsedProductionTagResult.isErr) {
    return createFailure(parsedProductionTagResult.error.message, parsedProductionTagResult.error);
  }

  const parsedPromotedBetaTagResult = parseBetaCandidateTag(promotedBetaTag);
  if (parsedPromotedBetaTagResult.isErr) {
    return createFailure(parsedPromotedBetaTagResult.error.message, parsedPromotedBetaTagResult.error);
  }

  const sameReleaseResult = validateSameReleaseIdentifier(
    parsedPromotedBetaTagResult.value,
    parsedProductionTagResult.value,
  );
  if (sameReleaseResult.isErr) {
    return createFailure(sameReleaseResult.error.message, sameReleaseResult.error);
  }

  const currentTagAnnotationResult = await requireAnnotatedTag(executeGitCommand, currentProductionTag);
  if (currentTagAnnotationResult.isErr) {
    return createFailure(currentTagAnnotationResult.error.message, currentTagAnnotationResult.error);
  }

  const promotedBetaTagAnnotationResult = await requireAnnotatedTag(executeGitCommand, promotedBetaTag);
  if (promotedBetaTagAnnotationResult.isErr) {
    return createFailure(promotedBetaTagAnnotationResult.error.message, promotedBetaTagAnnotationResult.error);
  }

  const currentProductionCommitResult = await resolveTagCommit(executeGitCommand, currentProductionTag);
  if (currentProductionCommitResult.isErr) {
    return createFailure(currentProductionCommitResult.error.message, currentProductionCommitResult.error);
  }

  const promotedBetaCommitResult = await resolveTagCommit(executeGitCommand, promotedBetaTag);
  if (promotedBetaCommitResult.isErr) {
    return createFailure(promotedBetaCommitResult.error.message, promotedBetaCommitResult.error);
  }

  if (currentProductionCommitResult.value !== releaseCommitResult.value) {
    return createFailure(`Production tag does not point to the release commit: ${currentProductionTag}`);
  }

  if (promotedBetaCommitResult.value !== releaseCommitResult.value) {
    return createFailure(`Promoted Beta tag does not point to the release commit: ${promotedBetaTag}`);
  }

  const precedingProductionTagResult = await findPrecedingProductionTag({
    executeGitCommand,
    currentTagName: currentProductionTag,
    currentRelease: parsedProductionTagResult.value.release,
  });
  if (precedingProductionTagResult.isErr) {
    return createFailure(precedingProductionTagResult.error.message, precedingProductionTagResult.error);
  }

  if (precedingProductionTagResult.value.isNothing) {
    return createSuccess({kind: 'bootstrap'});
  }

  const precedingProductionTag = precedingProductionTagResult.value.value;
  const betaCandidatesResult = await listBetaCandidatesThroughPromotedTag({
    executeGitCommand,
    release: parsedProductionTagResult.value.release,
    candidateNumber: parsedPromotedBetaTagResult.value.candidateNumber,
    currentTagName: promotedBetaTag,
  });
  if (betaCandidatesResult.isErr) {
    return createFailure(betaCandidatesResult.error.message, betaCandidatesResult.error);
  }

  const candidateRangesResult = await createCandidateRanges({
    executeGitCommand,
    precedingProductionTagName: precedingProductionTag.tagName,
    betaCandidates: betaCandidatesResult.value,
  });
  if (candidateRangesResult.isErr) {
    return createFailure(candidateRangesResult.error.message, candidateRangesResult.error);
  }

  return createSuccess({
    kind: 'production',
    currentTag: currentProductionTag,
    promotedBetaTag,
    releaseCommit: releaseCommitResult.value,
    precedingProductionTag: precedingProductionTag.tagName,
    candidateRanges: candidateRangesResult.value,
  });
}
