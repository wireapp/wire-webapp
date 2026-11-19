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

import type {BrowserLogPersistence} from './createBrowserLogPersistence';
import type {LoggingDependencies} from './createPinoLogging';
import {debugLoggingQueryParameterName, legacyDebugLoggingQueryParameterName} from './debugLoggingQueryParameterNames';
import {createConsoleOutput, type ConsoleLogOutput, type LogOutput} from './logOutput';

type InitializeLoggingOptions = {
  readonly clock: LoggingDependencies['clock'];
  readonly consoleOutput: ConsoleLogOutput;
  readonly locationSearch: string;
  readonly debugEnabled: boolean;
  readonly developerConsoleEnabled?: boolean;
  readonly shouldWriteConsoleFallback?: (() => boolean) | undefined;
  readonly storage: Maybe<Pick<Storage, 'setItem' | 'removeItem'>>;
  readonly configureLogging: (dependencies: Maybe<LoggingDependencies>) => void;
  readonly browserPersistenceEnabled: boolean;
  readonly desktopPersistenceOutput?: LogOutput | undefined;
  readonly createPersistenceOutput: () => Maybe<BrowserLogPersistence>;
};

export function initializeLogging(options: InitializeLoggingOptions): Maybe<BrowserLogPersistence> {
  const {
    clock,
    consoleOutput,
    locationSearch,
    debugEnabled,
    developerConsoleEnabled = true,
    shouldWriteConsoleFallback,
    storage,
    configureLogging,
    browserPersistenceEnabled,
    desktopPersistenceOutput,
    createPersistenceOutput,
  } = options;
  const queryParameters = new URLSearchParams(locationSearch);
  // Temporarily support enableLogging when debugLogging is absent. An empty value uses the config default.
  const namespace =
    queryParameters.get(debugLoggingQueryParameterName) ?? queryParameters.get(legacyDebugLoggingQueryParameterName);
  const defaultNamespaces = debugEnabled ? Maybe.just('*') : Maybe.nothing<string>();
  const namespaces = isNonEmptyString(namespace) ? Maybe.just(namespace) : defaultNamespaces;
  let persistence: Maybe<BrowserLogPersistence> = Maybe.nothing();
  if (browserPersistenceEnabled) {
    try {
      persistence = createPersistenceOutput();
    } catch {
      // Unsupported or inaccessible browser capabilities must never prevent startup or console output.
    }
  }

  const writeToConsole = createConsoleOutput(consoleOutput);
  const nativePersistence = Maybe.of(desktopPersistenceOutput);
  const useConsoleAsOnlyPersistence = nativePersistence.isNothing && shouldWriteConsoleFallback !== undefined;
  const persistenceOutput = useConsoleAsOnlyPersistence
    ? Maybe.just(writeToConsole)
    : nativePersistence.orElse(() => {
        return persistence.map(output => {
          return output.write;
        });
      });
  configureLogging(
    Maybe.just({
      clock,
      output: writeToConsole,
      shouldWriteToOutput(namespaceEnabled) {
        // A sole console persistence destination already writes every enabled record.
        return (
          !useConsoleAsOnlyPersistence &&
          (shouldWriteConsoleFallback?.() === true || (developerConsoleEnabled && namespaceEnabled))
        );
      },
      namespaces,
      persistenceOutput,
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
