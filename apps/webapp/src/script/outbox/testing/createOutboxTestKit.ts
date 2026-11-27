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

import {createFakeClock, type FakeClock} from './createFakeClock';
import {createInMemoryOutboxStore, type InMemoryOutboxStore} from './createInMemoryOutboxStore';

import {createOutbox} from '../createOutbox';
import {SCHEMA_VERSION} from '../operationRules';
import {isOutcome} from '../tagged';
import type {
  AttemptOutcome,
  EnqueueOutcome,
  EnqueueRequest,
  Kind,
  KindHandle,
  Lane,
  OperationSnapshot,
  OperationView,
  Outbox,
  OutboxConfiguration,
  OutboxDependencies,
  OutboxLogger,
} from '../types';

// Dependencies

export type FakeRandom = {
  /** Answers the queued values in order, then the constant */
  next: () => number;
  /** Sets the constant answered when nothing is queued */
  set: (value: number) => void;
  /** Queues values to answer first */
  queue: (...values: number[]) => void;
};

export type LogEntry = {
  level: 'info' | 'warn' | 'error';
  message: string;
  attributes?: Readonly<Record<string, unknown>>;
};

export type RecordingLogger = OutboxLogger & {
  entries: LogEntry[];
  /** The entries of a message, e.g. a call's name */
  entriesOf: (message: string) => LogEntry[];
};

export type TestDependencies = {
  /** What `createOutbox` takes, built from the fakes below; ids are `operation-1`, `operation-2`, … */
  dependencies: OutboxDependencies;
  store: InMemoryOutboxStore;
  clock: FakeClock;
  random: FakeRandom;
  logger: RecordingLogger;
};

/** By default 1, so that a backoff wait is its full cap */
function createFakeRandom(initialValue = 1): FakeRandom {
  let constant = initialValue;
  const queued: number[] = [];
  return {
    next: () => {
      return queued.shift() ?? constant;
    },
    set: value => {
      constant = value;
    },
    queue: (...values) => {
      queued.push(...values);
    },
  };
}

function createRecordingLogger(): RecordingLogger {
  const entries: LogEntry[] = [];
  const record = (level: LogEntry['level']) => {
    return (message: string, attributes?: Readonly<Record<string, unknown>>) => {
      entries.push({level, message, attributes});
    };
  };
  return {
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    entries,
    entriesOf: message => {
      return entries.filter(entry => {
        return entry.message === message;
      });
    },
  };
}

export function createTestDependencies(configuration: OutboxConfiguration = {}): TestDependencies {
  const store = createInMemoryOutboxStore();
  const clock = createFakeClock();
  const random = createFakeRandom();
  const logger = createRecordingLogger();
  let idCount = 0;
  return {
    dependencies: {
      store,
      clock,
      random: random.next,
      createId: () => {
        idCount += 1;
        return `operation-${idCount}`;
      },
      logger,
      configuration,
    },
    store,
    clock,
    random,
    logger,
  };
}

// Kit

export type TestPayload = {text: string};

/** One call of `attempt`, which stays unanswered until the test answers it */
export type AttemptCall = {
  operation: OperationView<TestPayload>;
  signal: AbortSignal;
  /** Answers the attempt, then lets everything that follows settle */
  answer: (outcome: AttemptOutcome) => Promise<void>;
  /** Rejects the attempt, then lets everything that follows settle */
  reject: (error: Error) => Promise<void>;
};

export type TestKind = {
  kind: Kind<TestPayload>;
  handle: KindHandle<TestPayload>;
  attempts: AttemptCall[];
  /** The views `onChanged` was called with */
  changes: OperationView<TestPayload>[];
  /** The newest call of `attempt`; throws when there was none */
  lastAttempt: () => AttemptCall;
  /** The operation of this kind with the key, as the handle finds it; throws when it doesn't */
  operation: (correlationKey: string) => OperationView<TestPayload>;
};

