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

export enum EventErrorType {
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
}

export class EventError extends Error {
  static readonly TYPE = EventErrorType;
  static readonly MESSAGE: Record<EventErrorType, string> = {
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
  };
  readonly type: EventErrorType;

  constructor(type: EventErrorType, message?: string) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type;
    this.message = message || EventError.MESSAGE[type];
  }
}
