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
  haveSameReleaseAppearanceIdentity,
  parseBetaCandidateTag,
  parseProductionTag,
  validateSameReleaseVersion,
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
  readonly currentBetaTag: string;
  readonly releaseCommit: string;
};

export type PlanProductionReleaseHistoryOptions = {
  readonly currentProductionTag: string;
  readonly promotedBetaTag: string;
  readonly releaseCommit: string;
};

export type ReleaseHistoryDependencies = {
  readonly executeGitCommand: ExecuteGitCommand;
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
  readonly targetMainCommit: string;
};

type TagAnnotation = 'annotated' | 'lightweight';

type ProductionTagRecord = ProductionTag & {
  readonly tagName: string;
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

type FindPrecedingProductionTagOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly currentRelease: ReleaseAppearanceIdentity;
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

type SelectPrecedingProductionTagOptions = {
  readonly productionTagName: string;
  readonly currentRelease: ReleaseAppearanceIdentity;
  readonly precedingProductionTag: Maybe<ProductionTagRecord>;
};

type SelectProductionTagCandidateOptions = {
  readonly productionTagName: string;
  readonly candidateRelease: ReleaseAppearanceIdentity;
  readonly currentRelease: ReleaseAppearanceIdentity;
  readonly precedingProductionTag: Maybe<ProductionTagRecord>;
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
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

async function unwrapTask<valueType>(pendingTask: Task<valueType, Error>): Promise<valueType> {
  const taskResult = await pendingTask.toPromise();
  if (taskResult.isErr) {
    throw taskResult.error;
  }

  return taskResult.value;
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

function selectProductionTagCandidate(
  selectProductionTagCandidateOptions: SelectProductionTagCandidateOptions,
): Result<Maybe<ProductionTagRecord>, Error> {
  const {productionTagName, candidateRelease, currentRelease, precedingProductionTag} =
    selectProductionTagCandidateOptions;
  const productionTagRecord: ProductionTagRecord = {
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

  if (precedingProductionTag.isNothing) {
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

function selectPrecedingProductionTag(
  options: SelectPrecedingProductionTagOptions,
): Result<Maybe<ProductionTagRecord>, Error> {
  const {productionTagName, currentRelease, precedingProductionTag} = options;
  const parsedProductionTagResult = parseProductionTag(productionTagName);
  if (parsedProductionTagResult.isErr) {
    return createSuccess(precedingProductionTag);
  }

  return selectProductionTagCandidate({
    productionTagName,
    candidateRelease: parsedProductionTagResult.value.release,
    currentRelease,
    precedingProductionTag,
  });
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
): Promise<BetaCandidateCommitRecord> {
  const {executeGitCommand, betaCandidate} = readBetaCandidateCommitRecordOptions;
  const tagAnnotation = await unwrapTask(readTagAnnotation(executeGitCommand, betaCandidate.tagName));
  if (tagAnnotation === 'lightweight') {
    throw new Error(`Beta candidate tag must be annotated: ${betaCandidate.tagName}`);
  }

  const commit = await unwrapTask(resolveTagCommit(executeGitCommand, betaCandidate.tagName));

  return {...betaCandidate, commit};
}

async function readBetaReleaseTagRecord(
  readBetaReleaseTagRecordOptions: ReadBetaReleaseTagRecordOptions,
): Promise<BetaReleaseTagRecord> {
  const {executeGitCommand, betaCandidate} = readBetaReleaseTagRecordOptions;
  await unwrapTask(requireAnnotatedTag(executeGitCommand, betaCandidate.tagName));
  const taggerTimestamp = await unwrapTask(readTaggerTimestamp(executeGitCommand, betaCandidate.tagName));
  const commit = await unwrapTask(resolveTagCommit(executeGitCommand, betaCandidate.tagName));

  return {
    ...betaCandidate,
    commit,
    taggerTimestamp,
  };
}

async function requireAnnotatedBetaCandidateTags(
  executeGitCommand: ExecuteGitCommand,
  betaCandidates: readonly BetaCandidateRecord[],
): Promise<Unit> {
  for (const betaCandidate of betaCandidates) {
    const tagAnnotation = await unwrapTask(readTagAnnotation(executeGitCommand, betaCandidate.tagName));
    if (tagAnnotation === 'lightweight') {
      throw new Error(`Beta candidate tag must be annotated: ${betaCandidate.tagName}`);
    }
  }

  return Unit;
}

function selectLatestBetaReleaseTag(
  selectLatestBetaReleaseTagOptions: SelectLatestBetaReleaseTagOptions,
): Result<boolean, Error> {
  const {betaReleaseTagRecord, latestBetaReleaseTag} = selectLatestBetaReleaseTagOptions;
  if (latestBetaReleaseTag.isNothing) {
    return createSuccess(true);
  }

  const existingLatestTag = latestBetaReleaseTag.value;
  const versionComparisonResult = compareWebAppVersions(
    betaReleaseTagRecord.release.version,
    existingLatestTag.release.version,
  );
  if (versionComparisonResult.isErr) {
    return Result.err(versionComparisonResult.error);
  }

  return createSuccess(
    versionComparisonResult.value === 0
      ? compareBetaCandidates(betaReleaseTagRecord, existingLatestTag) > 0
      : versionComparisonResult.value > 0,
  );
}

async function considerBetaCandidateForLatestRelease(
  considerBetaCandidateForLatestReleaseOptions: ConsiderBetaCandidateForLatestReleaseOptions,
): Promise<Maybe<BetaReleaseTagRecord>> {
  const {executeGitCommand, betaCandidate, latestBetaReleaseTag} = considerBetaCandidateForLatestReleaseOptions;
  const betaReleaseTagRecord = await readBetaReleaseTagRecord({executeGitCommand, betaCandidate});

  const shouldReplaceLatestTagResult = selectLatestBetaReleaseTag({
    betaReleaseTagRecord,
    latestBetaReleaseTag,
  });
  if (shouldReplaceLatestTagResult.isErr) {
    throw shouldReplaceLatestTagResult.error;
  }

  return shouldReplaceLatestTagResult.value ? Maybe.just(betaReleaseTagRecord) : latestBetaReleaseTag;
}

async function createCandidateRanges(
  createCandidateRangesOptions: CreateCandidateRangesOptions,
): Promise<readonly ReleaseCandidateRange[]> {
  const {executeGitCommand, precedingProductionTagName, betaCandidates} = createCandidateRangesOptions;
  const candidateRanges: ReleaseCandidateRange[] = [];
  let precedingTag = precedingProductionTagName;

  for (const betaCandidate of betaCandidates) {
    const commitRange = await unwrapTask(
      createCommitRange({
        executeGitCommand,
        startTag: precedingTag,
        endTag: betaCandidate.tagName,
      }),
    );

    candidateRanges.push({candidateTag: betaCandidate.tagName, commitRange});
    precedingTag = betaCandidate.tagName;
  }

  return candidateRanges;
}

async function findPrecedingProductionTag(
  findPrecedingProductionTagOptions: FindPrecedingProductionTagOptions,
): Promise<Maybe<ProductionTagRecord>> {
  const {executeGitCommand, currentRelease} = findPrecedingProductionTagOptions;
  const productionTagNames = await unwrapTask(listTagNames(executeGitCommand, ['v*']));

  let precedingProductionTag: Maybe<ProductionTagRecord> = Maybe.nothing<ProductionTagRecord>();
  for (const productionTagName of productionTagNames) {
    const precedingProductionTagResult = selectPrecedingProductionTag({
      productionTagName,
      currentRelease,
      precedingProductionTag,
    });
    if (precedingProductionTagResult.isErr) {
      throw precedingProductionTagResult.error;
    }

    precedingProductionTag = precedingProductionTagResult.value;
  }

  if (precedingProductionTag.isJust) {
    await unwrapTask(requireAnnotatedTag(executeGitCommand, precedingProductionTag.value.tagName));
  }

  return precedingProductionTag;
}

function createBetaCandidateTagName(release: ReleaseAppearanceIdentity, candidateNumber: bigint): string {
  return `v${release.version}-beta.${candidateNumber}`;
}

async function listBetaCandidatesThroughTag(
  listBetaCandidatesThroughTagOptions: ListBetaCandidatesThroughTagOptions,
): Promise<readonly BetaCandidateCommitRecord[]> {
  const {executeGitCommand, release, candidateNumber, currentTagName} = listBetaCandidatesThroughTagOptions;
  const betaTagNames = await unwrapTask(listTagNames(executeGitCommand, [betaTagListPattern]));

  const matchingBetaCandidates = betaTagNames.flatMap(betaTagName => {
    return parseMatchingBetaCandidateRecord({betaTagName, release, candidateNumber});
  });

  const betaCandidateRecords: BetaCandidateCommitRecord[] = [];
  for (const betaCandidate of matchingBetaCandidates) {
    const betaCandidateCommitRecord = await readBetaCandidateCommitRecord({executeGitCommand, betaCandidate});
    betaCandidateRecords.push(betaCandidateCommitRecord);
  }

  const currentTagWasFound = betaCandidateRecords.some(betaCandidate => {
    return betaCandidate.tagName === currentTagName;
  });
  if (!currentTagWasFound) {
    throw new Error(`Current Beta candidate tag was not found in matching tags: ${currentTagName}`);
  }

  const sortedBetaCandidateRecords = betaCandidateRecords.toSorted((leftCandidate, rightCandidate) => {
    return compareBetaCandidates(leftCandidate, rightCandidate);
  });
  const missingCandidateIndex = findMissingBetaCandidateIndex(sortedBetaCandidateRecords);
  if (missingCandidateIndex >= 0) {
    throw new Error(`Missing Beta candidate ${createBetaCandidateTagName(release, BigInt(missingCandidateIndex + 1))}`);
  }

  return sortedBetaCandidateRecords;
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
      const betaTagNames = await unwrapTask(listTagNames(executeGitCommand, [betaTagListPattern]));

      const parsedBetaCandidates = betaTagNames.flatMap(parseBetaCandidateRecord);
      let latestBetaReleaseTag: Maybe<BetaReleaseTagRecord> = Maybe.nothing<BetaReleaseTagRecord>();
      for (const betaCandidate of parsedBetaCandidates) {
        latestBetaReleaseTag = await considerBetaCandidateForLatestRelease({
          executeGitCommand,
          betaCandidate,
          latestBetaReleaseTag,
        });
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
  releaseHistoryDependencies: ReleaseHistoryDependencies,
): Task<NextBetaPreviewHistoryPlan, Error> {
  const {targetMainCommit} = planNextBetaPreviewHistoryOptions;
  const {executeGitCommand} = releaseHistoryDependencies;

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

      const resolvedTargetMainCommit = await unwrapTask(
        executeSingleLineGitCommand(executeGitCommand, [
          'rev-parse',
          '--verify',
          `${targetMainCommitResult.value}^{commit}`,
        ]),
      );

      const latestBetaReleaseTagResult = await findLatestBetaReleaseTag(executeGitCommand);
      if (latestBetaReleaseTagResult.isErr) {
        throw latestBetaReleaseTagResult.error;
      }

      if (latestBetaReleaseTagResult.value.isNothing) {
        return {kind: 'unavailable', targetMainCommit: resolvedTargetMainCommit};
      }

      const latestBetaReleaseTag = latestBetaReleaseTagResult.value.value;
      const mergeBase = await unwrapTask(
        executeSingleLineGitCommand(executeGitCommand, [
          'merge-base',
          latestBetaReleaseTag.commit,
          resolvedTargetMainCommit,
        ]),
      );

      const commitsResult = await executeGitCommandWithTask(executeGitCommand, [
        'rev-list',
        '--reverse',
        '--topo-order',
        `${mergeBase}..${resolvedTargetMainCommit}`,
      ]).map(splitGitLines);
      if (commitsResult.isErr) {
        throw commitsResult.error;
      }

      return {
        kind: 'preview',
        latestBetaReleaseTag,
        targetMainCommit: resolvedTargetMainCommit,
        mergeBase,
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
): Promise<readonly BetaCandidateRecord[]> {
  const {executeGitCommand, release, candidateNumber, currentTagName} = listBetaCandidatesThroughPromotedTagOptions;
  const betaTagNames = await unwrapTask(listTagNames(executeGitCommand, [betaTagListPattern]));

  const betaCandidateRecords = betaTagNames.flatMap(betaTagName => {
    return parseMatchingBetaCandidateRecord({betaTagName, release, candidateNumber});
  });

  const promotedBetaTagWasFound = betaCandidateRecords.some(betaCandidate => {
    return betaCandidate.tagName === currentTagName;
  });
  if (promotedBetaTagWasFound === false) {
    throw new Error(`Promoted Beta tag was not found in matching tags: ${currentTagName}`);
  }

  const candidatesThroughPromotedTag = betaCandidateRecords.toSorted((leftCandidate, rightCandidate) => {
    return compareBetaCandidates(leftCandidate, rightCandidate);
  });
  const missingCandidateIndex = findMissingBetaCandidateIndex(candidatesThroughPromotedTag);
  if (missingCandidateIndex >= 0) {
    throw new Error(`Missing Beta candidate ${createBetaCandidateTagName(release, BigInt(missingCandidateIndex + 1))}`);
  }

  await requireAnnotatedBetaCandidateTags(executeGitCommand, candidatesThroughPromotedTag);

  return candidatesThroughPromotedTag;
}

export function planBetaReleaseHistory(
  planBetaReleaseHistoryOptions: PlanBetaReleaseHistoryOptions,
  releaseHistoryDependencies: ReleaseHistoryDependencies,
): Task<ReleaseHistoryPlan, Error> {
  const {currentBetaTag, releaseCommit} = planBetaReleaseHistoryOptions;
  const {executeGitCommand} = releaseHistoryDependencies;

  return task.tryOrElse(
    (error: unknown): Error => {
      return isError(error) ? error : new Error('Beta release history planning failed', {cause: error});
    },
    async (): Promise<ReleaseHistoryPlan> => {
      const releaseCommitResult = validateReleaseCommit(releaseCommit);
      if (releaseCommitResult.isErr) {
        throw releaseCommitResult.error;
      }

      const parsedBetaCandidateResult = parseBetaCandidateTag(currentBetaTag);
      if (parsedBetaCandidateResult.isErr) {
        throw parsedBetaCandidateResult.error;
      }

      await unwrapTask(requireAnnotatedTag(executeGitCommand, currentBetaTag));
      const currentBetaCommit = await unwrapTask(resolveTagCommit(executeGitCommand, currentBetaTag));
      if (currentBetaCommit !== releaseCommitResult.value) {
        throw new Error(`Beta tag does not point to the release commit: ${currentBetaTag}`);
      }

      const precedingProductionTag = await findPrecedingProductionTag({
        executeGitCommand,
        currentRelease: parsedBetaCandidateResult.value.release,
      });
      if (precedingProductionTag.isNothing) {
        return {kind: 'bootstrap'};
      }

      const betaCandidates = await listBetaCandidatesThroughTag({
        executeGitCommand,
        release: parsedBetaCandidateResult.value.release,
        candidateNumber: parsedBetaCandidateResult.value.candidateNumber,
        currentTagName: currentBetaTag,
      });
      const candidateRanges = await createCandidateRanges({
        executeGitCommand,
        precedingProductionTagName: precedingProductionTag.value.tagName,
        betaCandidates,
      });

      return {
        kind: 'beta',
        currentTag: currentBetaTag,
        precedingProductionTag: precedingProductionTag.value.tagName,
        candidateRanges,
      };
    },
  );
}

export function planProductionReleaseHistory(
  planProductionReleaseHistoryOptions: PlanProductionReleaseHistoryOptions,
  releaseHistoryDependencies: ReleaseHistoryDependencies,
): Task<ReleaseHistoryPlan, Error> {
  const {currentProductionTag, promotedBetaTag, releaseCommit} = planProductionReleaseHistoryOptions;
  const {executeGitCommand} = releaseHistoryDependencies;

  return task.tryOrElse(
    (error: unknown): Error => {
      return isError(error) ? error : new Error('Production release history planning failed', {cause: error});
    },
    async (): Promise<ReleaseHistoryPlan> => {
      const releaseCommitResult = validateReleaseCommit(releaseCommit);
      if (releaseCommitResult.isErr) {
        throw releaseCommitResult.error;
      }

      const parsedProductionTagResult = parseProductionTag(currentProductionTag);
      if (parsedProductionTagResult.isErr) {
        throw parsedProductionTagResult.error;
      }

      const parsedPromotedBetaTagResult = parseBetaCandidateTag(promotedBetaTag);
      if (parsedPromotedBetaTagResult.isErr) {
        throw parsedPromotedBetaTagResult.error;
      }

      const sameReleaseResult = validateSameReleaseVersion(
        parsedPromotedBetaTagResult.value,
        parsedProductionTagResult.value,
      );
      if (sameReleaseResult.isErr) {
        throw sameReleaseResult.error;
      }

      await unwrapTask(requireAnnotatedTag(executeGitCommand, currentProductionTag));
      await unwrapTask(requireAnnotatedTag(executeGitCommand, promotedBetaTag));
      const currentProductionCommit = await unwrapTask(resolveTagCommit(executeGitCommand, currentProductionTag));
      const promotedBetaCommit = await unwrapTask(resolveTagCommit(executeGitCommand, promotedBetaTag));
      if (currentProductionCommit !== releaseCommitResult.value) {
        throw new Error(`Production tag does not point to the release commit: ${currentProductionTag}`);
      }

      if (promotedBetaCommit !== releaseCommitResult.value) {
        throw new Error(`Promoted Beta tag does not point to the release commit: ${promotedBetaTag}`);
      }

      const precedingProductionTag = await findPrecedingProductionTag({
        executeGitCommand,
        currentRelease: parsedProductionTagResult.value.release,
      });
      if (precedingProductionTag.isNothing) {
        return {kind: 'bootstrap'};
      }

      const betaCandidates = await listBetaCandidatesThroughPromotedTag({
        executeGitCommand,
        release: parsedProductionTagResult.value.release,
        candidateNumber: parsedPromotedBetaTagResult.value.candidateNumber,
        currentTagName: promotedBetaTag,
      });
      const candidateRanges = await createCandidateRanges({
        executeGitCommand,
        precedingProductionTagName: precedingProductionTag.value.tagName,
        betaCandidates,
      });

      return {
        kind: 'production',
        currentTag: currentProductionTag,
        promotedBetaTag,
        releaseCommit: releaseCommitResult.value,
        precedingProductionTag: precedingProductionTag.value.tagName,
        candidateRanges,
      };
    },
  );
}
