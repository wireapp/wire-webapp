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

import {createBrowserWebSocketConnection} from './createBrowserWebSocketConnection';
import {WebSocketConnectionEventType} from './createManagedWebSocketConnection';

type FakeBrowserWebSocketConnectionContext = {
  readonly addEventListenerCallList: readonly {type: WebSocketConnectionEventType; listener: () => void}[];
  readonly closeCallCount: () => number;
  readonly createWebSocketCallList: readonly string[];
  readonly fakeBrowserWebSocketConnection: {
    readonly readyState: number;
    readonly send: (message: string) => void;
    readonly close: () => void;
    readonly addEventListener: (type: WebSocketConnectionEventType, listener: () => void) => void;
    readonly removeEventListener: (type: WebSocketConnectionEventType, listener: () => void) => void;
  };
  readonly removeEventListenerCallList: readonly {type: WebSocketConnectionEventType; listener: () => void}[];
  readonly sentMessageList: readonly string[];
};

function createFakeBrowserWebSocketConnectionContext(): FakeBrowserWebSocketConnectionContext {
  const createWebSocketCallList: string[] = [];
  const sentMessageList: string[] = [];
  const addEventListenerCallList: {type: WebSocketConnectionEventType; listener: () => void}[] = [];
  const removeEventListenerCallList: {type: WebSocketConnectionEventType; listener: () => void}[] = [];
  let closeCallCount = 0;

  const fakeBrowserWebSocketConnection = {
    get readyState() {
      return 1;
    },

    send(message: string) {
      sentMessageList.push(message);
    },

    close() {
      closeCallCount += 1;
    },

    addEventListener(type: WebSocketConnectionEventType, listener: () => void) {
      addEventListenerCallList.push({type, listener});
    },

    removeEventListener(type: WebSocketConnectionEventType, listener: () => void) {
      removeEventListenerCallList.push({type, listener});
    },
  };

  return {
    addEventListenerCallList,
    closeCallCount() {
      return closeCallCount;
    },
    createWebSocketCallList,
    fakeBrowserWebSocketConnection,
    removeEventListenerCallList,
    sentMessageList,
  };
}

describe('createBrowserWebSocketConnection', () => {
  it('creates a transport that delegates to the injected WebSocket factory result', () => {
    const fakeBrowserWebSocketConnectionContext = createFakeBrowserWebSocketConnectionContext();
    const createWebSocketConnection = createBrowserWebSocketConnection({
      createWebSocket(connectionUrl) {
        fakeBrowserWebSocketConnectionContext.createWebSocketCallList.push(connectionUrl);

        return fakeBrowserWebSocketConnectionContext.fakeBrowserWebSocketConnection;
      },
    });
    const webSocketConnectionTransport = createWebSocketConnection('wss://example.test/socket');
    const listener = () => {
      return undefined;
    };

    webSocketConnectionTransport.send('hello');
    webSocketConnectionTransport.addEventListener('open', listener);
    webSocketConnectionTransport.removeEventListener('open', listener);
    webSocketConnectionTransport.close();

    expect(fakeBrowserWebSocketConnectionContext.createWebSocketCallList).toEqual(['wss://example.test/socket']);
    expect(webSocketConnectionTransport.readyState).toBe(1);
    expect(fakeBrowserWebSocketConnectionContext.sentMessageList).toEqual(['hello']);
    expect(fakeBrowserWebSocketConnectionContext.addEventListenerCallList).toEqual([{type: 'open', listener}]);
    expect(fakeBrowserWebSocketConnectionContext.removeEventListenerCallList).toEqual([{type: 'open', listener}]);
    expect(fakeBrowserWebSocketConnectionContext.closeCallCount()).toBe(1);
  });
});
