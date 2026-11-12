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

import type {LogAttributes, Logger} from './logger';
import {serializeArgs} from './util/StringUtil';

type LogdownOutput = Readonly<Record<keyof Logger, (...values: unknown[]) => void>>;

type LogdownAdapterOptions = {
  readonly output: LogdownOutput;
  readonly serializeForDesktop: boolean;
};

type LogMessageOptions = {
  readonly level: keyof Logger;
  readonly message: string;
  readonly attributes: LogAttributes | undefined;
};

export function createLogdownAdapter(options: LogdownAdapterOptions): Logger {
  const {output, serializeForDesktop} = options;

  function writeLog(options: LogMessageOptions): void {
    const {level, message, attributes} = options;
    const values = attributes === undefined ? [message] : [message, attributes];

    // Electron captures console text, so objects must reach it as serialized arguments.
    output[level](...(serializeForDesktop ? serializeArgs(values) : values));
  }

  return {
    debug(message: string, attributes?: LogAttributes): void {
      writeLog({level: 'debug', message, attributes});
    },
    info(message: string, attributes?: LogAttributes): void {
      writeLog({level: 'info', message, attributes});
    },
    warn(message: string, attributes?: LogAttributes): void {
      writeLog({level: 'warn', message, attributes});
    },
    error(message: string, attributes?: LogAttributes): void {
      writeLog({level: 'error', message, attributes});
    },
  };
}
