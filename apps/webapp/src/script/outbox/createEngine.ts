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

import {match, P} from 'ts-pattern';

import {createAttempts, type Attempt, type AttemptEnding} from './createAttempts';
import {createBackoff} from './createBackoff';
import {createScheduler} from './createScheduler';
import {createExclusive} from './exclusive';
import {getErrorName, guardStore} from './guardStore';
import {laneQueuesOf, operationsFollowing, toLane} from './lanes';
import {guardContextOf, newOperationData, toView, versionData, type OperationData} from './operationData';
import {FINAL_STATES, resolveTarget} from './operationStateMachine';
import {isDueToExpire, planScheduler} from './planScheduler';
import type {
  DropOutcome,
  EnqueueOutcome,
  EnqueueRequest,
  FindOutcome,
  HoldOutcome,
  Kind,
  LaneOutcome,
  LanesOutcome,
  OperationDropped,
  OperationSnapshot,
  OperationSucceeded,
  OutboxDependencies,
  OutboxNotStarted,
  ReleaseOutcome,
  StartOutcome,
  StorageFailed,
  StorageFull,
  Trigger,
} from './types';

export const SCHEMA_VERSION = 1;
export const DEFAULT_MAX_OPERATIONS = 1_000;

type TransitionOutcome =
  | {type: 'operation-transitioned'; operation: OperationSnapshot}
  | {type: 'trigger-refused'}
  | StorageFull
  | StorageFailed;

const NOT_STARTED: OutboxNotStarted = {type: 'outbox-not-started'};

export type Engine = {
  /** Loads the stored operations; the engine is not usable before it answers `outbox-started` */
  load: () => Promise<StartOutcome>;
  enqueue: (kind: Kind<unknown>, request: EnqueueRequest<unknown>) => Promise<EnqueueOutcome<unknown>>;
  hold: (correlationKey: string) => Promise<HoldOutcome>;
  release: (correlationKey: string) => Promise<ReleaseOutcome>;
  drop: (correlationKey: string) => Promise<DropOutcome>;
  findByCorrelationKey: (correlationKey: string) => FindOutcome<unknown>;
  lane: (orderingKey: string) => LaneOutcome;
  lanes: () => LanesOutcome;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
};