export type OutboxTestKit = TestDependencies & {
  outbox: Outbox;
  /** Registers a kind named `test-kind-<n>` whose attempts wait for the test to answer them */
  registerKind: (overrides?: Partial<Kind<TestPayload>>) => TestKind;
  /** Starts the outbox and, unless told otherwise, resumes it; throws when it doesn't start */
  start: (options?: {run?: boolean}) => Promise<void>;
  /** Enqueues `{text: 'hello'}` unless the request says otherwise, and lets everything that follows settle */
  enqueue: (testKind: TestKind, request?: Partial<EnqueueRequest<TestPayload>>) => Promise<EnqueueOutcome<TestPayload>>;
  /** The operation with the key, as the outbox finds it; throws when it doesn't */
  operation: (correlationKey: string) => OperationView;
  /** The lane of the key; throws when it is empty */
  lane: (laneKey: string) => Lane;
};

export function parseTestPayload(value: unknown): TestPayload {
  if (typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string') {
    return {text: value.text};
  }
  throw new TypeError('Not a test payload');
}

export function createOutboxTestKit(configuration: OutboxConfiguration = {}): OutboxTestKit {
  const testDependencies = createTestDependencies(configuration);
  const {clock} = testDependencies;
  const outbox = createOutbox(testDependencies.dependencies);
  let kindCount = 0;

  function registerKind(overrides: Partial<Kind<TestPayload>> = {}): TestKind {
    const attempts: AttemptCall[] = [];
    const changes: OperationView<TestPayload>[] = [];
    const kind: Kind<TestPayload> = {
      name: `test-kind-${kindCount++}`,
      parsePayload: parseTestPayload,
      attempt: async (operation, signal) => {
        return new Promise<AttemptOutcome>((resolve, reject) => {
          attempts.push({
            operation,
            signal,
            answer: async outcome => {
              resolve(outcome);
              await clock.settle();
            },
            reject: async error => {
              reject(error);
              await clock.settle();
            },
          });
        });
      },
      onChanged: operation => {
        changes.push(operation);
      },
      ...overrides,
    };
    const registerResult = outbox.register(kind);
    if (!isOutcome('kind-registered')(registerResult)) {
      throw new Error(`Can't register the test kind: ${registerResult.outcome}`);
    }
    const {handle} = registerResult;
    return {
      kind,
      handle,
      attempts,
      changes,
      lastAttempt: () => {
        const last = attempts.at(-1);
        if (last === undefined) {
          throw new Error('attempt was not called');
        }
        return last;
      },
      operation: correlationKey => {
        const findResult = handle.find(correlationKey);
        if (!isOutcome('operation-found')(findResult)) {
          throw new Error(`No operation found: ${findResult.outcome}`);
        }
        return findResult.operation;
      },
    };
  }

  return {
    ...testDependencies,
    outbox,
    registerKind,
    async start({run = true} = {}) {
      const startResult = await outbox.start();
      if (!isOutcome('outbox-started')(startResult)) {
        throw new Error(`Can't start the outbox: ${startResult.outcome}`);
      }
      if (run) {
        outbox.resume();
      }
      await clock.settle();
    },
    async enqueue(testKind, request = {}) {
      const enqueueResult = await testKind.handle.enqueue({payload: {text: 'hello'}, ...request});
      await clock.settle();
      return enqueueResult;
    },
    operation: correlationKey => {
      const findResult = outbox.findByCorrelationKey(correlationKey);
      if (!isOutcome('operation-found')(findResult)) {
        throw new Error(`No operation found: ${findResult.outcome}`);
      }
      return findResult.operation;
    },
    lane: laneKey => {
      const laneResult = outbox.lane(laneKey);
      if (!isOutcome('lane-found')(laneResult)) {
        throw new Error(`No lane found: ${laneResult.outcome}`);
      }
      return laneResult.lane;
    },
  };
}

/** A snapshot as an earlier session would have left it */
export function createStoredSnapshot(
  overrides: Partial<OperationSnapshot> & Pick<OperationSnapshot, 'kind'>,
): OperationSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'stored-operation',
    seq: 1,
    trigger: 'operation-queued',
    at: 1_000_000,
    payload: {text: 'stored'},
    correlation: {state: 'uncorrelated'},
    lane: {state: 'no-lane'},
    queuedSeq: 1,
    queuedAt: 1_000_000,
    state: 'queued',
    attempts: 0,
    expiry: {state: 'never-expires'},
    limits: {attemptTimeout: {state: 'never-times-out'}},
    ...overrides,
  };
}
