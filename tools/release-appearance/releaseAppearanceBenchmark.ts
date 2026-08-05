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

import pMap from 'p-map';
import {Maybe} from 'true-myth';

import {createFireAndForgetInvoker} from '../../libraries/core/src/taskExecution/fireAndForgetInvoker/fireAndForgetInvoker.ts';

type BenchmarkOperation = {
  readonly operationNumber: number;
  readonly result: string;
};

type ActiveOperationState = {
  activeOperations: number;
  maximumActiveOperations: number;
};

type BenchmarkMeasurement = {
  readonly durationMilliseconds: number;
  readonly maximumActiveOperations: number;
  readonly results: readonly BenchmarkOperation[];
};

type BenchmarkResults = {
  readonly simulatedLatencyMilliseconds: number;
  readonly commitDiscoverySerial: BenchmarkMeasurement;
  readonly commitDiscoveryConcurrent: BenchmarkMeasurement;
  readonly commentProcessingSerial: BenchmarkMeasurement;
  readonly commentProcessingConcurrent: BenchmarkMeasurement;
};

type MeasureBenchmarkOperationsOptions = {
  readonly operationNumbers: readonly number[];
  readonly concurrency: number;
  readonly simulatedLatencyMilliseconds: number;
  readonly createResult: (operationNumber: number) => string;
};

const commitLookupCount = 253;
const pullRequestCommentOperationCount = 80;
const commentOperationKindCount = 3;
const defaultSimulatedLatencyMilliseconds = 5;
const serialConcurrency = 1;
const commitDiscoveryConcurrency = 8;
const commentProcessingConcurrency = 4;
const millisecondsPerNanosecond = 1_000_000;
const percentageBasis = 100;

function readMonotonicTimestamp(): bigint {
  return process.hrtime.bigint();
}

function durationMilliseconds(startedAtNanoseconds: bigint, finishedAtNanoseconds: bigint): number {
  return Number(finishedAtNanoseconds - startedAtNanoseconds) / millisecondsPerNanosecond;
}

function createCommitLookupOperations(): readonly number[] {
  return Array.from({length: commitLookupCount}, (unusedArrayElement, operationIndex) => {
    return operationIndex;
  });
}

function createCommentOperations(): readonly number[] {
  return Array.from({length: pullRequestCommentOperationCount}, (unusedArrayElement, operationIndex) => {
    return operationIndex + 1;
  });
}

function createActiveOperationState(): ActiveOperationState {
  return {activeOperations: 0, maximumActiveOperations: 0};
}

async function simulateLatency(simulatedLatencyMilliseconds: number): Promise<void> {
  const {promise, resolve} = Promise.withResolvers<void>();
  setTimeout(resolve, simulatedLatencyMilliseconds);
  await promise;
}

async function measureBenchmarkOperations(
  measureBenchmarkOperationsOptions: MeasureBenchmarkOperationsOptions,
): Promise<BenchmarkMeasurement> {
  const {concurrency, createResult, operationNumbers, simulatedLatencyMilliseconds} = measureBenchmarkOperationsOptions;
  const activeOperationState = createActiveOperationState();
  const startedAtNanoseconds = readMonotonicTimestamp();
  const results = await pMap(
    operationNumbers,
    async (operationNumber): Promise<BenchmarkOperation> => {
      activeOperationState.activeOperations += 1;
      activeOperationState.maximumActiveOperations = Math.max(
        activeOperationState.maximumActiveOperations,
        activeOperationState.activeOperations,
      );
      try {
        await simulateLatency(simulatedLatencyMilliseconds);
        return {operationNumber, result: createResult(operationNumber)};
      } finally {
        activeOperationState.activeOperations -= 1;
      }
    },
    {concurrency, stopOnError: false},
  );
  return {
    durationMilliseconds: durationMilliseconds(startedAtNanoseconds, readMonotonicTimestamp()),
    maximumActiveOperations: activeOperationState.maximumActiveOperations,
    results,
  };
}

function createCommitDiscoveryResult(operationNumber: number): string {
  return `pull-request-${(operationNumber % pullRequestCommentOperationCount) + 1}`;
}

function createCommentProcessingResult(operationNumber: number): string {
  const operationKind = operationNumber % commentOperationKindCount;
  if (operationKind === 0) {
    return 'created';
  }
  if (operationKind === 1) {
    return 'updated';
  }
  return 'unchanged';
}

