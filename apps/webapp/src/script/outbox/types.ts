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

// The two tagged families

/** What a call produced */
export type Outcome<Tag extends string, Data extends object = Record<never, never>> = {outcome: Tag} & Data;
/** What something is right now */
export type State<Tag extends string, Data extends object = Record<never, never>> = {state: Tag} & Data;

// Operation

export type OperationState = 'queued' | 'on-hold' | 'in-progress' | 'dead-lettered' | 'succeeded' | 'dropped';

/** What happened to an operation; an attempt's answer is the trigger of the same name */
export type Trigger =
  | 'operation-queued'
  | 'operation-versioned'
  | 'operation-held'
  | 'operation-released'
  | 'operation-dropped'
  | 'operation-expired'
  | 'attempt-started'
  | 'attempt-succeeded'
  | 'attempt-failed'
  | 'attempt-held'
  | 'attempt-dead-lettered'
  | 'attempt-dropped'
  | 'attempt-timed-out'
  | 'attempt-errored'
  | 'attempt-interrupted'
  | 'lane-dead-lettered'
  | 'lane-dropped';

export type Correlation = State<'correlated', {correlationKey: string}> | State<'uncorrelated'>;
export type LaneMembership = State<'in-lane', {laneKey: string}> | State<'no-lane'>;
/** In server time */
export type Expiry = State<'expires-at', {serverTime: number}> | State<'never-expires'>;
export type AttemptTimeout = State<'times-out-after', {milliseconds: number}> | State<'never-times-out'>;

/** The one read-only view of an operation, for owners, `attempt` and `onChanged`; its state is its tag */
export type OperationView<Payload = unknown> = State<
  OperationState,
  {
    id: string;
    kind: string;
    payload: Payload;
    correlation: Correlation;
    lane: LaneMembership;
    /** Server time */
    queuedAt: number;
    /** Attempts since the last enqueue, new or a version */
    attempts: number;
  }
>;

/** The limits an enqueue resolved for this operation alone */
export type OperationLimits = {attemptTimeout: AttemptTimeout};

/** The view plus what only the kernel reads */
export type OperationData = OperationView & {
  /** Place in its lane */
  queuedSeq: number;
  expiry: Expiry;
  limits: OperationLimits;
};

/** What a snapshot says about the transition that stored it */
export type StoredHeader = {
  schemaVersion: number;
  /** The operation's n-th snapshot */
  seq: number;
  trigger: Trigger;
  /** Server time */
  at: number;
};

export type OperationSnapshot = OperationData & StoredHeader;

/** The operations of a lane that still block it, in lane order; it is blocked while its first is on hold */
export type Lane = State<'moving' | 'blocked', {laneKey: string; operations: OperationView[]}>;

// Store

/** The browser's quota reached; nothing changed */
export type StorageFull = Outcome<'storage-full'>;
/** Any other store error; nothing changed */
export type StorageFailed = Outcome<'storage-failed', {errorName: string}>;

export type SnapshotsLoaded = Outcome<'snapshots-loaded', {operations: OperationSnapshot[]; quarantinedCount: number}>;
export type SnapshotAppended = Outcome<'snapshot-appended'>;
export type SnapshotsRemoved = Outcome<'snapshots-removed'>;

export type LoadOutcome = SnapshotsLoaded | StorageFailed;
export type AppendOutcome = SnapshotAppended | StorageFull | StorageFailed;
export type RemoveOutcome = SnapshotsRemoved | StorageFailed;

export type OutboxStore = {
  /** The newest snapshot of every operation; an operation whose newest snapshot doesn't parse is deleted and counted */
  loadLatest: () => Promise<LoadOutcome>;
  append: (snapshot: OperationSnapshot) => Promise<AppendOutcome>;
  /** Deletes every snapshot of the operations */
  remove: (operationIds: string[]) => Promise<RemoveOutcome>;
};

// Kind

