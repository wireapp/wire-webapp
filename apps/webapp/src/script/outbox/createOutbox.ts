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

import {createEngine, type Engine} from './createEngine';
import type {EnqueueOutcome, FindOutcome, Kind, KindHandle, Outbox, OutboxNotStarted} from './types';

const NOT_STARTED: OutboxNotStarted = {type: 'outbox-not-started'};

/**
 * Holds what exists before `start` (the kinds and the wish to run) and hands everything else to an engine,
 * which exists from a successful `start` until `stop`.
 */
export function createOutbox(): Outbox {
  const kinds = new Map<string, Kind<unknown>>();
  let engine: Engine | undefined;
  let isStarting = false;
  let wantsToRun = false;
  /** The last of `pause` and `resume` called before `start`, which couldn't be logged yet */
  let wishBeforeStart: 'pause' | 'resume' | undefined;

  /** Calls the engine, or answers `fallback` before `start` */
  function whenStarted<Outcome, Fallback>(call: (started: Engine) => Outcome, fallback: Fallback): Outcome | Fallback {
    return engine === undefined ? fallback : call(engine);
  }

  function createHandle<Payload>(kind: Kind<Payload>): KindHandle<Payload> {
    return {
      async enqueue(request) {
        // The engine's payloads are the ones `parsePayload` of this kind returned
        const outcome = await whenStarted(started => {
          return started.enqueue(kind as Kind<unknown>, request);
        }, NOT_STARTED);
        return outcome as EnqueueOutcome<Payload>;
      },
      find(correlationKey) {
        const outcome = whenStarted(started => {
          return started.findByCorrelationKey(correlationKey);
        }, NOT_STARTED);
        const isOfOtherKind = outcome.type === 'operation-found' && outcome.operation.kind !== kind.name;
        return (isOfOtherKind ? {type: 'operation-not-found'} : outcome) as FindOutcome<Payload>;
      },
    };
  }

  return {
    register(kind) {
      if (engine !== undefined || isStarting) {
        return {type: 'outbox-already-started'};
      }
      if (kinds.has(kind.name)) {
        return {type: 'kind-name-taken', kind: kind.name};
      }
      kinds.set(kind.name, kind as Kind<unknown>);
      return {type: 'kind-registered', handle: createHandle(kind)};
    },

    async start(dependencies) {
      if (engine !== undefined || isStarting) {
        return {type: 'outbox-already-started'};
      }
      isStarting = true;
      // There is no logger before `start`, so the registrations are logged now: the names of the kinds only
      dependencies.logger.info('register', {kinds: [...kinds.keys()]});
      const candidate = createEngine(kinds, dependencies);
      const outcome = await candidate.load();
      isStarting = false;
      if (outcome.type !== 'outbox-started') {
        await candidate.stop();
        return outcome;
      }
      engine = candidate;
      if (wishBeforeStart !== undefined) {
        dependencies.logger.info(wishBeforeStart, {outcome: 'outbox-remembered-until-start'});
        wishBeforeStart = undefined;
      }
      if (wantsToRun) {
        candidate.resume();
      }
      return outcome;
    },

    pause() {
      wantsToRun = false;
      wishBeforeStart = engine === undefined ? 'pause' : undefined;
      engine?.pause();
    },

    resume() {
      wantsToRun = true;
      wishBeforeStart = engine === undefined ? 'resume' : undefined;
      engine?.resume();
    },

    async stop() {
      await engine?.stop();
      engine = undefined;
      wantsToRun = false;
    },

    async hold(correlationKey) {
      return whenStarted(started => {
        return started.hold(correlationKey);
      }, NOT_STARTED);
    },

    async release(correlationKey) {
      return whenStarted(started => {
        return started.release(correlationKey);
      }, NOT_STARTED);
    },

    async drop(correlationKey) {
      return whenStarted(started => {
        return started.drop(correlationKey);
      }, NOT_STARTED);
    },

    findByCorrelationKey: correlationKey => {
      return whenStarted(started => {
        return started.findByCorrelationKey(correlationKey);
      }, NOT_STARTED);
    },
    lane: orderingKey => {
      return whenStarted(started => {
        return started.lane(orderingKey);
      }, NOT_STARTED);
    },
    lanes: () => {
      return whenStarted(started => {
        return started.lanes();
      }, NOT_STARTED);
    },
    isStarted: () => {
      return engine !== undefined;
    },
    isRunning: () => {
      return engine !== undefined && wantsToRun;
    },
  };
}
