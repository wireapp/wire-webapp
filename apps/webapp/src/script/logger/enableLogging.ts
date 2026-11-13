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

import {createConsoleLogSink, type ConsoleLogOutput} from './consoleLogSink';
import type {LoggingDependencies} from './structuredLogger';

type EnableLoggingOptions = {
  readonly clock: LoggingDependencies['clock'];
  readonly consoleOutput: ConsoleLogOutput;
  readonly locationSearch: string;
  readonly configureLogging: (dependencies: Maybe<LoggingDependencies>) => void;
};

export function enableLogging(options: EnableLoggingOptions): void {
  const {clock, consoleOutput, locationSearch, configureLogging} = options;
  const namespace = new URLSearchParams(locationSearch).get('enableLogging');
  const namespaces = isNonEmptyString(namespace) ? Maybe.just(namespace) : Maybe.nothing<string>();

  configureLogging(
    Maybe.just({
      clock,
      sinks: [createConsoleLogSink({output: consoleOutput})],
      namespaces,
    }),
  );
}
