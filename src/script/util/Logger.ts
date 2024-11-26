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

import {LogFactory, Logger, Runtime} from '@wireapp/commons';

const LOGGER_NAMESPACE = '@wireapp/webapp';

function serializeArgs(args: any[]): any[] {
  return args.map(arg => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg));
}

function getLogger(name: string): Logger {
  const logger = LogFactory.getLogger(name, {
    namespace: LOGGER_NAMESPACE,
    separator: '/',
  });

  if (Runtime.isDesktopApp()) {
    return {
      ...logger,
      debug: (...args: any[]): void => {
        logger.debug(...serializeArgs(args));
      },
      error: (...args: any[]): void => {
        logger.error(...serializeArgs(args));
      },
      info: (...args: any[]): void => {
        logger.info(...serializeArgs(args));
      },
      log: (...args: any[]): void => {
        logger.log(...serializeArgs(args));
      },
      warn: (...args: any[]): void => {
        logger.warn(...serializeArgs(args));
      },
    };
  }

  return logger;
}

export {getLogger, LOGGER_NAMESPACE, Logger};
