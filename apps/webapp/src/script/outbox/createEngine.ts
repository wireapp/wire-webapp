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

import {noop} from 'noop-esm';
import {isMatching, match, P} from 'ts-pattern';

import {
  backoffDelay,
  correlationOf,
  doesLaneFollow,
  findOperationFollowers,
  isDueToExpire,
  isFinal,
  lanesOf,
  laneTriggerFor,
  newOperationData,
  nextQueuedSeqOf,
  planPass,
  resolveConfiguration,
  resolveTarget,
  SCHEMA_VERSION,
  versionOperationData,
  type ResolvedKind,
  type Run,
  type TargetResolved,
  type Wake,
} from './operationRules';
import {eachUntilFailure, isInState, isOutcome, pipe} from './tagged';
import type {
  AttemptOutcome,
  CorrelationKeyEmpty,
  DropOutcome,
  EndedWhileWaiting,
  EnqueueOutcome,
  EnqueueRequest,
  HoldOutcome,
  KeyTakenByOtherKind,
  LaneEmpty,
  LaneFound,
  LaneKeyEmpty,
  LanesListed,
  OperationData,
  OperationDropped,
  OperationFound,
  OperationHeld,
  OperationNotFound,
  OperationQueued,
  OperationReleased,
  OperationSnapshot,
  OperationVersioned,
  OperationView,
  Outcome,
  OutboxDependencies,
  OutboxFull,
  OutboxNotStarted,
  OutboxStarted,
  PayloadInvalid,
  ReleaseOutcome,
  SnapshotsLoaded,
  SnapshotsRemoved,
  State,
  StorageFailed,
  StorageFull,
  TimerId,
  TransitionRefused,
  Trigger,
} from './types';

/** A longer delay makes a timer fire at once */
const MAXIMUM_TIMER_MILLISECONDS = 2_147_483_647;

type Timer = State<'armed', {timer: TimerId}> | State<'disarmed'>;
type Previous = State<'initial'> | OperationSnapshot;

type SnapshotFound = Outcome<'operation-found', {operation: OperationSnapshot}>;
type Lookup = SnapshotFound | OperationNotFound;
type OperationTransitioned = Outcome<'operation-transitioned', {operation: OperationSnapshot}>;
type CommitOutcome = OperationTransitioned | TransitionRefused | StorageFull | StorageFailed;
type StepSkipped = Outcome<'step-skipped'>;

type ParkedCommand = {
  applyTo: (lookup: Lookup) => Promise<void>;
  answer: (answer: EndedWhileWaiting | OutboxNotStarted) => void;
};
type Parked<Result> = Result | EndedWhileWaiting | OutboxNotStarted;
type CommandTaken<Result> = Outcome<'command-taken', {answer: Promise<Parked<Result>>}>;

type RunningAttempt = {
  operationId: string;
  controller: AbortController;
  timeout: Timer;
  /** The first result wins */
  result: State<'running'> | State<'finished', {trigger: Trigger}>;
  parked: ParkedCommand[];
};
type AttemptFound = Outcome<'attempt-found', {attempt: RunningAttempt}>;
type NoAttempt = Outcome<'no-attempt'>;
type AttemptFinished = Outcome<
  'attempt-finished',
  {attempt: RunningAttempt; operation: OperationSnapshot; trigger: Trigger}
>;
type AttemptErrored = Outcome<'attempt-errored'>;

type RequestValid = Outcome<'request-valid'>;
type PayloadParsed = Outcome<'payload-parsed', {payload: unknown}>;
type RoomLeft = Outcome<'room-left'>;
type SnapshotUsable = Outcome<'snapshot-usable', {snapshot: OperationSnapshot}>;
type SnapshotUnusable = Outcome<
  'snapshot-unusable',
  {operationId: string; reason: 'schema-unknown' | 'kind-not-registered' | 'operation-ended' | 'payload-invalid'}
>;
type OperationsLoaded = Outcome<'operations-loaded', {usable: OperationSnapshot[]; quarantinedCount: number}>;
type OperationAnnounced = Outcome<'operation-announced'>;
type PassRun = Outcome<'pass-run'>;

