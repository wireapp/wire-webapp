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

import {Maybe, Result, Task, Unit, result, task} from 'true-myth';

import {
  compareBetaCandidates,
  parseBetaCandidateTag,
  parseProductionTag,
  validateSameReleaseIdentifier,
} from './releaseAppearance.ts';
import type {BetaCandidate, ProductionTag} from './releaseAppearance.ts';

export type ExecuteGitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type ReleaseHistoryResult<valueType> = Result<valueType, Error>;

type ReleaseHistoryTask<valueType> = Task<valueType, Error>;

export type CommitRange = {
  readonly startTag: string;
  readonly endTag: string;
  readonly baseCommit: string;
  readonly endCommit: string;
  readonly commits: readonly string[];
};

export type ReleaseHistoryPlan =
  | {readonly kind: 'bootstrap'}
  | {
      readonly kind: 'beta';
      readonly currentTag: string;
      readonly precedingProductionTag: string;
      readonly precedingTag: string;
      readonly commitRange: CommitRange;
    }
  | {
      readonly kind: 'production';
      readonly currentTag: string;
      readonly promotedBetaTag: string;
      readonly releaseCommit: string;
      readonly precedingProductionTag: string;
      readonly candidateRanges: readonly ProductionCandidateRange[];
    };

export type ProductionCandidateRange = {
  readonly candidateTag: string;
  readonly commitRange: CommitRange;
};

type TagAnnotation = 'annotated' | 'lightweight';

type ProductionTagRecord = ProductionTag & {
  readonly tagName: string;
  readonly taggerTimestamp: bigint;
};

type BetaCandidateRecord = BetaCandidate & {
  readonly tagName: string;
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
  readonly currentReleaseIdentifier: string;
  readonly currentTaggerTimestamp: bigint;
};

type CreateCommitRangeOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly startTag: string;
  readonly endTag: string;
};

type ListBetaCandidatesThroughPromotedTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly releaseIdentifier: string;
  readonly promotedBetaCandidate: BetaCandidate;
  readonly promotedBetaTagName: string;
};

export type PlanProductionReleaseHistoryOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentProductionTag: string;
  readonly promotedBetaTag: string;
  readonly releaseCommit: string;
};

const betaTagListPattern = '*-beta.*';
const productionTagListPattern = '*-production';
const releaseDateLength = 10;
const releaseSequenceStartIndex = 11;

function createSuccess<valueType>(value: valueType): ReleaseHistoryResult<valueType> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): ReleaseHistoryResult<valueType> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function createGitCommandError(commandArguments: readonly string[], error: unknown): Error {
  return new Error(`Git command failed: git ${commandArguments.join(' ')}`, {cause: error});
}

function extractMaybeValue<valueType extends {}>(
  maybeValue: Maybe<valueType>,
  errorMessage: string,
): ReleaseHistoryResult<valueType> {
  return maybeValue.match({
    Just(value) {
      return createSuccess(value);
    },
    Nothing() {
      return createFailure(errorMessage);
    },
  });
}

