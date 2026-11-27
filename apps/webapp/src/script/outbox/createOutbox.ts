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

import {isMatching, match, P} from 'ts-pattern';

import {createEngine, type Engine} from './createEngine';
import {resolveKind, type ResolvedKind, type Run} from './operationRules';
import {isInState, isOutcome} from './tagged';
import type {
  EnqueueOutcome,
  FindOutcome,
  Kind,
  KindHandle,
  Outbox,
  OutboxAlreadyStarted,
  OutboxDependencies,
  OutboxNotStarted,
  Outcome,
  RegisterOutcome,
  StartOutcome,
  State,
} from './types';

/** The engine exists exactly while the outbox is started */
type OutboxState = State<'idle'> | State<'starting'> | State<'started', {engine: Engine}>;

type OutboxPaused = Outcome<'outbox-paused'>;
type OutboxResumed = Outcome<'outbox-resumed'>;
type OutboxStopped = Outcome<'outbox-stopped'>;
type RememberedUntilStart = Outcome<'outbox-remembered-until-start'>;

const hasErrorName = isMatching({errorName: P.string});

/**
 * Holds what exists before `start` (the kinds and the wish to run) and hands everything else to an engine, which
 * exists from a successful `start` until `stop`. "Not started" is decided here, once, for every call.
 */
export function createOutbox(dependencies: OutboxDependencies): Outbox {
  const {logger} = dependencies;
  const kinds = new Map<string, ResolvedKind>();
  let outboxState: OutboxState = {state: 'idle'};
  let wish: Run = {state: 'paused'};

  /** Logs the call next to its outcome, and the name of the error if any; never the payload or the keys */
  function logged(call: string, attributes: Readonly<Record<string, unknown>> = {}) {
    return <Result extends {outcome: string}>(result: Result): Result => {
      const errorName = hasErrorName(result) ? {errorName: result.errorName} : {};
      logger.info(call, {...attributes, ...errorName, outcome: result.outcome});
      return result;
    };
  }

  function whenStarted<Result>(call: (engine: Engine) => Result): Result | OutboxNotStarted {
    return match(outboxState)
      .with({state: 'started'}, ({engine}) => {
        return call(engine);
      })
      .otherwise((): OutboxNotStarted => {
        return {outcome: 'outbox-not-started'};
      });
  }

  // The engine's payloads of a kind are the ones its own `parsePayload` returned
  function createHandle<Payload>(kind: ResolvedKind): KindHandle<Payload> {
    return {
      async enqueue(request) {
        const result = await whenStarted(async engine => {
          return engine.enqueue(kind, request);
        });
        return logged('enqueue', {kind: kind.name})(result) as EnqueueOutcome<Payload>;
      },
      find(correlationKey) {
        const findResult = whenStarted(engine => {
          return engine.findByCorrelationKey(correlationKey);
        });
        const isOfOtherKind = isOutcome('operation-found')(findResult) && findResult.operation.kind !== kind.name;
        return (isOfOtherKind ? {outcome: 'operation-not-found'} : findResult) as FindOutcome<Payload>;
      },
    };
  }

  function register<Payload>(kind: Kind<Payload>): RegisterOutcome<Payload> {
    return match(outboxState)
      .with({state: 'idle'}, (): RegisterOutcome<Payload> => {
        if (kinds.has(kind.name)) {
          return {outcome: 'kind-name-taken', kind: kind.name};
        }
        const resolved = resolveKind(kind);
        kinds.set(kind.name, resolved);
        return {outcome: 'kind-registered', handle: createHandle<Payload>(resolved)};
      })
      .otherwise((): OutboxAlreadyStarted => {
        return {outcome: 'outbox-already-started'};
      });
  }

  async function startEngine(): Promise<StartOutcome> {
    outboxState = {state: 'starting'};
    // The registrations are complete at `start`, so they are logged here: the names of the kinds only
    logger.info('register', {kinds: [...kinds.keys()]});
    const engine = createEngine(kinds, dependencies);
    const loadResult = await engine.load();
    if (!isOutcome('outbox-started')(loadResult)) {
      outboxState = {state: 'idle'};
      await engine.stop();
      return loadResult;
    }
    outboxState = {state: 'started', engine};
    // The wish is applied once loaded, so that a pause or a resume while loading counts
    if (isInState('running')(wish)) {
      logged('resume')(resume());
    }
    return loadResult;
  }

  async function start(): Promise<StartOutcome> {
    return match(outboxState)
      .with({state: 'idle'}, startEngine)
      .otherwise(async (): Promise<OutboxAlreadyStarted> => {
        return {outcome: 'outbox-already-started'};
      });
  }

  function pause(): OutboxPaused | RememberedUntilStart {
    wish = {state: 'paused'};
    return match(outboxState)
      .with({state: 'started'}, ({engine}): OutboxPaused => {
        engine.pause();
        return {outcome: 'outbox-paused'};
      })
      .otherwise((): RememberedUntilStart => {
        return {outcome: 'outbox-remembered-until-start'};
      });
  }

  function resume(): OutboxResumed | RememberedUntilStart {
    wish = {state: 'running'};
    return match(outboxState)
      .with({state: 'started'}, ({engine}): OutboxResumed => {
        engine.resume();
        return {outcome: 'outbox-resumed'};
      })
      .otherwise((): RememberedUntilStart => {
        return {outcome: 'outbox-remembered-until-start'};
      });
  }

  /** Leaves `started` before awaiting the engine, so the engine never receives a call after it was stopped */
  async function stop(): Promise<OutboxStopped | OutboxNotStarted> {
    wish = {state: 'paused'};
    return match(outboxState)
      .with({state: 'started'}, async ({engine}): Promise<OutboxStopped> => {
        outboxState = {state: 'idle'};
        await engine.stop();
        return {outcome: 'outbox-stopped'};
      })
      .otherwise(async (): Promise<OutboxNotStarted> => {
        return {outcome: 'outbox-not-started'};
      });
  }

  return {
    register,
    start: async () => {
      return logged('start')(await start());
    },
    pause: () => {
      logged('pause')(pause());
    },
    resume: () => {
      logged('resume')(resume());
    },
    stop: async () => {
      logged('stop')(await stop());
    },
    hold: async correlationKey => {
      return logged('hold')(
        await whenStarted(async engine => {
          return engine.hold(correlationKey);
        }),
      );
    },
    release: async correlationKey => {
      return logged('release')(
        await whenStarted(async engine => {
          return engine.release(correlationKey);
        }),
      );
    },
    deadLetter: async (correlationKey, options = {}) => {
      return logged('deadLetter')(
        await whenStarted(async engine => {
          return engine.deadLetter(correlationKey, options);
        }),
      );
    },
    delete: async (correlationKey, options = {}) => {
      return logged('delete')(
        await whenStarted(async engine => {
          return engine.delete(correlationKey, options);
        }),
      );
    },
    findByCorrelationKey: correlationKey => {
      return whenStarted(engine => {
        return engine.findByCorrelationKey(correlationKey);
      });
    },
    lane: laneKey => {
      return whenStarted(engine => {
        return engine.lane(laneKey);
      });
    },
    lanes: () => {
      return whenStarted(engine => {
        return engine.lanes();
      });
    },
    isStarted: () => {
      return isInState('started')(outboxState);
    },
    isRunning: () => {
      return isInState('started')(outboxState) && isInState('running')(wish);
    },
  };
}
