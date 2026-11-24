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

export type OperationState = 'queued' | 'on-hold' | 'in-progress' | 'dead-lettered' | 'succeeded' | 'dropped';

/** Named like the outcome that reports it, so mapping between them is the identity */
export type Trigger =
  | 'operation-queued'
  | 'operation-versioned'
  | 'operation-held'
  | 'operation-released'
  | 'operation-dropped'
  | 'operation-dead-lettered'
  | 'operation-expired'
  | 'lane-dead-lettered'
  | 'lane-dropped'
  | 'attempt-started'
  | 'attempt-succeeded'
  | 'attempt-failed'
  | 'attempt-timed-out'
  | 'attempt-errored'
  | 'attempt-interrupted';

/** The one read-only view of an operation, for owners, `perform` and `onChanged` */
export type OperationView<Payload> = {
  id: string;
  kind: string;
  payload: Payload;
  correlationKey?: string;
  queuedAt: number;
  state: OperationState;
  /** Since the last enqueue (new or a version) */
  attempts: number;
};

// Store

/** The browser's quota reached; nothing changed */
export type StorageFull = {type: 'storage-full'};
/** Any other store error; nothing changed */
export type StorageFailed = {type: 'storage-failed'; errorName: string};

export type OperationSnapshot = {
  schemaVersion: number;
  id: string;
  /** The operation's n-th snapshot */
  seq: number;
  /** What led to this snapshot, and when */
  trigger: Trigger;
  at: number;
  kind: string;
  payload: unknown;
  correlationKey?: string;
  orderingKey?: string;
  /** Place in its lane */
  queuedSeq: number;
  /** Server time */
  queuedAt: number;
  state: OperationState;
  attempts: number;
  validUntil?: number;
  /** The enqueue's limits, when it passed them */
  expiresAfterMilliseconds?: number;
  performTimeoutMilliseconds?: number;
};

export type LoadOutcome =
  {type: 'snapshots-loaded'; operations: OperationSnapshot[]; quarantinedCount: number} | StorageFailed;
export type AppendOutcome = {type: 'snapshot-appended'} | StorageFull | StorageFailed;
export type RemoveOutcome = {type: 'snapshots-removed'} | StorageFailed;

export type OutboxStore = {
  /** The newest snapshot of every operation; an operation whose newest snapshot doesn't parse is deleted and counted */
  loadLatest: () => Promise<LoadOutcome>;
  append: (snapshot: OperationSnapshot) => Promise<AppendOutcome>;
  /** Deletes every snapshot of the operations */
  remove: (operationIds: string[]) => Promise<RemoveOutcome>;
};

// Kind

export type AttemptSucceeded = {type: 'attempt-succeeded'};
/** Not this time: the outbox retries, or gives up after `maxAttempts` */
export type AttemptFailed = {type: 'attempt-failed'};
/** Stop until someone releases it, e.g. to ask the user */
export type HoldUntilReleased = {type: 'operation-held'};
/** Given up; kept until enqueued again or dropped */
export type GiveUpDeadLettered = {type: 'operation-dead-lettered'};
/** Given up and forgotten */
export type GiveUpDropped = {type: 'operation-dropped'};

/** How an attempt went; `operation-held` puts it on hold; a final failure gives up at once, as dead-lettered or dropped */
export type PerformOutcome = AttemptSucceeded | AttemptFailed | HoldUntilReleased | GiveUpDeadLettered | GiveUpDropped;

export type Kind<Payload> = {
  name: string;
  /** May throw; called at enqueue and at load */
  parsePayload: (value: unknown) => Payload;
  /** Outer limit from enqueue; then `operation-expired`, and given up */
  expiresAfterMilliseconds?: number;
  /** Limit on one perform; then aborted, `attempt-timed-out` */
  performTimeoutMilliseconds?: number;
  /** Attempts before giving up; default 5 */
  maxAttempts?: number;
  /** After `maxAttempts` or at expiry; default 'dead-letter' */
  whenGivenUp?: 'dead-letter' | 'drop';
  /**
   * The operations of this kind behind one given up in its lane: carry on, or end the same way; default 'continues'.
   * Operations of other kinds in the lane carry on either way.
   */
  laneWhenGivenUp?: 'continues' | 'follows';
  /** A rejection or a throw is `attempt-errored` */
  perform: (operation: OperationView<Payload>, signal: AbortSignal) => Promise<PerformOutcome>;
  /** Fire and forget; a throw is logged */
  onChanged?: (operation: OperationView<Payload>) => void;
};

// Outcomes