export type AttemptSucceeded = Outcome<'attempt-succeeded'>;
/** Not this time: the outbox retries, or gives up after `maxAttempts` */
export type AttemptFailed = Outcome<'attempt-failed'>;
/** Stop until the owner releases it, e.g. to ask the user */
export type AttemptHeld = Outcome<'attempt-held'>;
/** Given up; kept until enqueued again or dropped */
export type AttemptDeadLettered = Outcome<'attempt-dead-lettered'>;
/** Given up and forgotten */
export type AttemptDropped = Outcome<'attempt-dropped'>;

export type AttemptOutcome = AttemptSucceeded | AttemptFailed | AttemptHeld | AttemptDeadLettered | AttemptDropped;

export type Kind<Payload> = {
  name: string;
  /** May throw; called at enqueue and at load */
  parsePayload: (value: unknown) => Payload;
  /** Outer limit from enqueue; then `operation-expired`, and given up */
  expiresAfterMilliseconds?: number;
  /** Limit on one attempt; then aborted, `attempt-timed-out` */
  attemptTimeoutMilliseconds?: number;
  /** Attempts before giving up; default 5 */
  maxAttempts?: number;
  /** After `maxAttempts` or at expiry; default 'dead-letter' */
  whenGivenUp?: 'dead-letter' | 'drop';
  /**
   * What the operations of this kind behind one that is given up in its lane do: carry on, or end the same way;
   * default 'continues'. Operations of other kinds in the lane carry on either way.
   */
  laneWhenGivenUp?: 'continues' | 'follows';
  /** A rejection, a throw or an unknown answer is `attempt-errored` */
  attempt: (operation: OperationView<Payload>, signal: AbortSignal) => Promise<AttemptOutcome>;
  /** Fire and forget; a throw is logged */
  onChanged?: (operation: OperationView<Payload>) => void;
};

// Outcomes

export type OperationQueued<Payload> = Outcome<'operation-queued', {operation: OperationView<Payload>}>;
export type OperationVersioned<Payload> = Outcome<'operation-versioned', {operation: OperationView<Payload>}>;
export type OperationHeld = Outcome<'operation-held', {operation: OperationView}>;
export type OperationReleased = Outcome<'operation-released', {operation: OperationView}>;
/** The attempt a command waited for went through */
export type OperationSucceeded = Outcome<'operation-succeeded', {operation: OperationView}>;
/** Given up and forgotten */
export type OperationDropped = Outcome<'operation-dropped', {operation: OperationView}>;
export type OperationFound<Payload> = Outcome<'operation-found', {operation: OperationView<Payload>}>;
/** No unfinished operation has the key */
export type OperationNotFound = Outcome<'operation-not-found'>;

/** The operation's state doesn't accept the trigger; nothing changed */
export type TransitionRefused = Outcome<'transition-refused', {operation: OperationView; trigger: Trigger}>;
export type CorrelationKeyEmpty = Outcome<'correlation-key-empty'>;
export type LaneKeyEmpty = Outcome<'lane-key-empty'>;
/** The kind's `parsePayload` threw */
export type PayloadInvalid = Outcome<'payload-invalid', {errorName: string}>;
export type KeyTakenByOtherKind = Outcome<'key-taken-by-other-kind', {kind: string}>;
/** `maxOperations` reached */
export type OutboxFull = Outcome<'outbox-full'>;

/** Before `start` or after `stop` */
export type OutboxNotStarted = Outcome<'outbox-not-started'>;
export type OutboxAlreadyStarted = Outcome<'outbox-already-started'>;
export type OutboxStarted = Outcome<'outbox-started'>;
export type KindRegistered<Payload> = Outcome<'kind-registered', {handle: KindHandle<Payload>}>;
export type KindNameTaken = Outcome<'kind-name-taken', {kind: string}>;

export type LaneFound = Outcome<'lane-found', {lane: Lane}>;
export type LaneEmpty = Outcome<'lane-empty'>;
export type LanesListed = Outcome<'lanes-listed', {lanes: Lane[]}>;

/** Why the outbox couldn't take a call at all */
export type OutboxUnavailable = OutboxNotStarted | StorageFull | StorageFailed;
/** The attempt a command waited for ended the operation */
export type EndedWhileWaiting = OperationSucceeded | OperationDropped;

