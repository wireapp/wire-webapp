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

import {BaseError} from './BaseError';

enum EVENT_ERROR_TYPE {
  DATABASE_FAILURE = 'DATABASE_FAILURE',
  DEPRECATED_SCHEMA = 'DEPRECATED_SCHEMA',
  NO_CLIENT_ID = 'NO_CLIENT_ID',
  NO_EVENT = 'NO_EVENT',
  NO_LAST_DATE = 'NO_LAST_DATE',
  NO_LAST_ID = 'NO_LAST_ID',
  NO_NOTIFICATIONS = 'NO_NOTIFICATIONS',
  OUTDATED_E_CALL_EVENT = 'OUTDATED_E_CALL_EVENT',
  REQUEST_FAILURE = 'REQUEST_FAILURE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  WEBSOCKET_DISCONNECT = 'WEBSOCKET_DISCONNECT',
}

export class EventError extends BaseError {
  constructor(type: EVENT_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<EVENT_ERROR_TYPE, string> {
    return {
      DATABASE_FAILURE: 'Event related database transaction failure',
      DEPRECATED_SCHEMA: 'Event type is deprecated',
      NO_CLIENT_ID: 'Missing client id',
      NO_EVENT: 'Event is missing',
      NO_LAST_DATE: 'Last event date not found in storage',
      NO_LAST_ID: 'Last notification ID not found in storage',
      NO_NOTIFICATIONS: 'No notifications found',
      OUTDATED_E_CALL_EVENT: 'Ignoring outdated e-call event',
      REQUEST_FAILURE: 'Event related backend request failure',
      VALIDATION_FAILED: 'Event failed validation',
      WEBSOCKET_DISCONNECT: 'Websocket disconnect during notification stream processing',
    };
  }

  static get TYPE(): Record<EVENT_ERROR_TYPE, EVENT_ERROR_TYPE> {
    return {
      DATABASE_FAILURE: EVENT_ERROR_TYPE.DATABASE_FAILURE,
      DEPRECATED_SCHEMA: EVENT_ERROR_TYPE.DEPRECATED_SCHEMA,
      NO_CLIENT_ID: EVENT_ERROR_TYPE.NO_CLIENT_ID,
      NO_EVENT: EVENT_ERROR_TYPE.NO_EVENT,
      NO_LAST_DATE: EVENT_ERROR_TYPE.NO_LAST_DATE,
      NO_LAST_ID: EVENT_ERROR_TYPE.NO_LAST_ID,
      NO_NOTIFICATIONS: EVENT_ERROR_TYPE.NO_NOTIFICATIONS,
      OUTDATED_E_CALL_EVENT: EVENT_ERROR_TYPE.OUTDATED_E_CALL_EVENT,
      REQUEST_FAILURE: EVENT_ERROR_TYPE.REQUEST_FAILURE,
      VALIDATION_FAILED: EVENT_ERROR_TYPE.VALIDATION_FAILED,
      WEBSOCKET_DISCONNECT: EVENT_ERROR_TYPE.WEBSOCKET_DISCONNECT,
    };
  }
}
