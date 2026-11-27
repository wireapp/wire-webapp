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

import {isMatching, P} from 'ts-pattern';

import {
  backoffDelay,
  correlationOf,
  decideCascade,
  findOperationFollowers,
  isCascadePending,
  isDueToExpire,
  isFinal,
  lanesOf,
  newOperationData,
  nextQueuedSeqOf,
  parseStoredSnapshot,
  planPass,
  resolveConfiguration,
  resolveTarget,
  SCHEMA_VERSION,
  toView,
  versionOperationData,
  type LaneSettings,
  type ResolvedKind,
  type Run,
  type Wake,
} from './operationRules';
import {isInState, isOutcome} from './tagged';
import type {
  Correlation,
  DeadLetterOutcome,
  DeleteOutcome,
  EndedWhileWaiting,
  EndingOptions,
  EnqueueOutcome,
  EnqueueRequest,
  HoldOutcome,
  LaneEmpty,
  LaneFound,
  LanesListed,
  OperationData,
  OperationFound,
  OperationNotFound,
  OperationSnapshot,
  OperationView,
  Outcome,
  OutboxDependencies,
  OutboxNotStarted,
  OutboxStarted,
  OutboxUnavailable,
  PayloadInvalid,
  ReleaseOutcome,
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
type Lookup = Outcome<'operation-found', {operation: OperationSnapshot}> | OperationNotFound;

type OperationTransitioned = Outcome<'operation-transitioned', {operation: OperationSnapshot}>;
type CommitOutcome = OperationTransitioned | TransitionRefused | StorageFull | StorageFailed;
/** A step of a pass skips when its precondition no longer holds */
type StepOutcome = CommitOutcome | Outcome<'step-skipped'>;

/** A command is refused at once, or accepted and applied to the operation now or when its running attempt ends */
type Command<Result> =
  | Outcome<'command-refused', {answer: Result}>
  | Outcome<'command-accepted', {apply: (lookup: Lookup) => Promise<Result>}>;
type Parked<Result> = Result | EndedWhileWaiting | OutboxNotStarted;
type ParkedCommand = {
  applyTo: (lookup: Lookup) => Promise<void>;
  answer: (answer: EndedWhileWaiting | OutboxNotStarted) => void;
};

type RunningAttempt = {
  operationId: string;
  controller: AbortController;
  timeout: Timer;
  /** The first result wins */
  result: State<'running'> | State<'finished', {trigger: Trigger}>;
  parked: ParkedCommand[];
};

export type Engine = {
  /** Loads the stored operations; nothing else may be called before it answers `outbox-started` */
  load: () => Promise<OutboxStarted | StorageFull | StorageFailed | OutboxNotStarted>;
  enqueue: (kind: ResolvedKind, request: EnqueueRequest<unknown>) => Promise<EnqueueOutcome<unknown>>;
  hold: (correlationKey: string) => Promise<HoldOutcome>;
  release: (correlationKey: string) => Promise<ReleaseOutcome>;
  deadLetter: (correlationKey: string, options: EndingOptions) => Promise<DeadLetterOutcome>;
  delete: (correlationKey: string, options: EndingOptions) => Promise<DeleteOutcome>;
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

const isAttemptAnswer = isMatching({
  outcome: P.union('attempt-succeeded', 'attempt-failed', 'attempt-held', 'attempt-dead-lettered', 'attempt-deleted'),
});

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function parsePayload(
  kind: ResolvedKind,
  value: unknown,
): Outcome<'payload-parsed', {payload: unknown}> | PayloadInvalid {
  try {
    return {outcome: 'payload-parsed', payload: kind.parsePayload(value)};
  } catch (error) {
    return {outcome: 'payload-invalid', errorName: errorNameOf(error)};
  }
}

/**
 * Owns all runtime state of a started outbox. Commands, scheduler passes and load run one after another through
 * `serialized`; the timer and kind callbacks only record a result and request a pass.
 */
export function createEngine(kinds: ReadonlyMap<string, ResolvedKind>, dependencies: OutboxDependencies): Engine {
  const {store, clock, random, createId, logger} = dependencies;
  const configuration = resolveConfiguration(dependencies.configuration);

  // State

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

  function findAttempt(
    operationId: string,
  ): Outcome<'attempt-found', {attempt: RunningAttempt}> | Outcome<'no-attempt'> {
    const attempt = attempts.get(operationId);
    return attempt === undefined ? {outcome: 'no-attempt'} : {outcome: 'attempt-found', attempt};
  }

  /** Runs the task after every earlier one; once the queue is closed, it answers `outbox-not-started` instead */
  function serialized<Result>(task: () => Promise<Result>): Promise<Result | OutboxNotStarted> {
    const result = queue.tail.then(async (): Promise<Result | OutboxNotStarted> => {
      return isInState('open')(queue) ? task() : {outcome: 'outbox-not-started'};
    });
    queue = {...queue, tail: result};
    return result;
  }

  // Commands

  /** The refusals are answered in the command's turn, at once, even while an attempt runs */
  async function enqueue(kind: ResolvedKind, request: EnqueueRequest<unknown>): Promise<EnqueueOutcome<unknown>> {
    return takeCommand(correlationOf(request), (lookup): Command<EnqueueOutcome<unknown>> => {
      if (request.correlationKey === '') {
        return {outcome: 'command-refused', answer: {outcome: 'correlation-key-empty'}};
      }
      if (request.laneKey === '') {
        return {outcome: 'command-refused', answer: {outcome: 'lane-key-empty'}};
      }
      const parseResult = parsePayload(kind, request.payload);
      if (isOutcome('payload-invalid')(parseResult)) {
        return {outcome: 'command-refused', answer: parseResult};
      }
      if (isOutcome('operation-found')(lookup) && lookup.operation.kind !== kind.name) {
        return {outcome: 'command-refused', answer: {outcome: 'key-taken-by-other-kind', kind: lookup.operation.kind}};
      }
      return {
        outcome: 'command-accepted',
        apply: async current => {
          return placeOperation(kind, request, parseResult.payload, current);
        },
      };
    });
  }

  /** A version of the operation with the correlation key, or else a new operation */
  async function placeOperation(
    kind: ResolvedKind,
    request: EnqueueRequest<unknown>,
    payload: unknown,
    lookup: Lookup,
  ): Promise<EnqueueOutcome<unknown>> {
    const place = {queuedSeq: nextQueuedSeqOf(operations.values()), serverTime: clock.getServerTime()};
    if (isOutcome('operation-found')(lookup)) {
      const data = versionOperationData(lookup.operation, kind, request, payload, place);
      const versionResult = await commit(lookup.operation, data, 'operation-versioned');
      return isOutcome('operation-transitioned')(versionResult)
        ? {outcome: 'operation-versioned', operation: toView(versionResult.operation)}
        : versionResult;
    }
    if (operations.size >= configuration.maxOperations) {
      return {outcome: 'outbox-full'};
    }
    const data = newOperationData(kind, request, payload, {...place, id: createId()});
    const queueResult = await commit({state: 'initial'}, data, 'operation-queued');
    return isOutcome('operation-transitioned')(queueResult)
      ? {outcome: 'operation-queued', operation: toView(queueResult.operation)}
      : queueResult;
  }

  async function holdOrRelease<Change extends 'operation-held' | 'operation-released'>(
    trigger: Change,
    correlationKey: string,
  ): Promise<
    Parked<
      Outcome<Change, {operation: OperationView}> | TransitionRefused | StorageFull | StorageFailed | OperationNotFound
    >
  > {
    return takeCommand({state: 'correlated', correlationKey}, () => {
      return {
        outcome: 'command-accepted',
        apply: async lookup => {
          if (!isOutcome('operation-found')(lookup)) {
            return lookup;
          }
          const commitResult = await commit(lookup.operation, lookup.operation, trigger);
          return isOutcome('operation-transitioned')(commitResult)
            ? {outcome: trigger, operation: toView(commitResult.operation)}
            : commitResult;
        },
      };
    });
  }

  /**
   * Never parks: it ends the operation, then aborts and finishes its attempt. The owner's `lane` replaces the
   * kind's setting for this ending.
   */
  async function endOperation<Ending extends 'operation-dead-lettered' | 'operation-deleted'>(
    trigger: Ending,
    correlationKey: string,
    {lane}: EndingOptions,
  ): Promise<Outcome<Ending, {operation: OperationView}> | TransitionRefused | OperationNotFound | OutboxUnavailable> {
    return serialized(async () => {
      const lookup = findByKey(correlationKey);
      if (!isOutcome('operation-found')(lookup)) {
        return lookup;
      }
      const {operation} = lookup;
      const laneWhenEnded =
        lane === undefined ? kindOf(operation).laneWhenEnded : {'dead-lettered': lane, deleted: lane};
      const commitResult = await commit(operation, operation, trigger, laneWhenEnded);
      if (!isOutcome('operation-transitioned')(commitResult)) {
        return commitResult;
      }
      const ended = commitResult.operation;
      const attemptResult = findAttempt(ended.id);
      if (isOutcome('attempt-found')(attemptResult)) {
        attemptResult.attempt.controller.abort();
        await finishAttempt(attemptResult.attempt, ended);
      }
      return {outcome: trigger, operation: toView(ended)};
    });
  }

  /**
   * Joins the queue at call time, so commands take their turns in the order they were called. In its turn, the
   * command is refused at once, or applies to the operation with the correlation, or is parked on that operation's
   * running attempt. The attempt's end applies the parked commands in order, in the same task, so nothing starts in
   * between.
   */
  async function takeCommand<Result>(
    correlation: Correlation,
    decide: (lookup: Lookup) => Command<Result>,
  ): Promise<Parked<Result>> {
    // The answer is wrapped, so that the queue doesn't wait for a parked command
    const takenResult = await serialized(
      async (): Promise<Outcome<'command-taken', {answer: Promise<Parked<Result>>}>> => {
        const lookup: Lookup = isInState('correlated')(correlation)
          ? findByKey(correlation.correlationKey)
          : {outcome: 'operation-not-found'};
        const command = decide(lookup);
        if (isOutcome('command-refused')(command)) {
          return {outcome: 'command-taken', answer: Promise.resolve(command.answer)};
        }
        const attemptResult = isOutcome('operation-found')(lookup)
          ? findAttempt(lookup.operation.id)
          : ({outcome: 'no-attempt'} as const);
        if (!isOutcome('attempt-found')(attemptResult)) {
          return {outcome: 'command-taken', answer: Promise.resolve(await command.apply(lookup))};
        }
        const {attempt} = attemptResult;
        const {promise, resolve} = Promise.withResolvers<Parked<Result>>();
        const parked: ParkedCommand = {
          applyTo: async current => {
            return resolve(await command.apply(current));
          },
          answer: resolve,
        };
        attempts.set(attempt.operationId, {...attempt, parked: [...attempt.parked, parked]});
        return {outcome: 'command-taken', answer: promise};
      },
    );
    return isOutcome('outbox-not-started')(takenResult) ? takenResult : takenResult.answer;
  }

  // Commit and the cascade

  /**
   * Stores the snapshot first, and changes nothing if that fails. It knows nothing about attempts or callers.
   * `laneWhenEnded` is the kind's, unless the owner's command overrides it.
   */
  async function commit(
    previous: Previous,
    data: OperationData,
    trigger: Trigger,
    laneWhenEnded: LaneSettings = kindOf(data).laneWhenEnded,
  ): Promise<CommitOutcome> {
    const kind = kindOf(data);
    const targetResult = resolveTarget(previous.state, trigger, {
      attempts: data.attempts,
      maxAttempts: kind.maxAttempts,
      whenExhausted: kind.whenExhausted,
    });
    if (isOutcome('target-refused')(targetResult)) {
      return {
        outcome: 'transition-refused',
        operation: toView(isInState('initial')(previous) ? data : previous),
        trigger,
      };
    }
    const {target} = targetResult;
    const cascade = decideCascade(previous.state, trigger, target, laneWhenEnded);
    const appendResult = await appendSnapshot(previous, {...data, cascade}, trigger, target);
    if (isStorageProblem(appendResult)) {
      return appendResult;
    }
    await rememberOrForget(appendResult.operation);
    notifyChanged(appendResult.operation);
    requestPass();
    // A cascade that fails partway has ended the operation already; a later pass finishes it
    await followLane(appendResult.operation.id);
    return appendResult;
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

  /**
   * Once the final snapshot is stored the operation has ended, whether or not deleting its snapshots worked. One
   * whose cascade is still pending stays until the operations behind it have ended.
   */
  async function rememberOrForget(operation: OperationSnapshot): Promise<void> {
    if (!isFinal(operation) || isCascadePending(operation)) {
      operations.set(operation.id, operation);
      return;
    }
    operations.delete(operation.id);
    const removeResult = await callStore(async () => {
      return store.remove([operation.id]);
    });
    if (isOutcome('storage-failed')(removeResult)) {
      // Load deletes what the failed delete left behind
      logger.warn('Operation not deleted', {errorName: removeResult.errorName});
    }
  }

  function notifyChanged(operation: OperationSnapshot): void {
    try {
      kindOf(operation).onChanged(toView(operation));
    } catch (error) {
      logger.warn('onChanged threw', {kind: operation.kind, errorName: errorNameOf(error)});
    }
  }

  async function callStore<Result extends {outcome: string}>(
    call: () => Promise<Result>,
  ): Promise<Result | StorageFailed> {
    try {
      return await call();
    } catch (error) {
      return {outcome: 'storage-failed', errorName: errorNameOf(error)};
    }
  }

  /**
   * Ends the operations behind one whose stored cascade is `pending`, then stores the cascade as done. The ending is
   * stored before them, so a store failure or a reload partway leaves the cascade pending, and the next pass finishes
   * it. Nothing behind the operation can go out meanwhile, because it still blocks its lane.
   */
  async function followLane(operationId: string): Promise<StepOutcome> {
    const lookup = findById(operationId);
    if (!isOutcome('operation-found')(lookup) || !isCascadePending(lookup.operation)) {
      return {outcome: 'step-skipped'};
    }
    const ending = lookup.operation;
    for (const follower of findOperationFollowers(operations.values())(ending)) {
      const followResult = await commit(follower, follower, ending.cascade.trigger);
      if (isStorageProblem(followResult)) {
        return followResult;
      }
    }
    const doneResult = await appendSnapshot(
      ending,
      {...ending, cascade: {state: 'none'}},
      ending.trigger,
      ending.state,
    );
    if (isStorageProblem(doneResult)) {
      return doneResult;
    }
    await rememberOrForget(doneResult.operation);
    return doneResult;
  }

  // The pass

  function requestPass(): void {
    if (isInState('queued')(pass)) {
      return;
    }
    pass = {state: 'queued'};
    void serialized(runPass);
  }

  /**
   * Settles the finished attempts, finishes the interrupted cascades, expires what is due and starts what may
   * start. Each step checks its own precondition again, so a plan that went stale does no harm; every commit
   * requests the next pass.
   */
  async function runPass(): Promise<void> {
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
    const cascading = [...operations.values()].filter(isCascadePending);
    const results: StepOutcome[] = [];
    for (const {operationId} of finished) {
      results.push(await settleAttempt(operationId));
    }
    for (const {id} of cascading) {
      results.push(await followLane(id));
    }
    for (const operationId of plan.expire) {
      results.push(await expireOperation(operationId));
    }
    for (const operationId of plan.start) {
      results.push(await startAttempt(operationId));
    }
    const storageProblems = results.filter(isStorageProblem);
    if (storageProblems.length === 0) {
      wake = armWake(plan.wake);
      return;
    }
    logger.warn('Pass hit a store failure', {
      outcomes: storageProblems.map(({outcome}) => {
        return outcome;
      }),
    });
    // A commit that went through before the failure requests a pass that repeats the failed step at once; failing
    // again within the backoff is the same failure, so it doesn't grow the backoff again
    if (backoffRemaining() === 0) {
      growBackoff();
    }
    wake = armWake({state: 'wake-in', milliseconds: backoffRemaining()});
  }

  async function expireOperation(operationId: string): Promise<StepOutcome> {
    const lookup = findById(operationId);
    if (!isOutcome('operation-found')(lookup) || !isDueToExpire(lookup.operation, clock.getServerTime())) {
      return {outcome: 'step-skipped'};
    }
    return commit(lookup.operation, lookup.operation, 'operation-expired');
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
    return isInState('wake-in')(planned) ? armTimer(requestPass, planned.milliseconds) : {state: 'disarmed'};
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

  // Attempts

  async function startAttempt(operationId: string): Promise<StepOutcome> {
    const lookup = findById(operationId);
    const mayStart = isInState('running')(run) && backoffRemaining() === 0;
    if (!isOutcome('operation-found')(lookup) || !isInState('queued')(lookup.operation) || !mayStart) {
      return {outcome: 'step-skipped'};
    }
    const {operation} = lookup;
    const startResult = await commit(operation, {...operation, attempts: operation.attempts + 1}, 'attempt-started');
    if (!isOutcome('operation-transitioned')(startResult)) {
      return startResult;
    }
    const started = startResult.operation;
    const controller = new AbortController();
    const {attemptTimeout} = started.limits;
    const timeout: Timer = isInState('times-out-after')(attemptTimeout)
      ? armTimer(() => {
          controller.abort();
          recordResult(started.id, controller, 'attempt-timed-out');
        }, attemptTimeout.milliseconds)
      : {state: 'disarmed'};
    attempts.set(started.id, {operationId: started.id, controller, timeout, result: {state: 'running'}, parked: []});
    void runAttempt(started, controller);
    return startResult;
  }

  /** A rejection, a throw or an unknown answer is `attempt-errored` */
  async function runAttempt(operation: OperationSnapshot, controller: AbortController): Promise<void> {
    const {signal} = controller;
    try {
      const answer: unknown = await kindOf(operation).attempt(toView(operation), signal);
      if (isAttemptAnswer(answer)) {
        recordResult(operation.id, controller, answer.outcome);
        return;
      }
      logger.warn('Attempt errored', {kind: operation.kind, errorName: 'UnknownAnswer'});
    } catch (error) {
      // An attempt that was aborted is over; its rejection is the kind honouring the signal
      if (!signal.aborted) {
        logger.warn('Attempt errored', {kind: operation.kind, errorName: errorNameOf(error)});
      }
    }
    recordResult(operation.id, controller, 'attempt-errored');
  }

  /** Called by the kind's answer and by the timeout; only the first result of the attempt still running counts */
  function recordResult(operationId: string, controller: AbortController, trigger: Trigger): void {
    const attemptResult = findAttempt(operationId);
    if (
      !isOutcome('attempt-found')(attemptResult) ||
      attemptResult.attempt.controller !== controller ||
      !isInState('running')(attemptResult.attempt.result)
    ) {
      return;
    }
    const {attempt} = attemptResult;
    attempts.set(operationId, {...attempt, timeout: disarm(attempt.timeout), result: {state: 'finished', trigger}});
    requestPass();
  }

  /** A store failure leaves the attempt finished, to be settled again at a later pass */
  async function settleAttempt(operationId: string): Promise<StepOutcome> {
    const attemptResult = findAttempt(operationId);
    const lookup = findById(operationId);
    if (
      !isOutcome('attempt-found')(attemptResult) ||
      !isInState('finished')(attemptResult.attempt.result) ||
      !isOutcome('operation-found')(lookup)
    ) {
      return {outcome: 'step-skipped'};
    }
    const {attempt} = attemptResult;
    const {trigger} = attemptResult.attempt.result;
    const commitResult = await commit(lookup.operation, lookup.operation, trigger);
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

  /** Each parked command answers how the operation ended, or applies to it as the earlier ones left it */
  async function finishAttempt(attempt: RunningAttempt, operation: OperationView): Promise<void> {
    attempts.delete(attempt.operationId);
    disarm(attempt.timeout);
    if (isFinal(operation)) {
      const outcome = isInState('succeeded')(operation) ? 'operation-succeeded' : 'operation-deleted';
      for (const command of attempt.parked) {
        command.answer({outcome, operation: toView(operation)});
      }
      return;
    }
    for (const command of attempt.parked) {
      await command.applyTo(findById(operation.id));
    }
  }

  // Loading

  async function load(): Promise<OutboxStarted | StorageFull | StorageFailed | OutboxNotStarted> {
    return serialized(async () => {
      const loadResult = await callStore(async () => {
        return store.loadLatest();
      });
      if (isOutcome('storage-failed')(loadResult)) {
        return loadResult;
      }
      const usable: OperationSnapshot[] = [];
      const unusableIds: string[] = [];
      for (const snapshot of loadResult.operations) {
        const parseResult = parseStoredSnapshot(snapshot, kinds);
        if (isOutcome('snapshot-usable')(parseResult)) {
          usable.push(parseResult.snapshot);
        } else {
          logger.warn('Snapshot unusable', {reason: parseResult.reason});
          unusableIds.push(snapshot.id);
        }
      }
      if (unusableIds.length > 0) {
        const removeResult = await callStore(async () => {
          return store.remove(unusableIds);
        });
        if (isOutcome('storage-failed')(removeResult)) {
          return removeResult;
        }
      }
      for (const snapshot of usable) {
        operations.set(snapshot.id, snapshot);
      }
      for (const snapshot of usable) {
        if (!isInState('in-progress')(snapshot)) {
          notifyChanged(snapshot);
          continue;
        }
        const interruptResult = await commit(snapshot, snapshot, 'attempt-interrupted');
        if (isStorageProblem(interruptResult)) {
          return interruptResult;
        }
      }
      const quarantinedCount = loadResult.quarantinedCount + unusableIds.length;
      logger.info('Operations loaded', {count: operations.size, quarantinedCount});
      requestPass();
      return {outcome: 'outbox-started'};
    });
  }

  // Stopping

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
    hold: async correlationKey => {
      return holdOrRelease('operation-held', correlationKey);
    },
    release: async correlationKey => {
      return holdOrRelease('operation-released', correlationKey);
    },
    deadLetter: async (correlationKey, options) => {
      return endOperation('operation-dead-lettered', correlationKey, options);
    },
    delete: async (correlationKey, options) => {
      return endOperation('operation-deleted', correlationKey, options);
    },
    findByCorrelationKey(correlationKey) {
      const lookup = findByKey(correlationKey);
      return isOutcome('operation-found')(lookup)
        ? {outcome: 'operation-found', operation: toView(lookup.operation)}
        : lookup;
    },
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
