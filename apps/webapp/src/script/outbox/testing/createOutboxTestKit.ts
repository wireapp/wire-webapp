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
import {createFakeRandom, type FakeRandom} from './createFakeRandom';
import {createInMemoryOutboxStore, type InMemoryOutboxStore} from './createInMemoryOutboxStore';
import {createRecordingLogger, type RecordingLogger} from './createRecordingLogger';

import {createOutbox} from '../createOutbox';
import type {
  EnqueueRequest,
  Kind,
  KindHandle,
  Lane,
  OperationSnapshot,
  OperationView,
  Outbox,
  OutboxDependencies,
  PerformOutcome,
} from '../types';

export type TestPayload = {text: string};

/** One call of `perform`, which stays unanswered until the test answers it */
export type PerformCall = {
  operation: OperationView<TestPayload>;
  signal: AbortSignal;
  answer: (outcome: PerformOutcome) => Promise<void>;
  reject: (error: Error) => Promise<void>;
};

export type TestKind = {
  kind: Kind<TestPayload>;
  handle: KindHandle<TestPayload>;
  performs: PerformCall[];
  /** The views `onChanged` was called with */
  changes: OperationView<TestPayload>[];
  /** The newest call of `perform` */
  lastPerform: () => PerformCall;
  /** The operation of this kind with the key, if the handle finds it */
  operation: (correlationKey: string) => OperationView<TestPayload> | undefined;
};

export type OutboxTestKit = {
  outbox: Outbox;
  store: InMemoryOutboxStore;
  clock: FakeClock;
  logger: RecordingLogger;
  random: FakeRandom;
  dependencies: OutboxDependencies;
  /** The operation with the key, as the outbox finds it */
  findOperation: (correlationKey: string) => OperationView<unknown> | undefined;
  /** The lane of the ordering key, when it has one */
  laneOf: (orderingKey: string) => Lane | undefined;
  /** Every lane */
  lanesOf: () => Lane[];
  registerKind: (overrides?: Partial<Kind<TestPayload>>) => TestKind;
  /** Starts the outbox and, unless told otherwise, lets it run */
  start: (options?: {run?: boolean}) => Promise<void>;
  /** Enqueues on the handle and lets everything that follows settle */
  enqueue: (
    testKind: TestKind,
    request?: Partial<EnqueueRequest<TestPayload>>,
  ) => ReturnType<KindHandle<TestPayload>['enqueue']>;
  dispose: () => void;
};

export function parseTestPayload(value: unknown): TestPayload {
  if (typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string') {
    return {text: value.text};
  }
  throw new TypeError('Not a test payload');
}

export function createOutboxTestKit(configuration: OutboxDependencies['configuration'] = {}): OutboxTestKit {
  const outbox = createOutbox();
  const store = createInMemoryOutboxStore();
  const clock = createFakeClock();
  const logger = createRecordingLogger();
  const random = createFakeRandom();
  const dependencies: OutboxDependencies = {
    store,
    getServerTime: clock.getServerTime,
    random: random.random,
    logger,
    configuration,
  };
  let kindCount = 0;

  function registerKind(overrides: Partial<Kind<TestPayload>> = {}): TestKind {
    const performs: PerformCall[] = [];
    const changes: OperationView<TestPayload>[] = [];
    const kind: Kind<TestPayload> = {
      name: `test-kind-${kindCount++}`,
      parsePayload: parseTestPayload,
      perform: async (operation, signal) => {
        return new Promise<PerformOutcome>((resolve, reject) => {
          performs.push({
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
    const registered = outbox.register(kind);
    if (registered.type !== 'kind-registered') {
      throw new Error(`Can't register the test kind: ${registered.type}`);
    }
    return {
      kind,
      handle: registered.handle,
      performs,
      changes,
      lastPerform: () => {
        const last = performs.at(-1);
        if (last === undefined) {
          throw new Error('perform was not called');
        }
        return last;
      },
      operation: correlationKey => {
        const outcome = registered.handle.find(correlationKey);
        return outcome.type === 'operation-found' ? outcome.operation : undefined;
      },
    };
  }

  return {
    outbox,
    store,
    clock,
    logger,
    random,
    dependencies,
    findOperation: correlationKey => {
      const outcome = outbox.findByCorrelationKey(correlationKey);
      return outcome.type === 'operation-found' ? outcome.operation : undefined;
    },
    laneOf: orderingKey => {
      const outcome = outbox.lane(orderingKey);
      return outcome.type === 'lane-found' ? outcome.lane : undefined;
    },
    lanesOf: () => {
      const outcome = outbox.lanes();
      return outcome.type === 'lanes-listed' ? outcome.lanes : [];
    },
    registerKind,
    async start({run = true} = {}) {
      const outcome = await outbox.start(dependencies);
      if (outcome.type !== 'outbox-started') {
        throw new Error(`Can't start the outbox: ${outcome.type}`);
      }
      if (run) {
        outbox.resume();
      }
      await clock.settle();
    },
    async enqueue(testKind, request = {}) {
      const outcome = await testKind.handle.enqueue({payload: {text: 'hello'}, ...request});
      await clock.settle();
      return outcome;
    },
    dispose: clock.dispose,
  };
}

/** A snapshot as an earlier session would have left it */
export function createStoredSnapshot(
  overrides: Partial<OperationSnapshot> & Pick<OperationSnapshot, 'kind'>,
): OperationSnapshot {
  return {
    schemaVersion: 1,
    id: 'stored-operation',
    seq: 1,
    trigger: 'operation-queued',
    at: 1_000_000,
    payload: {text: 'stored'},
    queuedSeq: 1,
    queuedAt: 1_000_000,
    state: 'queued',
    attempts: 0,
    ...overrides,
  };
}
