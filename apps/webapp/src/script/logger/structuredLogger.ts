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
import {Maybe} from 'true-myth';

import type {LogAttributes, Logger} from './logger';

export type LogRecord = {
  readonly timestamp: number;
  readonly level: keyof Logger;
  readonly component: string;
  readonly message: string;
  readonly attributes: Maybe<LogAttributes>;
};

export type LogSink = (record: LogRecord) => void;

export type LoggingDependencies = {
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly sinks: readonly LogSink[];
  readonly namespaces: Maybe<string>;
};

type NamespaceRule = {
  readonly enabled: boolean;
  readonly pattern: RegExp;
};

type Logging = {
  readonly getLogger: (component: string) => Logger;
  readonly configure: (dependencies: Maybe<LoggingDependencies>) => void;
};

function compileNamespaceRules(namespaces: string): readonly NamespaceRule[] {
  const rules: NamespaceRule[] = [];

  for (const namespace of namespaces.split(',')) {
    const trimmedNamespace = namespace.trim();
    const enabled = !trimmedNamespace.startsWith('-');
    const pattern = enabled ? trimmedNamespace : trimmedNamespace.slice(1);

    try {
      // Preserve Logdown's anchored patterns, wildcard expansion, and last-match precedence.
      rules.push({enabled, pattern: new RegExp(`^${pattern.replace(/\*/gu, '.*?')}$`)});
    } catch {
      // Invalid external configuration must not break application startup.
    }
  }

  return rules;
}

export function createLogging(initialDependencies: Maybe<LoggingDependencies>): Logging {
  let loggingDependencies = initialDependencies;
  let namespaceRules: readonly NamespaceRule[] = [];

  function configure(dependencies: Maybe<LoggingDependencies>): void {
    loggingDependencies = dependencies;
    namespaceRules = dependencies
      .map(configuration => {
        return compileNamespaceRules(configuration.namespaces.unwrapOr('*'));
      })
      .unwrapOr([]);
  }

  configure(initialDependencies);

  function getLogger(component: string): Logger {
    function createLogMethod(level: keyof Logger): Logger['debug'] {
      function writeLog(message: string, attributes?: LogAttributes): void {
        let enabled = false;
        for (const rule of namespaceRules) {
          if (rule.pattern.test(component)) {
            enabled = rule.enabled;
          }
        }
        if (!enabled || loggingDependencies.isNothing) {
          return;
        }

        const {clock, sinks} = loggingDependencies.value;
        const record: LogRecord = {
          timestamp: clock.currentUnixEpochMilliseconds,
          level,
          component,
          message,
          attributes: Maybe.of(attributes),
        };
        for (const sink of sinks) {
          try {
            sink(record);
          } catch {
            // Logging output must never interrupt application logic or recursively report itself.
          }
        }
      }

      return writeLog;
    }

    return {
      debug: createLogMethod('debug'),
      info: createLogMethod('info'),
      warn: createLogMethod('warn'),
      error: createLogMethod('error'),
    };
  }

  return {getLogger, configure};
}