function executeGitCommandWithTask(
  executeGitCommand: ExecuteGitCommand,
  commandArguments: readonly string[],
): ReleaseHistoryTask<string> {
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
): ReleaseHistoryTask<string> {
  return executeGitCommandWithTask(executeGitCommand, commandArguments).andThen(commandOutput => {
    const trimmedCommandOutput = commandOutput.trim();
    if (trimmedCommandOutput.length === 0) {
      return createFailure(`Git command returned no output: git ${commandArguments.join(' ')}`);
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
      return line.length > 0;
    });
}

function listTagNames(executeGitCommand: ExecuteGitCommand, tagPattern: string): ReleaseHistoryTask<readonly string[]> {
  return executeGitCommandWithTask(executeGitCommand, ['tag', '--list', '--', tagPattern]).map(splitGitLines);
}

function readTagAnnotation(executeGitCommand: ExecuteGitCommand, tagName: string): ReleaseHistoryTask<TagAnnotation> {
  return executeSingleLineGitCommand(executeGitCommand, ['cat-file', '-t', `refs/tags/${tagName}`]).map(tagType => {
    return tagType === 'tag' ? 'annotated' : 'lightweight';
  });
}

function requireAnnotatedTag(executeGitCommand: ExecuteGitCommand, tagName: string): ReleaseHistoryTask<Unit> {
  return readTagAnnotation(executeGitCommand, tagName).andThen(tagAnnotation => {
    if (tagAnnotation === 'lightweight') {
      return createFailure(`Release tag must be annotated: ${tagName}`);
    }

    return createSuccess(Unit);
  });
}

function resolveTagCommit(executeGitCommand: ExecuteGitCommand, tagName: string): ReleaseHistoryTask<string> {
  return executeSingleLineGitCommand(executeGitCommand, ['rev-parse', '--verify', `refs/tags/${tagName}^{commit}`]);
}

function readTaggerTimestamp(executeGitCommand: ExecuteGitCommand, tagName: string): ReleaseHistoryTask<bigint> {
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

async function findPrecedingProductionTag(
  findPrecedingProductionTagOptions: FindPrecedingProductionTagOptions,
): Promise<ReleaseHistoryResult<Maybe<ProductionTagRecord>>> {
  const {executeGitCommand, currentTagName, currentReleaseIdentifier, currentTaggerTimestamp} =
    findPrecedingProductionTagOptions;

  const productionTagNamesResult = await listTagNames(executeGitCommand, productionTagListPattern);
  if (productionTagNamesResult.isErr) {
    return createFailure(productionTagNamesResult.error.message, productionTagNamesResult.error);
  }

  let precedingProductionTag: Maybe<ProductionTagRecord> = Maybe.nothing<ProductionTagRecord>();

  for (const productionTagName of productionTagNamesResult.value) {
    if (productionTagName === currentTagName) {
      continue;
    }

    const parsedProductionTagResult = parseProductionTag(productionTagName);
    if (parsedProductionTagResult.isErr) {
      continue;
    }

    const tagAnnotationResult = await readTagAnnotation(executeGitCommand, productionTagName);
    if (tagAnnotationResult.isErr) {
      return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
    }

    if (tagAnnotationResult.value === 'lightweight') {
      continue;
    }

    const taggerTimestampResult = await readTaggerTimestamp(executeGitCommand, productionTagName);
    if (taggerTimestampResult.isErr) {
      return createFailure(taggerTimestampResult.error.message, taggerTimestampResult.error);
    }

    const productionTagRecord: ProductionTagRecord = {
      ...parsedProductionTagResult.value,
      tagName: productionTagName,
      taggerTimestamp: taggerTimestampResult.value,
    };
    const isBeforeCurrentTag =
      compareTagOrder({
        leftTaggerTimestamp: productionTagRecord.taggerTimestamp,
        leftReleaseIdentifier: productionTagRecord.releaseIdentifier,
        rightTaggerTimestamp: currentTaggerTimestamp,
        rightReleaseIdentifier: currentReleaseIdentifier,
      }) < 0;

    if (!isBeforeCurrentTag) {
      continue;
    }

    const shouldReplacePrecedingProductionTag = precedingProductionTag.match({
      Just(existingProductionTag) {
        return (
          compareTagOrder({
            leftTaggerTimestamp: productionTagRecord.taggerTimestamp,
            leftReleaseIdentifier: productionTagRecord.releaseIdentifier,
            rightTaggerTimestamp: existingProductionTag.taggerTimestamp,
            rightReleaseIdentifier: existingProductionTag.releaseIdentifier,
          }) > 0
        );
      },
      Nothing() {
        return true;
      },
    });

    if (shouldReplacePrecedingProductionTag) {
      precedingProductionTag = Maybe.just(productionTagRecord);
    }
  }

  return createSuccess(precedingProductionTag);
}

async function findPrecedingBetaCandidate(
  executeGitCommand: ExecuteGitCommand,
  currentBetaCandidate: BetaCandidate,
): Promise<ReleaseHistoryResult<Maybe<BetaCandidateRecord>>> {
  const betaTagNamesResult = await listTagNames(executeGitCommand, betaTagListPattern);
  if (betaTagNamesResult.isErr) {
    return createFailure(betaTagNamesResult.error.message, betaTagNamesResult.error);
  }

  let precedingBetaCandidate: Maybe<BetaCandidateRecord> = Maybe.nothing<BetaCandidateRecord>();

  for (const betaTagName of betaTagNamesResult.value) {
    const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
    if (parsedBetaCandidateResult.isErr) {
      continue;
    }

    const parsedBetaCandidate = parsedBetaCandidateResult.value;
    if (
      parsedBetaCandidate.releaseIdentifier !== currentBetaCandidate.releaseIdentifier ||
      parsedBetaCandidate.candidateNumber >= currentBetaCandidate.candidateNumber
    ) {
      continue;
    }

    const tagAnnotationResult = await readTagAnnotation(executeGitCommand, betaTagName);
    if (tagAnnotationResult.isErr) {
      return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
    }

    if (tagAnnotationResult.value === 'lightweight') {
      return createFailure(`Beta candidate tag must be annotated: ${betaTagName}`);
    }

    const betaCandidateRecord: BetaCandidateRecord = {
      ...parsedBetaCandidate,
      tagName: betaTagName,
    };

    const shouldReplacePrecedingBetaCandidate = precedingBetaCandidate.match({
      Just(existingBetaCandidate) {
        return compareBetaCandidates(betaCandidateRecord, existingBetaCandidate) > 0;
      },
      Nothing() {
        return true;
      },
    });

    if (shouldReplacePrecedingBetaCandidate) {
      precedingBetaCandidate = Maybe.just(betaCandidateRecord);
    }
  }

  return createSuccess(precedingBetaCandidate);
}

function createCommitRange(createCommitRangeOptions: CreateCommitRangeOptions): ReleaseHistoryTask<CommitRange> {
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
  listBetaCandidatesThroughPromotedTagOptions: ListBetaCandidatesThroughPromotedTagOptions,
): Promise<ReleaseHistoryResult<readonly BetaCandidateRecord[]>> {
  const {executeGitCommand, releaseIdentifier, promotedBetaCandidate, promotedBetaTagName} =
    listBetaCandidatesThroughPromotedTagOptions;

  const betaTagNamesResult = await listTagNames(executeGitCommand, betaTagListPattern);
  if (betaTagNamesResult.isErr) {
    return createFailure(betaTagNamesResult.error.message, betaTagNamesResult.error);
  }

  const betaCandidateRecords: BetaCandidateRecord[] = [];
  let promotedBetaCandidateRecord: Maybe<BetaCandidateRecord> = Maybe.nothing<BetaCandidateRecord>();

  for (const betaTagName of betaTagNamesResult.value) {
    const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
    if (parsedBetaCandidateResult.isErr) {
      continue;
    }

    const parsedBetaCandidate = parsedBetaCandidateResult.value;
    if (parsedBetaCandidate.releaseIdentifier !== releaseIdentifier) {
      continue;
    }

    const betaCandidateRecord: BetaCandidateRecord = {
      ...parsedBetaCandidate,
      tagName: betaTagName,
    };
    betaCandidateRecords.push(betaCandidateRecord);

    if (betaTagName === promotedBetaTagName) {
      promotedBetaCandidateRecord = Maybe.just(betaCandidateRecord);
    }
  }

  if (promotedBetaCandidateRecord.isNothing) {
    return createFailure(`Promoted Beta tag was not found in matching tags: ${promotedBetaTagName}`);
  }

  const highestBetaCandidate = betaCandidateRecords.reduce((highestCandidate, betaCandidate) => {
    return compareBetaCandidates(betaCandidate, highestCandidate) > 0 ? betaCandidate : highestCandidate;
  });
  if (compareBetaCandidates(highestBetaCandidate, promotedBetaCandidate) !== 0) {
    return createFailure(`Promoted Beta tag must be the highest candidate for ${releaseIdentifier}`);
  }

  const candidatesThroughPromotedTag = betaCandidateRecords
    .filter(betaCandidate => {
      return betaCandidate.candidateNumber <= promotedBetaCandidate.candidateNumber;
    })
    .toSorted((leftCandidate, rightCandidate) => {
      return compareBetaCandidates(leftCandidate, rightCandidate);
    });

  for (const betaCandidate of candidatesThroughPromotedTag) {
    const tagAnnotationResult = await readTagAnnotation(executeGitCommand, betaCandidate.tagName);
    if (tagAnnotationResult.isErr) {
      return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
    }

    if (tagAnnotationResult.value === 'lightweight') {
      return createFailure(`Beta candidate tag must be annotated: ${betaCandidate.tagName}`);
    }
  }

  for (let candidateIndex = 0; candidateIndex < candidatesThroughPromotedTag.length; candidateIndex += 1) {
    const expectedCandidateNumber = BigInt(candidateIndex + 1);
    if (candidatesThroughPromotedTag[candidateIndex].candidateNumber !== expectedCandidateNumber) {
      return createFailure(`Missing Beta candidate ${releaseIdentifier}-beta.${expectedCandidateNumber}`);
    }
  }

  return createSuccess(candidatesThroughPromotedTag);
}

export async function planBetaReleaseHistory(
  executeGitCommand: ExecuteGitCommand,
  currentBetaTag: string,
): Promise<ReleaseHistoryResult<ReleaseHistoryPlan>> {
  const parsedBetaCandidateResult = parseBetaCandidateTag(currentBetaTag);
  if (parsedBetaCandidateResult.isErr) {
    return createFailure(parsedBetaCandidateResult.error.message, parsedBetaCandidateResult.error);
  }

  const currentTagAnnotationResult = await requireAnnotatedTag(executeGitCommand, currentBetaTag);
  if (currentTagAnnotationResult.isErr) {
    return createFailure(currentTagAnnotationResult.error.message, currentTagAnnotationResult.error);
  }

  const currentTaggerTimestampResult = await readTaggerTimestamp(executeGitCommand, currentBetaTag);
  if (currentTaggerTimestampResult.isErr) {
    return createFailure(currentTaggerTimestampResult.error.message, currentTaggerTimestampResult.error);
  }

  const precedingProductionTagResult = await findPrecedingProductionTag({
    executeGitCommand,
    currentTagName: currentBetaTag,
    currentReleaseIdentifier: parsedBetaCandidateResult.value.releaseIdentifier,
    currentTaggerTimestamp: currentTaggerTimestampResult.value,
  });
  if (precedingProductionTagResult.isErr) {
    return createFailure(precedingProductionTagResult.error.message, precedingProductionTagResult.error);
  }

  if (precedingProductionTagResult.value.isNothing) {
    return createSuccess({kind: 'bootstrap'});
  }

  const precedingProductionTagValueResult = extractMaybeValue(
    precedingProductionTagResult.value,
    'Preceding Production tag is missing after selection',
  );
  if (precedingProductionTagValueResult.isErr) {
    return createFailure(precedingProductionTagValueResult.error.message, precedingProductionTagValueResult.error);
  }
  const precedingProductionTagValue = precedingProductionTagValueResult.value;

  const precedingBetaCandidateResult = await findPrecedingBetaCandidate(
    executeGitCommand,
    parsedBetaCandidateResult.value,
  );
  if (precedingBetaCandidateResult.isErr) {
    return createFailure(precedingBetaCandidateResult.error.message, precedingBetaCandidateResult.error);
  }

  const precedingTag = precedingBetaCandidateResult.value.match({
    Just(betaCandidate) {
      return betaCandidate.tagName;
    },
    Nothing() {
      return precedingProductionTagValue.tagName;
    },
  });
  const commitRangeResult = await createCommitRange({
    executeGitCommand,
    startTag: precedingTag,
    endTag: currentBetaTag,
  });
  if (commitRangeResult.isErr) {
    return createFailure(commitRangeResult.error.message, commitRangeResult.error);
  }

  return createSuccess({
    kind: 'beta',
    currentTag: currentBetaTag,
    precedingProductionTag: precedingProductionTagValue.tagName,
    precedingTag,
    commitRange: commitRangeResult.value,
  });
}

export async function planProductionReleaseHistory(
  planProductionReleaseHistoryOptions: PlanProductionReleaseHistoryOptions,
): Promise<ReleaseHistoryResult<ReleaseHistoryPlan>> {
  const {executeGitCommand, currentProductionTag, promotedBetaTag, releaseCommit} = planProductionReleaseHistoryOptions;

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

  const expectedReleaseCommit = releaseCommit.trim();
  if (expectedReleaseCommit.length === 0) {
    return createFailure('Production release commit must not be empty');
  }

  if (currentProductionCommitResult.value !== expectedReleaseCommit) {
    return createFailure(`Production tag does not point to the release commit: ${currentProductionTag}`);
  }

  if (promotedBetaCommitResult.value !== expectedReleaseCommit) {
    return createFailure(`Promoted Beta tag does not point to the release commit: ${promotedBetaTag}`);
  }

  const currentTaggerTimestampResult = await readTaggerTimestamp(executeGitCommand, currentProductionTag);
  if (currentTaggerTimestampResult.isErr) {
    return createFailure(currentTaggerTimestampResult.error.message, currentTaggerTimestampResult.error);
  }

  const precedingProductionTagResult = await findPrecedingProductionTag({
    executeGitCommand,
    currentTagName: currentProductionTag,
    currentReleaseIdentifier: parsedProductionTagResult.value.releaseIdentifier,
    currentTaggerTimestamp: currentTaggerTimestampResult.value,
  });
  if (precedingProductionTagResult.isErr) {
    return createFailure(precedingProductionTagResult.error.message, precedingProductionTagResult.error);
  }

  if (precedingProductionTagResult.value.isNothing) {
    return createSuccess({kind: 'bootstrap'});
  }

  const precedingProductionTagValueResult = extractMaybeValue(
    precedingProductionTagResult.value,
    'Preceding Production tag is missing after selection',
  );
  if (precedingProductionTagValueResult.isErr) {
    return createFailure(precedingProductionTagValueResult.error.message, precedingProductionTagValueResult.error);
  }
  const precedingProductionTagValue = precedingProductionTagValueResult.value;

  const betaCandidatesResult = await listBetaCandidatesThroughPromotedTag({
    executeGitCommand,
    releaseIdentifier: parsedProductionTagResult.value.releaseIdentifier,
    promotedBetaCandidate: parsedPromotedBetaTagResult.value,
    promotedBetaTagName: promotedBetaTag,
  });
  if (betaCandidatesResult.isErr) {
    return createFailure(betaCandidatesResult.error.message, betaCandidatesResult.error);
  }

  const candidateRanges: ProductionCandidateRange[] = [];
  for (let candidateIndex = 0; candidateIndex < betaCandidatesResult.value.length; candidateIndex += 1) {
    const betaCandidate = betaCandidatesResult.value[candidateIndex];
    const startTag =
      candidateIndex === 0
        ? precedingProductionTagValue.tagName
        : betaCandidatesResult.value[candidateIndex - 1].tagName;
    const commitRangeResult = await createCommitRange({
      executeGitCommand,
      startTag,
      endTag: betaCandidate.tagName,
    });
    if (commitRangeResult.isErr) {
      return createFailure(commitRangeResult.error.message, commitRangeResult.error);
    }

    candidateRanges.push({candidateTag: betaCandidate.tagName, commitRange: commitRangeResult.value});
  }

  return createSuccess({
    kind: 'production',
    currentTag: currentProductionTag,
    promotedBetaTag,
    releaseCommit: expectedReleaseCommit,
    precedingProductionTag: precedingProductionTagValue.tagName,
    candidateRanges,
  });
}
