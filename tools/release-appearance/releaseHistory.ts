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

import {
  compareBetaCandidates,
  parseBetaCandidateTag,
  parseProductionTag,
  validateSameReleaseIdentifier,
} from './releaseAppearance.ts';
import type {BetaCandidate, ProductionTag} from './releaseAppearance.ts';

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

export type ProductionCandidateRange = {
  readonly candidateTag: string;
  readonly commitRange: CommitRange;
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
  readonly taggerTimestamp: bigint;
};

type BetaCandidateRecord = BetaCandidate & {
  readonly tagName: string;
};

type BetaReleaseTagRecord = BetaCandidateRecord & {
  readonly commit: string;
  readonly taggerTimestamp: bigint;
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
      return isEmptyString(line) === false;
    });
}

function listTagNames(executeGitCommand: ExecuteGitCommand, tagPattern: string): Task<readonly string[], Error> {
  return executeGitCommandWithTask(executeGitCommand, ['tag', '--list', '--', tagPattern]).map(splitGitLines);
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

async function findPrecedingProductionTag(
  findPrecedingProductionTagOptions: FindPrecedingProductionTagOptions,
): Promise<Result<Maybe<ProductionTagRecord>, Error>> {
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

    const shouldReplacePrecedingTag = precedingProductionTag
      .map(existingProductionTag => {
        return (
          compareTagOrder({
            leftTaggerTimestamp: productionTagRecord.taggerTimestamp,
            leftReleaseIdentifier: productionTagRecord.releaseIdentifier,
            rightTaggerTimestamp: existingProductionTag.taggerTimestamp,
            rightReleaseIdentifier: existingProductionTag.releaseIdentifier,
          }) > 0
        );
      })
      .unwrapOr(true);
    if (shouldReplacePrecedingTag) {
      precedingProductionTag = Maybe.just(productionTagRecord);
    }
  }

  return createSuccess(precedingProductionTag);
}

