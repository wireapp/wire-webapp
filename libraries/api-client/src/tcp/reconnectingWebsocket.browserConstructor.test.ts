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

import {createPartysocketCompatibleWebSocketConstructor} from './reconnectingWebsocket';

describe('createPartysocketCompatibleWebSocketConstructor', () => {
  it('preserves an undefined constructor so browser builds can use the global WebSocket fallback', () => {
    const constructorForPartysocket = createPartysocketCompatibleWebSocketConstructor(undefined);

    expect(constructorForPartysocket).toBeUndefined();
  });

  it('does not wrap the browser global WebSocket constructor', () => {
    const originalWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');

    class BrowserWebSocket {}

    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: BrowserWebSocket,
    });

    try {
      const constructorForPartysocket = createPartysocketCompatibleWebSocketConstructor(
        BrowserWebSocket as unknown as typeof globalThis.WebSocket,
      );

      expect(constructorForPartysocket).toBe(BrowserWebSocket);
    } finally {
      if (originalWebSocketDescriptor) {
        Object.defineProperty(globalThis, 'WebSocket', originalWebSocketDescriptor);
      } else {
        delete (globalThis as Partial<typeof globalThis>).WebSocket;
      }
    }
  });
});