export type EnqueueOutcome<Payload> =
  | OperationQueued<Payload>
  | OperationVersioned<Payload>
  | EndedWhileWaiting
  | TransitionRefused
  | CorrelationKeyEmpty
  | LaneKeyEmpty
  | PayloadInvalid
  | KeyTakenByOtherKind
  | OutboxFull
  | OutboxUnavailable;

export type HoldOutcome = OperationHeld | TransitionRefused | EndedWhileWaiting | OperationNotFound | OutboxUnavailable;
export type ReleaseOutcome =
  OperationReleased | TransitionRefused | EndedWhileWaiting | OperationNotFound | OutboxUnavailable;
export type DropOutcome = OperationDropped | TransitionRefused | OperationNotFound | OutboxUnavailable;
export type FindOutcome<Payload> = OperationFound<Payload> | OperationNotFound | OutboxNotStarted;
export type LaneOutcome = LaneFound | LaneEmpty | OutboxNotStarted;
export type LanesOutcome = LanesListed | OutboxNotStarted;
export type RegisterOutcome<Payload> = KindRegistered<Payload> | KindNameTaken | OutboxAlreadyStarted;
export type StartOutcome = OutboxStarted | OutboxAlreadyStarted | OutboxNotStarted | StorageFull | StorageFailed;

// Arguments

export type EnqueueRequest<Payload> = {
  payload: Payload;
  correlationKey?: string;
  laneKey?: string;
  expiresAfterMilliseconds?: number;
  attemptTimeoutMilliseconds?: number;
};

export type OutboxLogger = {
  info: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
  warn: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
  error: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
};

export type TimerId = number;

export type OutboxClock = {
  /** Server-corrected epoch milliseconds, for timestamps and expiry; may jump when the offset is corrected */
  getServerTime: () => number;
  /** Monotonic milliseconds, only for durations: backoff, attempt timeout, wake-ups */
  getStopwatchTime: () => number;
  setTimer: (callback: () => void, milliseconds: number) => TimerId;
  clearTimer: (timer: TimerId) => void;
};

export type OutboxConfiguration = {
  maxOperations?: number;
  backoff?: {minimumMilliseconds?: number; maximumMilliseconds?: number};
};

export type OutboxDependencies = {
  store: OutboxStore;
  clock: OutboxClock;
  /** For the backoff's jitter: a number from 0 up to, but not including, 1 */
  random: () => number;
  createId: () => string;
  /** Used as given: the caller adds the prefix, e.g. `getLogger('Outbox')` */
  logger: OutboxLogger;
  configuration?: OutboxConfiguration;
};

// Interfaces

export type KindHandle<Payload> = {
  /** A new operation, or a version of the one with the same correlation key; waits for a running attempt */
  enqueue: (request: EnqueueRequest<Payload>) => Promise<EnqueueOutcome<Payload>>;
  /** Only operations of this kind */
  find: (correlationKey: string) => FindOutcome<Payload>;
};

export type Outbox = {
  /** Kinds are registered before `start` */
  register: <Payload>(kind: Kind<Payload>) => RegisterOutcome<Payload>;
  /** After a storage failure, `start` may be called again */
  start: () => Promise<StartOutcome>;
  pause: () => void;
  /** Also resets the backoff */
  resume: () => void;
  /** Aborts the running attempts and answers the commands waiting for them `outbox-not-started` */
  stop: () => Promise<void>;
  /** Needs `queued`; waits for a running attempt */
  hold: (correlationKey: string) => Promise<HoldOutcome>;
  /** Needs `on-hold`; waits for a running attempt */
  release: (correlationKey: string) => Promise<ReleaseOutcome>;
  /**
   * Every unfinished state accepts it; never waits, and aborts a running attempt. When the kind's lane follows,
   * the operations of the kind behind it are dropped too, unless it was dead-lettered already.
   */
  drop: (correlationKey: string) => Promise<DropOutcome>;
  findByCorrelationKey: (correlationKey: string) => FindOutcome<unknown>;
  lane: (laneKey: string) => LaneOutcome;
  lanes: () => LanesOutcome;
  isStarted: () => boolean;
  isRunning: () => boolean;
};