async function findPrecedingBetaCandidate(
  executeGitCommand: ExecuteGitCommand,
  currentBetaCandidate: BetaCandidate,
): Promise<Result<Maybe<BetaCandidateRecord>, Error>> {
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
    const shouldReplacePrecedingCandidate = precedingBetaCandidate
      .map(existingBetaCandidate => {
        return compareBetaCandidates(betaCandidateRecord, existingBetaCandidate) > 0;
      })
      .unwrapOr(true);
    if (shouldReplacePrecedingCandidate) {
      precedingBetaCandidate = Maybe.just(betaCandidateRecord);
    }
  }

  return createSuccess(precedingBetaCandidate);
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
      const betaTagNamesResult = await listTagNames(executeGitCommand, betaTagListPattern);
      if (betaTagNamesResult.isErr) {
        throw betaTagNamesResult.error;
      }

      let latestBetaReleaseTag: Maybe<BetaReleaseTagRecord> = Maybe.nothing<BetaReleaseTagRecord>();
      for (const betaTagName of betaTagNamesResult.value) {
        const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
        if (parsedBetaCandidateResult.isErr) {
          continue;
        }

        const tagAnnotationResult = await requireAnnotatedTag(executeGitCommand, betaTagName);
        if (tagAnnotationResult.isErr) {
          throw tagAnnotationResult.error;
        }

        const taggerTimestampResult = await readTaggerTimestamp(executeGitCommand, betaTagName);
        if (taggerTimestampResult.isErr) {
          throw taggerTimestampResult.error;
        }

        const commitResult = await resolveTagCommit(executeGitCommand, betaTagName);
        if (commitResult.isErr) {
          throw commitResult.error;
        }

        const betaReleaseTagRecord: BetaReleaseTagRecord = {
          ...parsedBetaCandidateResult.value,
          tagName: betaTagName,
          commit: commitResult.value,
          taggerTimestamp: taggerTimestampResult.value,
        };
        const shouldReplaceLatestTag = latestBetaReleaseTag
          .map(existingLatestTag => {
            const releaseOrder = compareTagOrder({
              leftTaggerTimestamp: betaReleaseTagRecord.taggerTimestamp,
              leftReleaseIdentifier: betaReleaseTagRecord.releaseIdentifier,
              rightTaggerTimestamp: existingLatestTag.taggerTimestamp,
              rightReleaseIdentifier: existingLatestTag.releaseIdentifier,
            });

            return (
              (releaseOrder === 0 ? compareBetaCandidates(betaReleaseTagRecord, existingLatestTag) : releaseOrder) > 0
            );
          })
          .unwrapOr(true);
        if (shouldReplaceLatestTag) {
          latestBetaReleaseTag = Maybe.just(betaReleaseTagRecord);
        }
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
  listBetaCandidatesThroughPromotedTagOptions: ListBetaCandidatesThroughPromotedTagOptions,
): Promise<Result<readonly BetaCandidateRecord[], Error>> {
  const {executeGitCommand, releaseIdentifier, promotedBetaCandidate, promotedBetaTagName} =
    listBetaCandidatesThroughPromotedTagOptions;
  const betaTagNamesResult = await listTagNames(executeGitCommand, betaTagListPattern);
  if (betaTagNamesResult.isErr) {
    return createFailure(betaTagNamesResult.error.message, betaTagNamesResult.error);
  }

  const betaCandidateRecords: BetaCandidateRecord[] = [];
  let promotedBetaTagWasFound = false;
  for (const betaTagName of betaTagNamesResult.value) {
    const parsedBetaCandidateResult = parseBetaCandidateTag(betaTagName);
    if (parsedBetaCandidateResult.isErr) {
      continue;
    }

    const parsedBetaCandidate = parsedBetaCandidateResult.value;
    if (
      parsedBetaCandidate.releaseIdentifier !== releaseIdentifier ||
      parsedBetaCandidate.candidateNumber > promotedBetaCandidate.candidateNumber
    ) {
      continue;
    }

    betaCandidateRecords.push({...parsedBetaCandidate, tagName: betaTagName});
    if (betaTagName === promotedBetaTagName) {
      promotedBetaTagWasFound = true;
    }
  }

  if (!promotedBetaTagWasFound) {
    return createFailure(`Promoted Beta tag was not found in matching tags: ${promotedBetaTagName}`);
  }

  const candidatesThroughPromotedTag = betaCandidateRecords.toSorted((leftCandidate, rightCandidate) => {
    return compareBetaCandidates(leftCandidate, rightCandidate);
  });
  for (let candidateIndex = 0; candidateIndex < candidatesThroughPromotedTag.length; candidateIndex += 1) {
    const betaCandidate = Maybe.of(candidatesThroughPromotedTag[candidateIndex]);
    if (betaCandidate.isNothing) {
      return createFailure('Beta candidate continuity validation failed');
    }

    const expectedCandidateNumber = BigInt(candidateIndex + 1);
    if (betaCandidate.value.candidateNumber !== expectedCandidateNumber) {
      return createFailure(`Missing Beta candidate ${releaseIdentifier}-beta.${expectedCandidateNumber}`);
    }

    const tagAnnotationResult = await readTagAnnotation(executeGitCommand, betaCandidate.value.tagName);
    if (tagAnnotationResult.isErr) {
      return createFailure(tagAnnotationResult.error.message, tagAnnotationResult.error);
    }

    if (tagAnnotationResult.value === 'lightweight') {
      return createFailure(`Beta candidate tag must be annotated: ${betaCandidate.value.tagName}`);
    }
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

  const precedingProductionTag = precedingProductionTagResult.value.value;
  const precedingBetaCandidateResult = await findPrecedingBetaCandidate(
    executeGitCommand,
    parsedBetaCandidateResult.value,
  );
  if (precedingBetaCandidateResult.isErr) {
    return createFailure(precedingBetaCandidateResult.error.message, precedingBetaCandidateResult.error);
  }

  const precedingTag = precedingBetaCandidateResult.value
    .map(betaCandidate => {
      return betaCandidate.tagName;
    })
    .unwrapOr(precedingProductionTag.tagName);
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
    precedingProductionTag: precedingProductionTag.tagName,
    precedingTag,
    commitRange: commitRangeResult.value,
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

  const precedingProductionTag = precedingProductionTagResult.value.value;
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
  let precedingTag = precedingProductionTag.tagName;
  for (const betaCandidate of betaCandidatesResult.value) {
    const commitRangeResult = await createCommitRange({
      executeGitCommand,
      startTag: precedingTag,
      endTag: betaCandidate.tagName,
    });
    if (commitRangeResult.isErr) {
      return createFailure(commitRangeResult.error.message, commitRangeResult.error);
    }

    candidateRanges.push({
      candidateTag: betaCandidate.tagName,
      commitRange: commitRangeResult.value,
    });
    precedingTag = betaCandidate.tagName;
  }

  return createSuccess({
    kind: 'production',
    currentTag: currentProductionTag,
    promotedBetaTag,
    releaseCommit: releaseCommitResult.value,
    precedingProductionTag: precedingProductionTag.tagName,
    candidateRanges,
  });
}
