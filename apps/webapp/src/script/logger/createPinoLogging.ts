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
import type {Logger as PinoLogger} from 'pino';
import {pino} from 'pino/browser';
import {errWithCause} from 'pino-std-serializers';
import {Maybe} from 'true-myth';

import type {LogAttributes, Logger} from './logger';

export type LogOutput = (record: Readonly<Record<string, unknown>>) => void;
export type LoggingDependencies = {
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly output: LogOutput;
  readonly namespaces: Maybe<string>;
};

type NamespaceRule = {readonly pattern: RegExp; readonly enabled: boolean};
type ComponentLogger = {readonly root: PinoLogger; readonly logger: PinoLogger};
type Logging = {
  readonly getLogger: (component: string) => Logger;
  readonly configure: (dependencies: Maybe<LoggingDependencies>) => void;
};

function compileNamespaces(namespaces: string): readonly NamespaceRule[] {
  return namespaces.split(',').flatMap(namespace => {
    const trimmed = namespace.trim();
    const enabled = !trimmed.startsWith('-');
    const pattern = enabled ? trimmed : trimmed.slice(1);
    try {
      return [{pattern: new RegExp(`^${pattern.replace(/\*/gu, '.*?')}$`), enabled}];
    } catch {
      return [];
    }
  });
}

export function createPinoLogging(initialDependencies: Maybe<LoggingDependencies>): Logging {
  let root: Maybe<PinoLogger> = Maybe.nothing();
  let namespaceRules: readonly NamespaceRule[] = [];

  function configure(dependencies: Maybe<LoggingDependencies>): void {
    namespaceRules = dependencies
      .map(configuration => {
        return configuration.namespaces.map(compileNamespaces).unwrapOr([]);
      })
      .unwrapOr([]);
    root = dependencies.map(configuration => {
      return pino({
        level: 'debug',
        timestamp() {
          return configuration.clock.currentUnixEpochMilliseconds;
        },
        serializers: {error: errWithCause, err: errWithCause},
        // Keep provider request/configuration objects out of error diagnostics, including toJSON projections.
        redact: {
          paths: [
            'error.request',
            'error.config',
            'error.response',
            'error.toJSON',
            'err.request',
            'err.config',
            'err.response',
            'err.toJSON',
          ],
          remove: true,
        },
        browser: {
          serialize: true,
          write(record: object): void {
            configuration.output(record as Readonly<Record<string, unknown>>);
          },
        },
      });
    });
  }

  configure(initialDependencies);

  function getLogger(component: string): Logger {
    let componentLogger: Maybe<ComponentLogger> = Maybe.nothing();

    function createMethod(level: keyof Logger): Logger['debug'] {
      function log(message: string, attributes?: LogAttributes): void {
        try {
          if (root.isNothing) {
            return;
          }
          if (componentLogger.isNothing || componentLogger.value.root !== root.value) {
            const enabled = namespaceRules.reduce((previous, rule) => {
              return rule.pattern.test(component) ? rule.enabled : previous;
            }, false);
            componentLogger = Maybe.just({
              root: root.value,
              logger: root.value.child({component}, {level: enabled ? 'debug' : 'silent'}),
            });
          }
          if (componentLogger.isNothing || !componentLogger.value.logger.isLevelEnabled(level)) {
            return;
          }

          // On a metadata collision, retain the complete attribute object under "attributes".
          const fields = attributes ?? {};
          const conflicts = ['level', 'time', 'component', 'msg', 'toJSON'].some(key => {
            return Object.hasOwn(fields, key);
          });
          componentLogger.value.logger[level](conflicts ? {attributes: fields} : {...fields}, message);
        } catch {
          // Serialization and output failures must not affect the application or recursively log.
        }
      }

      return log;
    }

    return {
      debug: createMethod('debug'),
      info: createMethod('info'),
      warn: createMethod('warn'),
      error: createMethod('error'),
    };
  }

  return {getLogger, configure};
}
