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
import {createStore, type StoreApi} from 'zustand/vanilla';

import type {ConnectionTestProgress} from '@wireapp/avs';

import type {ConnectionResult, ScanResult, TroubleshooterService} from './troubleshooterService';

export type DiagnosticResult<T> = {data: T; completedAt: number; durationMilliseconds: number};
export type TroubleshooterState = {
  running: 'idle' | 'connection' | 'scan' | 'resetting';
  connection: Maybe<DiagnosticResult<ConnectionResult>>;
  connectionProgress: Partial<Record<ConnectionTestProgress['step'], ConnectionTestProgress>>;
  scan: Maybe<DiagnosticResult<ScanResult>>;
  error: Maybe<Error>;
};
export type TroubleshooterRepository = {
  store: StoreApi<TroubleshooterState>;
  testConnection: () => Task<ConnectionResult, Error>;
  runFullScan: () => Task<ScanResult, Error>;
  getReport: (version: string) => string;
  reset: () => void;
};
const MICROSECONDS_PER_MILLISECOND = 1_000;
const REPORT_INDENTATION = 2;

export const createTroubleshooterRepository = (
  service: TroubleshooterService,
  clock: Clock,
): TroubleshooterRepository => {
  const store = createStore<TroubleshooterState>(() => {
    return {
      running: 'idle',
      connection: Maybe.nothing(),
      connectionProgress: {},
      scan: Maybe.nothing(),
      error: Maybe.nothing(),
    };
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
        if (store.getState().running === kind) {
          const elapsed = clock.currentMonotonicMicroseconds - startedAt;
          save({
            data,
            completedAt: clock.currentUnixEpochMilliseconds,
            durationMilliseconds: Number(elapsed) / MICROSECONDS_PER_MILLISECOND,
          });
        }
        store.setState({running: 'idle'});
        return data;
      })
      .mapRejected(error => {
        const reportError = store.getState().running === kind;
        store.setState({running: 'idle', error: reportError ? Maybe.just(error) : Maybe.nothing()});
        return error;
      });
  };
  return {
    store,
    reset: () => {
      const running = store.getState().running === 'idle' ? 'idle' : 'resetting';
      store.setState({...store.getInitialState(), running});
    },
    testConnection: () => {
      return run(
        'connection',
        () => {
          store.setState({connection: Maybe.nothing(), connectionProgress: {}});
          return service.testConnection(progress => {
            if (store.getState().running !== 'connection') {
              return;
            }
            store.setState(state => {
              return {connectionProgress: {...state.connectionProgress, [progress.step]: progress}};
            });
          });
        },
        connection => {
          store.setState({connection: Maybe.just(connection)});
        },
      );
    },
    runFullScan: () => {
      return run(
        'scan',
        () => {
          store.setState({scan: Maybe.nothing()});
          return service.runFullScan();
        },
        scan => {
          store.setState({scan: Maybe.just(scan)});
        },
      );
    },
    getReport: (version: string): string => {
      const state = store.getState();
      return JSON.stringify(
        {
          simulated:
            state.scan
              .map(scan => {
                return scan.data.report === undefined;
              })
              .unwrapOr(true) &&
            state.connection
              .map(connection => {
                return 'route' in connection.data;
              })
              .unwrapOr(true),
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
