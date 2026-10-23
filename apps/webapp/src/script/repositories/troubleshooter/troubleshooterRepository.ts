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

import type {Clock} from '@enormora/clock/clock';
import {Maybe, Task, task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {ConnectionResult, ScanResult, TroubleshooterService} from './troubleshooterService';

export type DiagnosticResult<T> = {data: T; completedAt: number; durationMilliseconds: number};
export type TroubleshooterState = {
  running: 'idle' | 'connection' | 'scan';
  connection: Maybe<DiagnosticResult<ConnectionResult>>;
  scan: Maybe<DiagnosticResult<ScanResult>>;
  error: Maybe<Error>;
};
const MICROSECONDS_PER_MILLISECOND = 1_000;
const REPORT_INDENTATION = 2;

export const createTroubleshooterRepository = (service: TroubleshooterService, clock: Clock) => {
  const store = createStore<TroubleshooterState>(() => {
    return {running: 'idle', connection: Maybe.nothing(), scan: Maybe.nothing(), error: Maybe.nothing()};
  });
  const run = <T>(
    kind: 'connection' | 'scan',
    execute: () => Task<T, Error>,
    save: (value: DiagnosticResult<T>) => void,
  ): Task<T, Error> => {
    if (store.getState().running !== 'idle') {
      return task.reject(new Error('A diagnosis is already running'));
    }
    const startedAt = clock.currentMonotonicMicroseconds;
    store.setState({running: kind, error: Maybe.nothing()});
    return execute()
      .map(data => {
        const elapsed = clock.currentMonotonicMicroseconds - startedAt;
        save({
          data,
          completedAt: clock.currentUnixEpochMilliseconds,
          durationMilliseconds: Number(elapsed) / MICROSECONDS_PER_MILLISECOND,
        });
        store.setState({running: 'idle'});
        return data;
      })
      .mapRejected(error => {
        store.setState({running: 'idle', error: Maybe.just(error)});
        return error;
      });
  };
  return {
    store,
    testConnection: () => {
      return run('connection', service.testConnection, connection => {
        store.setState({connection: Maybe.just(connection)});
      });
    },
    runFullScan: () => {
      return run('scan', service.runFullScan, scan => {
        store.setState({scan: Maybe.just(scan)});
      });
    },
    getReport: (version: string): string => {
      const state = store.getState();
      return JSON.stringify(
        {
          simulated: true,
          version,
          generatedAt: clock.currentDate.toISOString(),
          connection: state.connection
            .map(value => {
              return [value];
            })
            .unwrapOr([]),
          scan: state.scan
            .map(value => {
              return [value];
            })
            .unwrapOr([]),
          includesMessagesOrCallContent: false,
        },
        (_key: string, value: unknown) => {
          return value;
        },
        REPORT_INDENTATION,
      );
    },
  };
};
export type TroubleshooterRepository = ReturnType<typeof createTroubleshooterRepository>;
