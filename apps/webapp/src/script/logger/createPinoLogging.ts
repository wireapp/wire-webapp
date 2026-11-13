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
import {isString} from '@sindresorhus/is';
import type {Logger as PinoLogger} from 'pino';
import {levels, pino} from 'pino/browser';
import {errWithCause} from 'pino-std-serializers';
import {Maybe} from 'true-myth';

import type {LogAttributes, Logger} from './logger';
import {encodeLogOutput, type LogOutput} from './logOutput';

export type LoggingDependencies = {
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly output: LogOutput;
  readonly namespaces: Maybe<string>;
  readonly persistenceOutput: Maybe<LogOutput>;
};

type NamespaceRule = {readonly matches: (component: string) => boolean; readonly enabled: boolean};
type ComponentLogger = {readonly root: PinoLogger; readonly logger: PinoLogger};
type Logging = {
  readonly getLogger: (component: string) => Logger;
  readonly configure: (dependencies: Maybe<LoggingDependencies>) => void;
};

const maximumNamespaceConfigurationLength = 4096;
const maximumNamespaceRuleCount = 64;
const maximumNamespacePatternLength = 256;

function isSupportedLogLevel(level: unknown): level is keyof Logger {
  return level === 'debug' || level === 'info' || level === 'warn' || level === 'error';
}

function compileNamespacePattern(pattern: string): NamespaceRule['matches'] {
  const segments = pattern.split('*');

  function matches(component: string): boolean {
    let position = 0;

    return segments.every((segment, index) => {
      if (segments.length === 1) {
        return component === segment;
      }

      if (index === 0) {
        position = segment.length;

        return component.startsWith(segment);
      }

      if (index === segments.length - 1) {
        return component.endsWith(segment) && component.length - segment.length >= position;
      }

      const foundAt = component.indexOf(segment, position);
      position = foundAt + segment.length;

      return foundAt !== -1;
    });
  }

  return matches;
}

function compileNamespaces(namespaces: string): readonly NamespaceRule[] {
  // Reject the entire configuration rather than accidentally dropping an exclusion.
  if (namespaces.length > maximumNamespaceConfigurationLength || /\p{Cc}/u.test(namespaces)) {
    return [];
  }

  const patterns = namespaces.split(',').map(namespace => {
    return namespace.trim();
  });
  if (
    patterns.length > maximumNamespaceRuleCount ||
    patterns.some(pattern => {
      return pattern === '-' || pattern.length > maximumNamespacePatternLength;
    })
  ) {
    return [];
  }

  return patterns
    .filter(pattern => {
      return pattern.length > 0;
    })
    .map(pattern => {
      const enabled = !pattern.startsWith('-');

      return {matches: compileNamespacePattern(enabled ? pattern : pattern.slice(1)), enabled};
    });
}

export function createPinoLogging(initialDependencies: Maybe<LoggingDependencies>): Logging {
  let root: Maybe<PinoLogger> = Maybe.nothing();
  let namespaceRules: readonly NamespaceRule[] = [];
  let persistenceEnabled = false;

  function isConsoleEnabled(component: string): boolean {
    return namespaceRules.reduce((previous, rule) => {
      return rule.matches(component) ? rule.enabled : previous;
    }, false);
  }

  function configure(dependencies: Maybe<LoggingDependencies>): void {
    persistenceEnabled = dependencies.match({
      Just(configuration) {
        return configuration.persistenceOutput.isJust;
      },
      Nothing() {
        return false;
      },
    });
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
          write(record) {
            const structuredRecord = record as Readonly<Record<string, unknown>>;
            const level = levels.labels[Number(structuredRecord['level'])];
            if (isSupportedLogLevel(level)) {
              // Every destination receives the same sanitized JSON line, never raw Pino objects.
              const line = encodeLogOutput(structuredRecord);
              const component = structuredRecord['component'];
              if (isString(component) && isConsoleEnabled(component)) {
                try {
                  configuration.output(line, level);
                } catch {
                  // Console failure must not prevent persistence of the same sanitized record.
                }
              }

              if (configuration.persistenceOutput.isJust) {
                configuration.persistenceOutput.value(line, level);
              }
            }
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
            // Persistence must reach sanitization even when console namespace filtering is disabled.
            const enabled = persistenceEnabled || isConsoleEnabled(component);
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