const storageProblem = {type: P.union('storage-full', 'storage-failed')};

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export function createEngine(kinds: ReadonlyMap<string, Kind<unknown>>, dependencies: OutboxDependencies): Engine {
  const {getServerTime, logger, configuration} = dependencies;
  const store = guardStore(dependencies.store);
  const maxOperations = configuration?.maxOperations ?? DEFAULT_MAX_OPERATIONS;
  const backoff = createBackoff(
    configuration?.backoff?.minimumMilliseconds,
    configuration?.backoff?.maximumMilliseconds,
    dependencies.random,
  );
  const exclusive = createExclusive();
  const attempts = createAttempts(kinds, logger);

  const operations = new Map<string, OperationSnapshot>();
  const waitingCommands = new Map<string, number>();
  let nextQueuedSeq = 1;
  let isStopped = false;
  let isRunning = false;

  const scheduler = createScheduler({
    plan: afterStoreFailure => {
      return planScheduler({
        operations: [...operations.values()],
        serverNow: getServerTime(),
        isRunning,
        backoffRemainingMilliseconds: backoff.remainingMilliseconds(),
        operationIdsWithWaitingCommands: new Set(waitingCommands.keys()),
        afterStoreFailure,
      });
    },
    expire: async operationId => {
      return expire(operationId);
    },
    start: async operationId => {
      return startAttempt(operationId);
    },
    onStoreFailure: () => {
      backoff.grow();
    },
  });

  function findByKey(correlationKey: string): OperationSnapshot | undefined {
    return [...operations.values()].find(operation => {
      return operation.correlationKey === correlationKey;
    });
  }

  function notifyChanged(operation: OperationSnapshot): void {
    try {
      kinds.get(operation.kind)?.onChanged?.(toView(operation));
    } catch (error) {
      logger.warn('onChanged threw', {kind: operation.kind, errorName: getErrorName(error)});
    }
  }

  // Transitions

  function endingOf(operation: OperationSnapshot): AttemptEnding {
    return match(operation.state)
      .with('succeeded', () => {
        return {type: 'operation-succeeded' as const, operation: toView(operation)};
      })
      .with('dropped', () => {
        return {type: 'operation-dropped' as const, operation: toView(operation)};
      })
      .otherwise(() => {
        return {type: 'operation-continues' as const};
      });
  }

  /** The attempt of the operation is over: the backoff follows how it went, and the commands waiting for it go on */
  function concludeAttempt(operation: OperationSnapshot, trigger: Trigger): void {
    const attempt = attempts.take(operation.id);
    if (attempt === undefined) {
      return;
    }
    if (trigger === 'attempt-succeeded') {
      backoff.reset();
    } else if (operation.state === 'queued') {
      backoff.grow();
    }
    attempt.end(endingOf(operation));
  }

  /**
   * Stores the snapshot first, and changes nothing if that fails. A final snapshot is followed by deleting the
   * operation's snapshots; once the final one is stored the operation has ended, whether or not the delete worked.
   */
  async function commit(
    previous: OperationSnapshot | undefined,
    data: OperationData,
    trigger: Trigger,
    {cascades}: {cascades: boolean} = {cascades: true},
  ): Promise<TransitionOutcome> {
    const target = resolveTarget(previous?.state ?? 'initial', trigger, guardContextOf(data, kinds.get(data.kind)));
    if (target === undefined) {
      return {type: 'trigger-refused'};
    }
    const isGivenUp = target === 'dead-lettered' || target === 'dropped';
    if (previous !== undefined && cascades && isGivenUp && kinds.get(data.kind)?.laneWhenGivenUp === 'follows') {
      const failure = await endFollowing(previous, target);
      if (failure !== undefined) {
        return failure;
      }
    }
    const next: OperationSnapshot = {
      ...data,
      schemaVersion: SCHEMA_VERSION,
      seq: (previous?.seq ?? 0) + 1,
      trigger,
      at: getServerTime(),
      state: target,
    };
    const appended = await store.append(next);
    if (appended.type === 'storage-full' || appended.type === 'storage-failed') {
      return appended;
    }
    if (FINAL_STATES.includes(target)) {
      const removed = await store.remove([next.id]);
      if (removed.type === 'storage-failed') {
        // Load deletes what the failed delete left behind
        logger.warn('Operation not deleted', {errorName: removed.errorName});
      }
      operations.delete(next.id);
    } else {
      operations.set(next.id, next);
    }
    if (previous?.state === 'in-progress') {
      concludeAttempt(next, trigger);
    }
    notifyChanged(next);
    scheduler.pump();
    return {type: 'operation-transitioned', operation: next};
  }

  /** Moves an operation on by the trigger, changing what `changes` says */
  async function transition(
    previous: OperationSnapshot,
    trigger: Trigger,
    changes: Partial<OperationData> = {},
    options?: {cascades: boolean},
  ): Promise<TransitionOutcome> {
    return commit(previous, {...previous, ...changes}, trigger, options);
  }

  /**
   * Ends the operations that follow an operation which is about to be given up, the way it will end, in lane order.
   * They end before it does: its own transition is what commits the whole giving up, so a store failure or a reload
   * partway leaves it unfinished, and the next try repeats it for whatever is still waiting. Nothing behind it can go
   * out meanwhile, because it still blocks its lane. Answers the failure of the store, if any.
   */
  async function endFollowing(
    givenUp: OperationSnapshot,
    endsAs: 'dead-lettered' | 'dropped',
  ): Promise<StorageFull | StorageFailed | undefined> {
    const laneTrigger = endsAs === 'dead-lettered' ? 'lane-dead-lettered' : 'lane-dropped';
    for (const following of operationsFollowing(operations.values(), givenUp)) {
      const outcome = await transition(following, laneTrigger, {}, {cascades: false});
      const failure = answerTransition(outcome, () => {
        return undefined;
      });
      if (failure !== undefined) {
        return failure;
      }
    }
    return undefined;
  }

  /**
   * The answer of a command to how its transition went. A trigger the table lists in every state the command can
   * find the operation in is never refused; the table is the source of truth, so a refusal there is a defect, and
   * is answered as a failure of the store, with its name.
   */
  function answerTransition<Answer>(
    outcome: TransitionOutcome,
    onTransitioned: (operation: OperationSnapshot) => Answer,
    onRefused: () => Answer | StorageFailed = () => {
      logger.error('Transition refused where the table lists it', {});
      return {type: 'storage-failed', errorName: 'TransitionRefused'};
    },
  ): Answer | StorageFull | StorageFailed {
    return match(outcome)
      .with({type: 'operation-transitioned'}, ({operation}) => {
        return onTransitioned(operation);
      })
      .with({type: 'trigger-refused'}, onRefused)
      .with(storageProblem, failure => {
        return failure;
      })
      .exhaustive();
  }

  // Commands

  function addWaitingCommand(operationId: string): void {
    waitingCommands.set(operationId, (waitingCommands.get(operationId) ?? 0) + 1);
  }

  function removeWaitingCommand(operationId: string): void {
    const remaining = (waitingCommands.get(operationId) ?? 1) - 1;
    if (remaining > 0) {
      waitingCommands.set(operationId, remaining);
    } else {
      waitingCommands.delete(operationId);
    }
    scheduler.pump();
  }

  /**
   * Applies the command to the operation with the key, once no attempt is running on it.
   * Commands waiting for the same attempt are applied in the order they were called.
   */
  async function afterAttempt<Outcome extends {type: string}>(
    correlationKey: string,
    apply: (found: OperationSnapshot | undefined) => Promise<Outcome>,
  ): Promise<Outcome | OperationSucceeded | OperationDropped | OutboxNotStarted> {
    let waitingOn: string | undefined;
    try {
      for (;;) {
        const found = findByKey(correlationKey);
        const attempt = found?.state === 'in-progress' ? attempts.get(found.id) : undefined;
        if (found !== undefined && attempt !== undefined) {
          if (waitingOn === undefined) {
            waitingOn = found.id;
            addWaitingCommand(found.id);
          }
          const ending = await attempt.ended;
          if (ending.type !== 'operation-continues') {
            return ending;
          }
          continue;
        }
        // `undefined`: an attempt started while the command waited for its turn, so it has to wait for that
        const outcome = await exclusive.run(async () => {
          if (isStopped) {
            return NOT_STARTED;
          }
          const current = findByKey(correlationKey);
          return current?.state === 'in-progress' ? undefined : apply(current);
        });
        if (outcome !== undefined) {
          return outcome;
        }
      }
    } finally {
      if (waitingOn !== undefined) {
        removeWaitingCommand(waitingOn);
      }
    }
  }

  async function createOperation(
    kind: Kind<unknown>,
    request: EnqueueRequest<unknown>,
    payload: unknown,
  ): Promise<EnqueueOutcome<unknown>> {
    if (operations.size >= maxOperations) {
      return {type: 'outbox-full'};
    }
    const data = newOperationData(kind, request, payload, {
      id: crypto.randomUUID(),
      queuedSeq: nextQueuedSeq++,
      now: getServerTime(),
    });
    const outcome = await commit(undefined, data, 'operation-queued');
    return answerTransition(outcome, operation => {
      return {type: 'operation-queued' as const, operation: toView(operation)};
    });
  }

  async function versionOperation(
    found: OperationSnapshot,
    kind: Kind<unknown>,
    request: EnqueueRequest<unknown>,
    payload: unknown,
  ): Promise<EnqueueOutcome<unknown>> {
    const data = versionData(found, kind, request, payload, {queuedSeq: nextQueuedSeq++, now: getServerTime()});
    const outcome = await transition(found, 'operation-versioned', data);
    return answerTransition(outcome, operation => {
      return {type: 'operation-versioned' as const, operation: toView(operation)};
    });
  }

  async function enqueue(kind: Kind<unknown>, request: EnqueueRequest<unknown>): Promise<EnqueueOutcome<unknown>> {
    if (isStopped) {
      return NOT_STARTED;
    }
    const {correlationKey, orderingKey} = request;
    if (correlationKey === '') {
      return {type: 'correlation-key-empty'};
    }
    if (orderingKey === '') {
      return {type: 'ordering-key-empty'};
    }
    let payload: unknown;
    try {
      payload = kind.parsePayload(request.payload);
    } catch (error) {
      return {type: 'payload-invalid', errorName: getErrorName(error)};
    }
    if (correlationKey === undefined) {
      return exclusive.run(async () => {
        return isStopped ? NOT_STARTED : createOperation(kind, request, payload);
      });
    }
    const existing = findByKey(correlationKey);
    if (existing !== undefined && existing.kind !== kind.name) {
      return {type: 'key-taken-by-other-kind', kind: existing.kind};
    }
    return afterAttempt(correlationKey, async found => {
      return found === undefined
        ? createOperation(kind, request, payload)
        : versionOperation(found, kind, request, payload);
    });
  }

  async function hold(correlationKey: string): Promise<HoldOutcome> {
    return afterAttempt(correlationKey, async (found): Promise<HoldOutcome> => {
      if (found === undefined) {
        return {type: 'operation-not-found'};
      }
      const outcome = await transition(found, 'operation-held');
      return answerTransition<HoldOutcome>(
        outcome,
        operation => {
          return {type: 'operation-held' as const, operation: toView(operation)};
        },
        () => {
          return {type: 'operation-not-queued' as const, operation: toView(found)};
        },
      );
    });
  }

  async function release(correlationKey: string): Promise<ReleaseOutcome> {
    return afterAttempt(correlationKey, async (found): Promise<ReleaseOutcome> => {
      if (found === undefined) {
        return {type: 'operation-not-found'};
      }
      const outcome = await transition(found, 'operation-released');
      return answerTransition<ReleaseOutcome>(
        outcome,
        operation => {
          return {type: 'operation-released' as const, operation: toView(operation)};
        },
        () => {
          return {type: 'operation-not-on-hold' as const, operation: toView(found)};
        },
      );
    });
  }

  async function drop(correlationKey: string): Promise<DropOutcome> {
    return exclusive.run(async (): Promise<DropOutcome> => {
      if (isStopped) {
        return NOT_STARTED;
      }
      const found = findByKey(correlationKey);
      if (found === undefined) {
        return {type: 'operation-not-found'};
      }
      const attempt = attempts.get(found.id);
      const outcome = await transition(found, 'operation-dropped', {}, {cascades: false});
      return answerTransition(outcome, operation => {
        attempt?.controller.abort();
        return {type: 'operation-dropped' as const, operation: toView(operation)};
      });
    });
  }

  // Attempts

  /** Stores how the attempt ended; a store that fails is tried again after the backoff */
  async function settleAttempt(operationId: string, attempt: Attempt, trigger: Trigger): Promise<void> {
    for (;;) {
      const settled = await exclusive.run(async () => {
        const current = operations.get(operationId);
        if (isStopped || current === undefined || attempts.get(operationId) !== attempt) {
          return {type: 'attempt-superseded'} as const;
        }
        return transition(current, trigger);
      });
      if (settled.type !== 'storage-full' && settled.type !== 'storage-failed') {
        return;
      }
      logger.warn('Attempt result not stored', {outcome: settled.type});
      await sleep(backoff.grow());
    }
  }

  async function startAttempt(operationId: string): Promise<boolean> {
    return exclusive.run(async () => {
      const current = operations.get(operationId);
      const mayStart =
        !isStopped &&
        isRunning &&
        current?.state === 'queued' &&
        !waitingCommands.has(operationId) &&
        backoff.remainingMilliseconds() === 0;
      if (!mayStart) {
        return true;
      }
      const outcome = await transition(current, 'attempt-started', {attempts: current.attempts + 1});
      if (outcome.type !== 'operation-transitioned') {
        logger.warn('Attempt not started', {outcome: outcome.type});
        return false;
      }
      attempts.begin(outcome.operation, async (attempt, trigger) => {
        await settleAttempt(operationId, attempt, trigger);
      });
      return true;
    });
  }

  async function expire(operationId: string): Promise<boolean> {
    return exclusive.run(async () => {
      const current = operations.get(operationId);
      if (isStopped || current === undefined || !isDueToExpire(current, getServerTime())) {
        return true;
      }
      const outcome = await transition(current, 'operation-expired');
      if (outcome.type !== 'operation-transitioned') {
        logger.warn('Operation not expired', {outcome: outcome.type});
      }
      return outcome.type === 'operation-transitioned';
    });
  }

  // Loading

  /** The snapshot with its payload parsed, or `undefined` when it can't be used any more */
  function parseStored(snapshot: OperationSnapshot): OperationSnapshot | undefined {
    const kind = kinds.get(snapshot.kind);
    const isUnfinished = !FINAL_STATES.includes(snapshot.state);
    if (snapshot.schemaVersion !== SCHEMA_VERSION || kind === undefined || !isUnfinished) {
      return undefined;
    }
    try {
      return {...snapshot, payload: kind.parsePayload(snapshot.payload)};
    } catch {
      return undefined;
    }
  }

  async function load(): Promise<StartOutcome> {
    const loaded = await store.loadLatest();
    if (loaded.type === 'storage-failed') {
      return loaded;
    }
    const usable: OperationSnapshot[] = [];
    const unusableIds: string[] = [];
    for (const snapshot of loaded.operations) {
      const parsed = parseStored(snapshot);
      if (parsed === undefined) {
        unusableIds.push(snapshot.id);
      } else {
        usable.push(parsed);
      }
    }
    if (unusableIds.length > 0) {
      const removed = await store.remove(unusableIds);
      if (removed.type === 'storage-failed') {
        return removed;
      }
    }
    for (const snapshot of usable) {
      operations.set(snapshot.id, snapshot);
      nextQueuedSeq = Math.max(nextQueuedSeq, snapshot.queuedSeq + 1);
    }
    for (const snapshot of usable) {
      if (snapshot.state !== 'in-progress') {
        notifyChanged(snapshot);
        continue;
      }
      const outcome = await transition(snapshot, 'attempt-interrupted');
      const failure = answerTransition(outcome, () => {
        return undefined;
      });
      if (failure !== undefined) {
        return failure;
      }
    }
    logger.info('Operations loaded', {
      count: operations.size,
      quarantinedCount: loaded.quarantinedCount + unusableIds.length,
    });
    scheduler.activate();
    return {type: 'outbox-started'};
  }

  // Lifecycle

  async function stop(): Promise<void> {
    isStopped = true;
    scheduler.stop();
    attempts.abortAll(NOT_STARTED);
    await exclusive.whenIdle();
  }

  async function logged<Outcome extends {type: string}>(
    call: string,
    outcome: Promise<Outcome>,
    attributes: Readonly<Record<string, unknown>> = {},
  ): Promise<Outcome> {
    const answered = await outcome;
    const errorName = 'errorName' in answered ? {errorName: answered.errorName} : {};
    logger.info(call, {...attributes, ...errorName, outcome: answered.type});
    return answered;
  }

  return {
    load: async () => {
      return logged('start', load());
    },
    enqueue: async (kind, request) => {
      return logged('enqueue', enqueue(kind, request), {kind: kind.name});
    },
    hold: async correlationKey => {
      return logged('hold', hold(correlationKey));
    },
    release: async correlationKey => {
      return logged('release', release(correlationKey));
    },
    drop: async correlationKey => {
      return logged('drop', drop(correlationKey));
    },
    findByCorrelationKey(correlationKey) {
      if (isStopped) {
        return NOT_STARTED;
      }
      const found = findByKey(correlationKey);
      return found === undefined ? {type: 'operation-not-found'} : {type: 'operation-found', operation: toView(found)};
    },
    lane(orderingKey) {
      if (isStopped) {
        return NOT_STARTED;
      }
      const queue = laneQueuesOf(operations.values()).get(orderingKey);
      return queue === undefined ? {type: 'lane-empty'} : {type: 'lane-found', lane: toLane(queue)};
    },
    lanes() {
      if (isStopped) {
        return NOT_STARTED;
      }
      return {type: 'lanes-listed', lanes: [...laneQueuesOf(operations.values()).values()].map(toLane)};
    },
    pause() {
      isRunning = false;
      logger.info('pause', {outcome: 'outbox-paused'});
    },
    resume() {
      isRunning = true;
      backoff.reset();
      scheduler.pump();
      logger.info('resume', {outcome: 'outbox-resumed'});
    },
    stop: async () => {
      await stop();
      logger.info('stop', {outcome: 'outbox-stopped'});
    },
  };
}