export type Engine = {
  /** Loads the stored operations; nothing else may be called before it answers `outbox-started` */
  load: () => Promise<OutboxStarted | StorageFull | StorageFailed | OutboxNotStarted>;
  enqueue: (kind: ResolvedKind, request: EnqueueRequest<unknown>) => Promise<EnqueueOutcome<unknown>>;
  hold: (correlationKey: string) => Promise<HoldOutcome>;
  release: (correlationKey: string) => Promise<ReleaseOutcome>;
  drop: (correlationKey: string) => Promise<DropOutcome>;
  findByCorrelationKey: (correlationKey: string) => OperationFound<unknown> | OperationNotFound;
  lane: (laneKey: string) => LaneFound | LaneEmpty;
  lanes: () => LanesListed;
  pause: () => void;
  /** Also resets the backoff */
  resume: () => void;
  /** Nothing may be called after it */
  stop: () => Promise<void>;
};

const isStorageProblem = isOutcome('storage-full', 'storage-failed');
const isCommitFailure = isOutcome('transition-refused', 'storage-full', 'storage-failed');
const isCommandFailure = isOutcome('operation-not-found', 'transition-refused', 'storage-full', 'storage-failed');
const isStepEnd = isOutcome('step-skipped', 'transition-refused', 'storage-full', 'storage-failed');

const isAttemptAnswer = isMatching({
  outcome: P.union('attempt-succeeded', 'attempt-failed', 'attempt-held', 'attempt-dead-lettered', 'attempt-dropped'),
});

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function runInOrder<Result>(tasks: readonly (() => Promise<Result>)[]): Promise<Result[]> {
  return tasks.reduce<Promise<Result[]>>(async (done, task) => {
    return [...(await done), await task()];
  }, Promise.resolve([]));
}

function checkKeys(request: EnqueueRequest<unknown>): RequestValid | CorrelationKeyEmpty | LaneKeyEmpty {
  return match(request)
    .with({correlationKey: ''}, (): CorrelationKeyEmpty => {
      return {outcome: 'correlation-key-empty'};
    })
    .with({laneKey: ''}, (): LaneKeyEmpty => {
      return {outcome: 'lane-key-empty'};
    })
    .otherwise((): RequestValid => {
      return {outcome: 'request-valid'};
    });
}

function parsePayload(kind: ResolvedKind, value: unknown): PayloadParsed | PayloadInvalid {
  try {
    return {outcome: 'payload-parsed', payload: kind.parsePayload(value)};
  } catch (error) {
    return {outcome: 'payload-invalid', errorName: errorNameOf(error)};
  }
}

function endedWhileWaiting(operation: OperationView): EndedWhileWaiting {
  return isInState('succeeded')(operation)
    ? {outcome: 'operation-succeeded', operation}
    : {outcome: 'operation-dropped', operation};
}

/**
 * Owns all runtime state of a started outbox. Commands, scheduler passes and load run one after another through
 * `serialized`; the timer and kind callbacks only record a result and request a pass.
 */
