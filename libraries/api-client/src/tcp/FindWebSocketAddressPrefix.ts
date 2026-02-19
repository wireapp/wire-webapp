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

import PCancelable from 'p-cancelable';
import pTimeout from 'p-timeout';
import {Task, task} from 'true-myth';

export type FindWebSocketAddressPrefixOptions = {
  baseUrl: string;
  queryString: string;
  webSocket: typeof WebSocket;
  connectionTimeoutInMilliseconds: number;
};

function tryToEstablishWebSocketConnection(webSocket: typeof WebSocket, websocketUrl: string): PCancelable<void> {
  return new PCancelable<void>((resolve, reject, onCancel) => {
    const testSocket = new webSocket(websocketUrl);
    onCancel(() => {
      testSocket.close();
    });
    testSocket.onopen = () => {
      testSocket.close();
      resolve();
    };
    testSocket.onerror = () => {
      reject();
    };
  });
}

export function findWebSocketAddressPrefix(dependencies: FindWebSocketAddressPrefixOptions): Task<void, unknown> {
  const {baseUrl, queryString, webSocket, connectionTimeoutInMilliseconds} = dependencies;

  const websocketUrl = `${baseUrl}/websocket?${queryString}`;

  const timeoutPromise = pTimeout(tryToEstablishWebSocketConnection(webSocket, websocketUrl), {
    milliseconds: connectionTimeoutInMilliseconds,
  });

  return task.fromPromise(timeoutPromise);
}
