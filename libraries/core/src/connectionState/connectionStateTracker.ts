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

export enum ConnectionState {
  /** The WebSocket is closed and no notifications are being processed */
  CLOSED = 'closed',

  /** The WebSocket is being opened or reconnected */
  CONNECTING = 'connecting',

  /** The websocket is open but locked and notifications stream is being processed */
  PROCESSING_NOTIFICATIONS = 'processing_notifications',

  /** The WebSocket is open and new messages are processed live in real time */
  LIVE = 'live',
}

export type ConnectionStateTracker = Readonly<{
  getState: () => ConnectionState;
  setState: (state: ConnectionState) => void;
  isLive: () => boolean;
}>;

/**
 * Creates a mutable connection-state holder shared between {@link Account} and
 * {@link ConversationService} (and any other core component that needs it).
 */
export function createConnectionStateTracker(
  initialState: ConnectionState = ConnectionState.CLOSED,
): ConnectionStateTracker {
  let state = initialState;

  return {
    getState: () => state,
    setState: (nextState: ConnectionState) => {
      state = nextState;
    },
    isLive: () => state === ConnectionState.LIVE,
  };
}