export function createEngine(kinds: ReadonlyMap<string, ResolvedKind>, dependencies: OutboxDependencies): Engine {
  const {store, clock, random, createId, logger} = dependencies;
  const configuration = resolveConfiguration(dependencies.configuration);

  const operations = new Map<string, OperationSnapshot>();
  const attempts = new Map<string, RunningAttempt>();
  let queue: State<'open' | 'closed', {tail: Promise<unknown>}> = {state: 'open', tail: Promise.resolve()};
  let run: Run = {state: 'paused'};
  let pass: State<'idle'> | State<'queued'> = {state: 'idle'};
  let wake: Timer = {state: 'disarmed'};
  /** In stopwatch time */
  let backoff = {failures: 0, waitsUntil: 0};

  /** An operation only exists while its kind is registered: load deletes the others, and kinds are fixed once started */
  function kindOf(operation: {kind: string}): ResolvedKind {
    return kinds.get(operation.kind) as ResolvedKind;
  }

  // Serialization and passes

  /** Runs the task after every earlier one; once the queue is closed, it answers `outbox-not-started` instead */
  function serialized<Result>(task: () => Promise<Result>): Promise<Result | OutboxNotStarted> {
    const result = queue.tail.then(async (): Promise<Result | OutboxNotStarted> => {
      return isInState('open')(queue) ? task() : {outcome: 'outbox-not-started'};
    });
    queue = {...queue, tail: result};
    return result;
  }

  function requestPass(): void {
    if (isInState('queued')(pass)) {
      return;
    }
    pass = {state: 'queued'};
    void serialized(runPass);
  }

  function armTimer(callback: () => void, milliseconds: number): Timer {
    return {state: 'armed', timer: clock.setTimer(callback, Math.min(milliseconds, MAXIMUM_TIMER_MILLISECONDS))};
  }

  function disarm(timer: Timer): Timer {
    if (isInState('armed')(timer)) {
      clock.clearTimer(timer.timer);
    }
    return {state: 'disarmed'};
  }

  function armWake(planned: Wake): Timer {
    disarm(wake);
    return match(planned)
      .with({state: 'wake-in'}, ({milliseconds}) => {
        return armTimer(requestPass, milliseconds);
      })
      .with({state: 'no-wake'}, (): Timer => {
        return {state: 'disarmed'};
      })
      .exhaustive();
  }

  function backoffRemaining(): number {
    return Math.max(0, backoff.waitsUntil - clock.getStopwatchTime());
  }

  function growBackoff(): void {
    const delay = backoffDelay(backoff.failures, configuration.backoff, random);
    backoff = {failures: backoff.failures + 1, waitsUntil: clock.getStopwatchTime() + delay};
  }

  function resetBackoff(): void {
    backoff = {failures: 0, waitsUntil: 0};
  }

  /**
   * Settles the finished attempts, expires what is due and starts what may start. Each step checks its own
   * precondition again, so a plan that went stale does no harm; every commit requests the next pass.
   */
  async function runPass(): Promise<PassRun> {
    pass = {state: 'idle'};
    const plan = planPass({
      operations: [...operations.values()],
      serverTime: clock.getServerTime(),
      run,
      backoffRemainingMilliseconds: backoffRemaining(),
    });
    const finished = [...attempts.values()].filter(attempt => {
      return isInState('finished')(attempt.result);
    });
    const results = await runInOrder([
      ...finished.map(({operationId}) => {
        return async () => {
          return settleAttempt(operationId);
        };
      }),
      ...plan.expire.map(operationId => {
        return async () => {
          return expireOperation(operationId);
        };
      }),
      ...plan.start.map(operationId => {
        return async () => {
          return startAttempt(operationId);
        };
      }),
    ]);
    const storageProblems = results.filter(isStorageProblem);
    if (storageProblems.length === 0) {
      wake = armWake(plan.wake);
      return {outcome: 'pass-run'};
    }
    logger.warn('Pass hit a store failure', {
      outcomes: storageProblems.map(({outcome}) => {
        return outcome;
      }),
    });
    growBackoff();
    wake = armWake({state: 'wake-in', milliseconds: backoffRemaining()});
    return {outcome: 'pass-run'};
  }

  // Store and lookups

  async function callStore<Result extends {outcome: string}>(
    call: () => Promise<Result>,
  ): Promise<Result | StorageFailed> {
    try {
      return await call();
    } catch (error) {
      return {outcome: 'storage-failed', errorName: errorNameOf(error)};
    }
  }

  function findByKey(correlationKey: string): Lookup {
    const found = [...operations.values()].find(({correlation}) => {
      return isInState('correlated')(correlation) && correlation.correlationKey === correlationKey;
    });
    return found === undefined ? {outcome: 'operation-not-found'} : {outcome: 'operation-found', operation: found};
  }

  function findById(operationId: string): Lookup {
    const found = operations.get(operationId);
    return found === undefined ? {outcome: 'operation-not-found'} : {outcome: 'operation-found', operation: found};
  }

  function findWhen(
    operationId: string,
    isReady: (operation: OperationSnapshot) => boolean,
  ): SnapshotFound | StepSkipped {
    const lookup = findById(operationId);
    return isOutcome('operation-found')(lookup) && isReady(lookup.operation) ? lookup : {outcome: 'step-skipped'};
  }

  function findAttempt(operationId: string): AttemptFound | NoAttempt {
    const attempt = attempts.get(operationId);
    return attempt === undefined ? {outcome: 'no-attempt'} : {outcome: 'attempt-found', attempt};
  }

  // commit

  function notifyChanged(operation: OperationSnapshot): void {
    try {
      kindOf(operation).onChanged(operation);
    } catch (error) {
      logger.warn('onChanged threw', {kind: operation.kind, errorName: errorNameOf(error)});
    }
  }

  /** Stores the snapshot first, and changes nothing if that fails. It knows nothing about attempts or callers */
  async function commit(previous: Previous, data: OperationData, trigger: Trigger): Promise<CommitOutcome> {
    const kind = kindOf(data);
    return pipe(isCommitFailure)(
      () => {
        return resolveTransition(previous, data, trigger, kind);
      },
      async resolved => {
        return followLane(previous, data, trigger, kind, resolved);
      },
      async ({target}) => {
        return appendSnapshot(previous, data, trigger, target);
      },
      forgetIfFinal,
      announceChange,
    );
  }

  function resolveTransition(
    previous: Previous,
    data: OperationData,
    trigger: Trigger,
    kind: ResolvedKind,
  ): TargetResolved | TransitionRefused {
    const targetResult = resolveTarget(previous.state, trigger, {
      attempts: data.attempts,
      maxAttempts: kind.maxAttempts,
      whenGivenUp: kind.whenGivenUp,
    });
    if (isOutcome('target-resolved')(targetResult)) {
      return targetResult;
    }
    return {outcome: 'transition-refused', operation: isInState('initial')(previous) ? data : previous, trigger};
  }

  /**
   * Ends the followers before the operation that is given up: its own snapshot commits the whole giving up, so a
   * store failure or a reload partway leaves it unfinished, and the next try repeats it for whatever still waits.
   * Nothing behind it can go out meanwhile, because it still blocks its lane.
   */
  async function followLane(
    previous: Previous,
    data: OperationData,
    trigger: Trigger,
    kind: ResolvedKind,
    resolved: TargetResolved,
  ): Promise<TargetResolved | StorageFull | StorageFailed> {
    const {target} = resolved;
    if (!doesLaneFollow(previous.state, trigger, target, kind)) {
      return resolved;
    }
    const laneTrigger = laneTriggerFor(target);
    const followers = findOperationFollowers(operations.values())(data);
    return eachUntilFailure(isStorageProblem)(
      followers,
      async follower => {
        return commit(follower, follower, laneTrigger);
      },
      resolved,
    );
  }

  async function appendSnapshot(
    previous: Previous,
    data: OperationData,
    trigger: Trigger,
    target: OperationSnapshot['state'],
  ): Promise<OperationTransitioned | StorageFull | StorageFailed> {
    const snapshot: OperationSnapshot = Object.freeze({
      ...data,
      schemaVersion: SCHEMA_VERSION,
      seq: (isInState('initial')(previous) ? 0 : previous.seq) + 1,
      trigger,
      at: clock.getServerTime(),
      state: target,
    });
    const appendResult = await callStore(async () => {
      return store.append(snapshot);
    });
    return isOutcome('snapshot-appended')(appendResult)
      ? {outcome: 'operation-transitioned', operation: snapshot}
      : appendResult;
  }

  /** Once the final snapshot is stored the operation has ended, whether or not deleting its snapshots worked */
  async function forgetIfFinal(transitioned: OperationTransitioned): Promise<OperationTransitioned> {
    const {operation} = transitioned;
    if (!isFinal(operation)) {
      operations.set(operation.id, operation);
      return transitioned;
    }
    operations.delete(operation.id);
    const removeResult = await callStore(async () => {
      return store.remove([operation.id]);
    });
    if (isOutcome('storage-failed')(removeResult)) {
      // Load deletes what the failed delete left behind
      logger.warn('Operation not deleted', {errorName: removeResult.errorName});
    }
    return transitioned;
  }

  function announceChange(transitioned: OperationTransitioned): OperationTransitioned {
    notifyChanged(transitioned.operation);
    requestPass();
    return transitioned;
  }

  // Commands

  /**
   * Applies the command to the operation it looks up, or parks it on the operation's attempt when one runs.
   * The attempt's end applies the parked commands in order, in the same task, so nothing starts in between.
   */
  async function takeCommand<Result>(
    lookUp: () => Lookup,
    apply: (lookup: Lookup) => Promise<Result>,
  ): Promise<Parked<Result>> {
    const takenResult = await serialized(async (): Promise<CommandTaken<Result>> => {
      const lookup = lookUp();
      const attemptResult: AttemptFound | NoAttempt = isOutcome('operation-found')(lookup)
        ? findAttempt(lookup.operation.id)
        : {outcome: 'no-attempt'};
      if (isOutcome('attempt-found')(attemptResult)) {
        return {outcome: 'command-taken', answer: parkOn(attemptResult.attempt, apply)};
      }
      const applied = await apply(lookup);
      return {outcome: 'command-taken', answer: Promise.resolve(applied)};
    });
    return isOutcome('outbox-not-started')(takenResult) ? takenResult : takenResult.answer;
  }

  async function parkOn<Result>(
    attempt: RunningAttempt,
    apply: (lookup: Lookup) => Promise<Result>,
  ): Promise<Parked<Result>> {
    const {promise, resolve} = Promise.withResolvers<Parked<Result>>();
    const command: ParkedCommand = {
      applyTo: async lookup => {
        return resolve(await apply(lookup));
      },
      answer: resolve,
    };
    attempts.set(attempt.operationId, {...attempt, parked: [...attempt.parked, command]});
    return promise;
  }

  /** Each parked command answers how the operation ended, or applies to it as the earlier ones left it */
  async function finishAttempt(attempt: RunningAttempt, operation: OperationView): Promise<void> {
    attempts.delete(attempt.operationId);
    disarm(attempt.timeout);
    if (isFinal(operation)) {
      for (const command of attempt.parked) {
        command.answer(endedWhileWaiting(operation));
      }
      return;
    }
    await runInOrder(
      attempt.parked.map(command => {
        return async () => {
          return command.applyTo(findById(operation.id));
        };
      }),
    );
  }

  async function enqueue(kind: ResolvedKind, request: EnqueueRequest<unknown>): Promise<EnqueueOutcome<unknown>> {
    return pipe(isOutcome('correlation-key-empty', 'lane-key-empty', 'payload-invalid'))(
      () => {
        return checkKeys(request);
      },
      () => {
        return parsePayload(kind, request.payload);
      },
      async ({payload}) => {
        return placeOperation(kind, request, payload);
      },
    );
  }

  async function placeOperation(
    kind: ResolvedKind,
    request: EnqueueRequest<unknown>,
    payload: unknown,
  ): Promise<EnqueueOutcome<unknown>> {
    return match(correlationOf(request))
      .with({state: 'uncorrelated'}, async () => {
        return serialized(async () => {
          return createOperation(kind, request, payload);
        });
      })
      .with({state: 'correlated'}, async ({correlationKey}) => {
        return enqueueCorrelated(kind, request, payload, correlationKey);
      })
      .exhaustive();
  }

  function refuseOtherKind(kind: ResolvedKind, lookup: Lookup): Lookup | KeyTakenByOtherKind {
    return isOutcome('operation-found')(lookup) && lookup.operation.kind !== kind.name
      ? {outcome: 'key-taken-by-other-kind', kind: lookup.operation.kind}
      : lookup;
  }

  async function enqueueCorrelated(
    kind: ResolvedKind,
    request: EnqueueRequest<unknown>,
    payload: unknown,
    correlationKey: string,
  ): Promise<EnqueueOutcome<unknown>> {
    // Checked before parking as well, so another kind's key is refused at once while its attempt runs
    const checkedLookup = refuseOtherKind(kind, findByKey(correlationKey));
    if (isOutcome('key-taken-by-other-kind')(checkedLookup)) {
      return checkedLookup;
    }
    return takeCommand(
      () => {
        return findByKey(correlationKey);
      },
      async lookup => {
        return pipe(isOutcome('key-taken-by-other-kind'))(
          () => {
            return refuseOtherKind(kind, lookup);
          },
          async current => {
            return isOutcome('operation-found')(current)
              ? versionOperation(current.operation, kind, request, payload)
              : createOperation(kind, request, payload);
          },
        );
      },
    );
  }

  async function createOperation(
    kind: ResolvedKind,
    request: EnqueueRequest<unknown>,
    payload: unknown,
  ): Promise<OperationQueued<unknown> | OutboxFull | TransitionRefused | StorageFull | StorageFailed> {
    return pipe(isOutcome('outbox-full', 'transition-refused', 'storage-full', 'storage-failed'))(
      (): RoomLeft | OutboxFull => {
        return operations.size >= configuration.maxOperations ? {outcome: 'outbox-full'} : {outcome: 'room-left'};
      },
      async () => {
        const data = newOperationData(kind, request, payload, {
          id: createId(),
          queuedSeq: nextQueuedSeqOf(operations.values()),
          serverTime: clock.getServerTime(),
        });
        return commit({state: 'initial'}, data, 'operation-queued');
      },
      ({operation}): OperationQueued<unknown> => {
        return {outcome: 'operation-queued', operation};
      },
    );
  }

  async function versionOperation(
    found: OperationSnapshot,
    kind: ResolvedKind,
    request: EnqueueRequest<unknown>,
    payload: unknown,
  ): Promise<OperationVersioned<unknown> | TransitionRefused | StorageFull | StorageFailed> {
    return pipe(isCommitFailure)(
      async () => {
        const data = versionOperationData(found, kind, request, payload, {
          queuedSeq: nextQueuedSeqOf(operations.values()),
          serverTime: clock.getServerTime(),
        });
        return commit(found, data, 'operation-versioned');
      },
      ({operation}): OperationVersioned<unknown> => {
        return {outcome: 'operation-versioned', operation};
      },
    );
  }

  async function hold(correlationKey: string): Promise<HoldOutcome> {
    return takeCommand(
      () => {
        return findByKey(correlationKey);
      },
      async lookup => {
        return pipe(isCommandFailure)(
          () => {
            return lookup;
          },
          async ({operation}) => {
            return commit(operation, operation, 'operation-held');
          },
          ({operation}): OperationHeld => {
            return {outcome: 'operation-held', operation};
          },
        );
      },
    );
  }

  async function release(correlationKey: string): Promise<ReleaseOutcome> {
    return takeCommand(
      () => {
        return findByKey(correlationKey);
      },
      async lookup => {
        return pipe(isCommandFailure)(
          () => {
            return lookup;
          },
          async ({operation}) => {
            return commit(operation, operation, 'operation-released');
          },
          ({operation}): OperationReleased => {
            return {outcome: 'operation-released', operation};
          },
        );
      },
    );
  }

  /** Never parks: it drops the operation, then aborts and finishes its attempt */
  async function drop(correlationKey: string): Promise<DropOutcome> {
    return serialized(async () => {
      return pipe(isCommandFailure)(
        () => {
          return findByKey(correlationKey);
        },
        async ({operation}) => {
          return commit(operation, operation, 'operation-dropped');
        },
        async ({operation}) => {
          return endAttemptOf(operation);
        },
      );
    });
  }

  async function endAttemptOf(dropped: OperationSnapshot): Promise<OperationDropped> {
    const attemptResult = findAttempt(dropped.id);
    if (isOutcome('attempt-found')(attemptResult)) {
      attemptResult.attempt.controller.abort();
      await finishAttempt(attemptResult.attempt, dropped);
    }
    return {outcome: 'operation-dropped', operation: dropped};
  }

  // Attempts

  async function startAttempt(operationId: string): Promise<CommitOutcome | StepSkipped> {
    return pipe(isStepEnd)(
      () => {
        return findWhen(operationId, operation => {
          return isInState('queued')(operation) && isInState('running')(run) && backoffRemaining() === 0;
        });
      },
      async ({operation}) => {
        return commit(operation, {...operation, attempts: operation.attempts + 1}, 'attempt-started');
      },
      launchAttempt,
    );
  }

  function launchAttempt(started: OperationTransitioned): OperationTransitioned {
    const {operation} = started;
    const controller = new AbortController();
    const timeout = match(operation.limits.attemptTimeout)
      .with({state: 'times-out-after'}, ({milliseconds}) => {
        return armTimer(() => {
          controller.abort();
          recordResult(operation.id, controller, 'attempt-timed-out');
        }, milliseconds);
      })
      .with({state: 'never-times-out'}, (): Timer => {
        return {state: 'disarmed'};
      })
      .exhaustive();
    attempts.set(operation.id, {
      operationId: operation.id,
      controller,
      timeout,
      result: {state: 'running'},
      parked: [],
    });
    void runAttempt(operation, controller);
    return started;
  }

  async function runAttempt(operation: OperationSnapshot, controller: AbortController): Promise<void> {
    const answer = await askKind(operation, controller.signal);
    recordResult(operation.id, controller, answer.outcome);
  }

  async function askKind(operation: OperationSnapshot, signal: AbortSignal): Promise<AttemptOutcome | AttemptErrored> {
    try {
      const answer: unknown = await kindOf(operation).attempt(operation, signal);
      if (isAttemptAnswer(answer)) {
        return answer;
      }
      logger.warn('Attempt errored', {kind: operation.kind, errorName: 'UnknownAnswer'});
      return {outcome: 'attempt-errored'};
    } catch (error) {
      // An attempt that was aborted is over; its rejection is the kind honouring the signal
      if (!signal.aborted) {
        logger.warn('Attempt errored', {kind: operation.kind, errorName: errorNameOf(error)});
      }
      return {outcome: 'attempt-errored'};
    }
  }

  /** Called by the kind's answer and by the timeout; only the first result of the attempt still running counts */
  function recordResult(operationId: string, controller: AbortController, trigger: Trigger): void {
    match(findAttempt(operationId))
      .with(
        {
          outcome: 'attempt-found',
          attempt: {
            controller: P.when(current => {
              return current === controller;
            }),
            result: {state: 'running'},
          },
        },
        ({attempt}) => {
          attempts.set(operationId, {
            ...attempt,
            timeout: disarm(attempt.timeout),
            result: {state: 'finished', trigger},
          });
          requestPass();
        },
      )
      .otherwise(noop);
  }

  function findFinished(operationId: string): AttemptFinished | StepSkipped {
    return match({attemptResult: findAttempt(operationId), lookup: findById(operationId)})
      .with(
        {
          attemptResult: {outcome: 'attempt-found', attempt: {result: {state: 'finished'}}},
          lookup: {outcome: 'operation-found'},
        },
        ({attemptResult: {attempt}, lookup: {operation}}): AttemptFinished => {
          return {outcome: 'attempt-finished', attempt, operation, trigger: attempt.result.trigger};
        },
      )
      .otherwise((): StepSkipped => {
        return {outcome: 'step-skipped'};
      });
  }

  /** A store failure leaves the attempt finished, to be settled again at a later pass */
  async function settleAttempt(operationId: string): Promise<CommitOutcome | StepSkipped> {
    const finished = findFinished(operationId);
    if (isOutcome('step-skipped')(finished)) {
      return finished;
    }
    const {attempt, operation, trigger} = finished;
    const commitResult = await commit(operation, operation, trigger);
    if (isStorageProblem(commitResult)) {
      return commitResult;
    }
    if (trigger === 'attempt-succeeded') {
      resetBackoff();
    } else if (isInState('queued')(commitResult.operation)) {
      growBackoff();
    }
    // A stop while the result was stored has answered the parked commands already
    const currentResult = findAttempt(operationId);
    if (isOutcome('attempt-found')(currentResult) && currentResult.attempt.controller === attempt.controller) {
      await finishAttempt(currentResult.attempt, commitResult.operation);
    }
    return commitResult;
  }

  async function expireOperation(operationId: string): Promise<CommitOutcome | StepSkipped> {
    return pipe(isStepEnd)(
      () => {
        return findWhen(operationId, operation => {
          return isDueToExpire(operation, clock.getServerTime());
        });
      },
      async ({operation}) => {
        return commit(operation, operation, 'operation-expired');
      },
    );
  }

  // Loading

  function parseStoredSnapshot(snapshot: OperationSnapshot): SnapshotUsable | SnapshotUnusable {
    const kind = kinds.get(snapshot.kind);
    if (snapshot.schemaVersion !== SCHEMA_VERSION) {
      return {outcome: 'snapshot-unusable', operationId: snapshot.id, reason: 'schema-unknown'};
    }
    if (kind === undefined) {
      return {outcome: 'snapshot-unusable', operationId: snapshot.id, reason: 'kind-not-registered'};
    }
    if (isFinal(snapshot)) {
      return {outcome: 'snapshot-unusable', operationId: snapshot.id, reason: 'operation-ended'};
    }
    try {
      return {
        outcome: 'snapshot-usable',
        snapshot: Object.freeze({...snapshot, payload: kind.parsePayload(snapshot.payload)}),
      };
    } catch {
      return {outcome: 'snapshot-unusable', operationId: snapshot.id, reason: 'payload-invalid'};
    }
  }

  async function removeUnusable(unusable: SnapshotUnusable[]): Promise<SnapshotsRemoved | StorageFailed> {
    if (unusable.length === 0) {
      return {outcome: 'snapshots-removed'};
    }
    return callStore(async () => {
      return store.remove(
        unusable.map(({operationId}) => {
          return operationId;
        }),
      );
    });
  }

  async function keepUsable(loaded: SnapshotsLoaded): Promise<OperationsLoaded | StorageFailed> {
    const parsed = loaded.operations.map(parseStoredSnapshot);
    const usable = parsed.filter(isOutcome('snapshot-usable')).map(({snapshot}) => {
      return snapshot;
    });
    const unusable = parsed.filter(isOutcome('snapshot-unusable'));
    return pipe(isOutcome('storage-failed'))(
      async () => {
        return removeUnusable(unusable);
      },
      (): OperationsLoaded => {
        for (const snapshot of usable) {
          operations.set(snapshot.id, snapshot);
        }
        return {outcome: 'operations-loaded', usable, quarantinedCount: loaded.quarantinedCount + unusable.length};
      },
    );
  }

  async function resumeOperation(snapshot: OperationSnapshot): Promise<CommitOutcome | OperationAnnounced> {
    if (isInState('in-progress')(snapshot)) {
      return commit(snapshot, snapshot, 'attempt-interrupted');
    }
    notifyChanged(snapshot);
    return {outcome: 'operation-announced'};
  }

  async function load(): Promise<OutboxStarted | StorageFull | StorageFailed | OutboxNotStarted> {
    return serialized(async () => {
      return pipe(isStorageProblem)(
        async () => {
          return callStore(async () => {
            return store.loadLatest();
          });
        },
        keepUsable,
        async loaded => {
          return eachUntilFailure(isStorageProblem)(loaded.usable, resumeOperation, loaded);
        },
        ({quarantinedCount}): OutboxStarted => {
          logger.info('Operations loaded', {count: operations.size, quarantinedCount});
          requestPass();
          return {outcome: 'outbox-started'};
        },
      );
    });
  }

  // Lifecycle

  async function stop(): Promise<void> {
    queue = {state: 'closed', tail: queue.tail};
    run = {state: 'paused'};
    const stopped = [...attempts.values()];
    attempts.clear();
    for (const attempt of stopped) {
      attempt.controller.abort();
      disarm(attempt.timeout);
      for (const command of attempt.parked) {
        command.answer({outcome: 'outbox-not-started'});
      }
    }
    await queue.tail;
    // A pass that was running when the queue closed may have armed it again
    wake = disarm(wake);
  }

  return {
    load,
    enqueue,
    hold,
    release,
    drop,
    findByCorrelationKey: findByKey,
    lane(laneKey) {
      const lane = lanesOf(operations.values()).get(laneKey);
      return lane === undefined ? {outcome: 'lane-empty'} : {outcome: 'lane-found', lane};
    },
    lanes() {
      return {outcome: 'lanes-listed', lanes: [...lanesOf(operations.values()).values()]};
    },
    pause() {
      run = {state: 'paused'};
    },
    resume() {
      run = {state: 'running'};
      resetBackoff();
      requestPass();
    },
    stop,
  };
}
