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

jest.mock('../utils/backFromSleepHandler/backFromSleepHandler');

import {onBackFromSleep} from '../utils/backFromSleepHandler/backFromSleepHandler';

import {ReconnectingWebsocket, WEBSOCKET_STATE} from './reconnectingWebsocket';

const mockedOnBackFromSleep = jest.mocked(onBackFromSleep);

describe('ReconnectingWebsocket back from sleep', () => {
  let sleepWakeCallback: (() => void) | undefined;

  beforeEach(() => {
    sleepWakeCallback = undefined;
    mockedOnBackFromSleep.mockImplementation(({callback}) => {
      sleepWakeCallback = callback;
      return jest.fn();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers onBackFromSleep without an isDisconnected gate', () => {
    new ReconnectingWebsocket(async () => 'ws://localhost');

    expect(mockedOnBackFromSleep).toHaveBeenCalledTimes(1);
    expect(mockedOnBackFromSleep.mock.calls[0][0].isDisconnected).toBeUndefined();
  });

  it('forces reconnect when waking with an OPEN zombie socket', () => {
    const RWS = new ReconnectingWebsocket(async () => 'ws://localhost');
    const reconnect = jest.fn();

    RWS['socket'] = {
      readyState: WEBSOCKET_STATE.OPEN,
      reconnect,
    } as never;

    expect(sleepWakeCallback).toBeDefined();
    sleepWakeCallback!();

    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(RWS['sleepReconnectPending']).toBe(true);
  });

  it('forces reconnect when waking with a CLOSED socket', () => {
    const RWS = new ReconnectingWebsocket(async () => 'ws://localhost');
    const reconnect = jest.fn();

    RWS['socket'] = {
      readyState: WEBSOCKET_STATE.CLOSED,
      reconnect,
    } as never;

    sleepWakeCallback!();

    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect when the WebSocket instance does not exist', () => {
    new ReconnectingWebsocket(async () => 'ws://localhost');

    expect(() => sleepWakeCallback!()).not.toThrow();
  });

  it('logs reconnect completion after a sleep-initiated reconnect opens', () => {
    const RWS = new ReconnectingWebsocket(async () => 'ws://localhost');
    const loggerInfo = jest.spyOn(RWS['logger'], 'info');

    RWS['sleepReconnectPending'] = true;
    RWS['internalOnOpen']({} as Event);

    expect(loggerInfo).toHaveBeenCalledWith('Back from sleep reconnect completed, WebSocket opened');
    expect(RWS['sleepReconnectPending']).toBe(false);
  });
});
