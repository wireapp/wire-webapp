/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {clientConfig, serverConfig} from './config';
import {Server} from './Server';
import {logServerStartup} from './serverStartupLog';
import {formatDate} from './util/timeUtil';

const server = new Server(serverConfig, clientConfig);

function getUnhandledRejectionType(unhandledRejection: unknown): string {
  if (unhandledRejection instanceof Error) {
    return unhandledRejection.name;
  }
  if (unhandledRejection === null) {
    return 'null';
  }
  return typeof unhandledRejection;
}

server
  .start()
  .then(port => {
    logServerStartup(
      {
        port,
        serverConfiguration: serverConfig,
      },
      {
        logInformation: message => {
          console.info(`[${formatDate()}] ${message}`);
        },
      },
    );

    if (serverConfig.DEVELOPMENT) {
      require('opn')(serverConfig.APP_BASE);
    }
  })
  .catch((error: unknown) => {
    const errorOutput = error instanceof Error ? error.stack : String(error);

    console.error(`[${formatDate()}] ${errorOutput}`);
  });

process.on('uncaughtException', error =>
  console.error(`[${formatDate()}] Uncaught exception: ${error.message}`, error),
);
process.on('unhandledRejection', error =>
  console.error(`[${formatDate()}] Uncaught rejection "${getUnhandledRejectionType(error)}"`, error),
);