/** Every outcome about an operation carries it: as the call left it, or as it ended */
type OperationOutcome<Type extends string, Payload = unknown> = {type: Type; operation: OperationView<Payload>};

/** The attempt a command waited for went through */
export type OperationSucceeded = OperationOutcome<'operation-succeeded'>;
/** Given up and forgotten */
export type OperationDropped = OperationOutcome<'operation-dropped'>;
/** No unfinished operation has the key */
export type OperationNotFound = {type: 'operation-not-found'};

/** Before `start`: the operations aren't loaded yet */
export type OutboxNotStarted = {type: 'outbox-not-started'};

/** Why the outbox couldn't take a call at all */
export type OutboxUnavailable = OutboxNotStarted | StorageFull | StorageFailed;

export type FindOutcome<Payload> = OperationOutcome<'operation-found', Payload> | OperationNotFound | OutboxNotStarted;

export type LaneOutcome = {type: 'lane-found'; lane: Lane} | {type: 'lane-empty'} | OutboxNotStarted;

export type LanesOutcome = {type: 'lanes-listed'; lanes: Lane[]} | OutboxNotStarted;

export type OutboxAlreadyStarted = {type: 'outbox-already-started'};

export type RegisterOutcome<Payload> =
  | {type: 'kind-registered'; handle: KindHandle<Payload>}
  | {type: 'kind-name-taken'; kind: string}
  | OutboxAlreadyStarted;

export type StartOutcome = {type: 'outbox-started'} | OutboxAlreadyStarted | StorageFull | StorageFailed;

export type HoldOutcome =
  | OperationOutcome<'operation-held'>
  | OperationOutcome<'operation-not-queued'>
  | OperationSucceeded
  | OperationDropped
  | OperationNotFound
  | OutboxUnavailable;

export type ReleaseOutcome =
  | OperationOutcome<'operation-released'>
  | OperationOutcome<'operation-not-on-hold'>
  | OperationSucceeded
  | OperationDropped
  | OperationNotFound
  | OutboxUnavailable;

export type DropOutcome = OperationDropped | OperationNotFound | OutboxUnavailable;

export type EnqueueOutcome<Payload> =
  | OperationOutcome<'operation-queued', Payload>
  | OperationOutcome<'operation-versioned', Payload>
  | OperationSucceeded
  | OperationDropped
  | {type: 'correlation-key-empty'}
  | {type: 'ordering-key-empty'}
  /** The kind's `parsePayload` threw */
  | {type: 'payload-invalid'; errorName: string}
  | {type: 'key-taken-by-other-kind'; kind: string}
  /** `maxOperations` reached */
  | {type: 'outbox-full'}
  | OutboxUnavailable;

// Arguments

export type EnqueueRequest<Payload> = {
  payload: Payload;
  correlationKey?: string;
  orderingKey?: string;
  expiresAfterMilliseconds?: number;
  performTimeoutMilliseconds?: number;
};

export type OutboxLogger = {
  info: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
  warn: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
  error: (message: string, attributes?: Readonly<Record<string, unknown>>) => void;
};

export type OutboxDependencies = {
  store: OutboxStore;
  getServerTime: () => number;
  /** For the backoff's jitter; defaults to `Math.random` */
  random?: () => number;
  /** Used as given: the caller adds the prefix, e.g. `getLogger('Outbox')` */
  logger: OutboxLogger;
  configuration?: {maxOperations?: number; backoff?: {minimumMilliseconds?: number; maximumMilliseconds?: number}};
};

/** The first operation of an ordering key that may still go out, and how many wait behind it */
export type Lane = {orderingKey: string; status: 'moving' | 'blocked'; first: OperationView<unknown>; size: number};

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
  start: (dependencies: OutboxDependencies) => Promise<StartOutcome>;
  pause: () => void;
  /** Also resets the backoff */
  resume: () => void;
  stop: () => Promise<void>;
  /** Needs `queued`; waits for a running attempt */
  hold: (correlationKey: string) => Promise<HoldOutcome>;
  /** Needs `on-hold`; waits for a running attempt */
  release: (correlationKey: string) => Promise<ReleaseOutcome>;
  /** Never refused: every unfinished state accepts it; aborts a running attempt */
  drop: (correlationKey: string) => Promise<DropOutcome>;
  findByCorrelationKey: (correlationKey: string) => FindOutcome<unknown>;
  lane: (orderingKey: string) => LaneOutcome;
  lanes: () => LanesOutcome;
  isStarted: () => boolean;
  isRunning: () => boolean;
};
