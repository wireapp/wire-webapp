/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {isNonEmptyString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import type {BufferedLogOutput} from './createBufferedLogOutput';
import type {LoggingDependencies} from './createPinoLogging';
import {createConsoleOutput, type ConsoleLogOutput} from './logOutput';

import {persistentBrowserLogsFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import type {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';

type EnableLoggingOptions = {
  readonly clock: LoggingDependencies['clock'];
  readonly consoleOutput: ConsoleLogOutput;
  readonly locationSearch: string;
  readonly debugEnabled: boolean;
  readonly storage: Maybe<Pick<Storage, 'setItem' | 'removeItem'>>;
  readonly configureLogging: (dependencies: Maybe<LoggingDependencies>) => void;
  readonly startupFeatureToggles: StartupFeatureToggles;
  readonly isElectron: boolean;
  readonly createPersistenceOutput: () => Maybe<BufferedLogOutput>;
};

type BrowserLogPersistenceSelection = Pick<EnableLoggingOptions, 'isElectron' | 'startupFeatureToggles'>;

function isBrowserLogPersistenceEnabled(options: BrowserLogPersistenceSelection): boolean {
  const {isElectron, startupFeatureToggles} = options;

  // Desktop already persists WebView console output through its native logger.
  return !isElectron && startupFeatureToggles.isFeatureToggleEnabled(persistentBrowserLogsFeatureToggleName);
}

export function enableLogging(options: EnableLoggingOptions): Maybe<BufferedLogOutput> {
  const {
    clock,
    consoleOutput,
    locationSearch,
    debugEnabled,
    storage,
    configureLogging,
    startupFeatureToggles,
    isElectron,
    createPersistenceOutput,
  } = options;
  const namespace = new URLSearchParams(locationSearch).get('enableLogging');
  const defaultNamespaces = debugEnabled ? Maybe.just('*') : Maybe.nothing<string>();
  const namespaces = isNonEmptyString(namespace) ? Maybe.just(namespace) : defaultNamespaces;
  let persistence: Maybe<BufferedLogOutput> = Maybe.nothing();
  if (isBrowserLogPersistenceEnabled({isElectron, startupFeatureToggles})) {
    try {
      persistence = createPersistenceOutput();
    } catch {
      // Unsupported or inaccessible browser capabilities must never prevent startup or console output.
    }
  }

  configureLogging(
    Maybe.just({
      clock,
      output: createConsoleOutput(consoleOutput),
      namespaces,
      persistenceOutput: persistence.map(output => {
        return output.write;
      }),
    }),
  );

  // Preserve main's debug storage setting for reloads and the separate redux-logdown consumer.
  try {
    if (storage.isJust) {
      if (namespaces.isJust) {
        storage.value.setItem('debug', namespaces.value);
      } else {
        storage.value.removeItem('debug');
      }
    }
  } catch {
    // Logging configuration must also work when storage is unavailable.
  }

  return persistence;
}