async function runBenchmark(simulatedLatencyMilliseconds: number): Promise<BenchmarkResults> {
  const commitLookupOperations = createCommitLookupOperations();
  const commentOperations = createCommentOperations();
  const commitDiscoverySerial = await measureBenchmarkOperations({
    operationNumbers: commitLookupOperations,
    concurrency: serialConcurrency,
    simulatedLatencyMilliseconds,
    createResult: createCommitDiscoveryResult,
  });
  const commitDiscoveryConcurrent = await measureBenchmarkOperations({
    operationNumbers: commitLookupOperations,
    concurrency: commitDiscoveryConcurrency,
    simulatedLatencyMilliseconds,
    createResult: createCommitDiscoveryResult,
  });
  const commentProcessingSerial = await measureBenchmarkOperations({
    operationNumbers: commentOperations,
    concurrency: serialConcurrency,
    simulatedLatencyMilliseconds,
    createResult: createCommentProcessingResult,
  });
  const commentProcessingConcurrent = await measureBenchmarkOperations({
    operationNumbers: commentOperations,
    concurrency: commentProcessingConcurrency,
    simulatedLatencyMilliseconds,
    createResult: createCommentProcessingResult,
  });
  return {
    simulatedLatencyMilliseconds,
    commitDiscoverySerial,
    commitDiscoveryConcurrent,
    commentProcessingSerial,
    commentProcessingConcurrent,
  };
}

function formatImprovement(serialDurationMilliseconds: number, concurrentDurationMilliseconds: number): string {
  const improvementPercentage = (1 - concurrentDurationMilliseconds / serialDurationMilliseconds) * percentageBasis;
  return `${improvementPercentage.toFixed(1)}%`;
}

function formatMeasurement(
  measurement: BenchmarkMeasurement,
  serialMeasurement: BenchmarkMeasurement,
): readonly string[] {
  return [
    `  serial duration: ${serialMeasurement.durationMilliseconds.toFixed(1)} ms`,
    `  concurrent duration: ${measurement.durationMilliseconds.toFixed(1)} ms`,
    `  relative improvement: ${formatImprovement(
      serialMeasurement.durationMilliseconds,
      measurement.durationMilliseconds,
    )}`,
    `  maximum observed active operations: ${measurement.maximumActiveOperations}`,
    `  semantic output identical: ${JSON.stringify(measurement.results) === JSON.stringify(serialMeasurement.results) ? 'yes' : 'no'}`,
  ];
}

function createBenchmarkOutput(benchmarkResults: BenchmarkResults): string {
  return [
    'Release appearance benchmark',
    `Simulated latency: ${benchmarkResults.simulatedLatencyMilliseconds} ms per operation`,
    '',
    'Commit discovery: 253 lookups',
    ...formatMeasurement(benchmarkResults.commitDiscoveryConcurrent, benchmarkResults.commitDiscoverySerial),
    '',
    'Comment processing: 80 operations',
    ...formatMeasurement(benchmarkResults.commentProcessingConcurrent, benchmarkResults.commentProcessingSerial),
  ].join('\n');
}

function readSimulatedLatencyMilliseconds(): number {
  const configuredLatency = Maybe.of(process.argv[2]).unwrapOr(defaultSimulatedLatencyMilliseconds.toString());
  const simulatedLatencyMilliseconds = Number(configuredLatency);
  if (!Number.isFinite(simulatedLatencyMilliseconds) || simulatedLatencyMilliseconds < 0) {
    throw new Error('Simulated latency must be a finite non-negative number of milliseconds');
  }
  return simulatedLatencyMilliseconds;
}

async function main(): Promise<void> {
  const benchmarkResults = await runBenchmark(readSimulatedLatencyMilliseconds());
  process.stdout.write(`${createBenchmarkOutput(benchmarkResults)}\n`);
}

function writeBenchmarkFailure(message: string, error?: unknown): void {
  const errorMessage = error instanceof Error ? `: ${error.message}` : '';
  process.stderr.write(`${message}${errorMessage}\n`);
}

if (Maybe.of(process.argv[1]).isJust && /releaseAppearanceBenchmark\.ts$/u.test(process.argv[1])) {
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    logger: {
      error: writeBenchmarkFailure,
    },
  });
  fireAndForgetInvoker.fireAndForget(main);
}
