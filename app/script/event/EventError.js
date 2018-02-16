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

'use strict';

window.z = window.z || {};
window.z.event = z.event || {};

z.event.EventError = class EventError extends Error {
  constructor(type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || EventError.TYPE.UNKNOWN;

    if (message) {
      this.message = message;
    } else {
      switch (this.type) {
        case EventError.TYPE.DATABASE_FAILURE:
          this.message = 'Event related database transaction failure';
          break;
        case EventError.TYPE.DEPRECATED_SCHEMA:
          this.message = 'Event type is deprecated';
          break;
        case EventError.TYPE.NO_CLIENT_ID:
          this.message = 'Missing client id';
          break;
        case EventError.TYPE.NO_EVENT:
          this.message = 'Event is missing';
          break;
        case EventError.TYPE.NO_LAST_DATE:
          this.message = 'Last event date not found in storage';
          break;
        case EventError.TYPE.NO_LAST_ID:
          this.message = 'Last notification ID not found in storage';
          break;
        case EventError.TYPE.NO_NOTIFICATIONS:
          this.message = 'No notifications found';
          break;
        case EventError.TYPE.OUTDATED_E_CALL_EVENT:
          this.message = 'Ignoring outdated e-call event';
          break;
        case EventError.TYPE.REQUEST_FAILURE:
          this.message = 'Event related backend request failure';
          break;
        case EventError.TYPE.VALIDATION_FAILED:
          this.message = 'Event failed validation';
          break;
        default:
          this.message = 'Unknown EventError';
      }
    }
  }

  static get TYPE() {
    return {
      DATABASE_FAILURE: 'EventError.TYPE.DATABASE_FAILURE',
      DEPRECATED_SCHEMA: 'EventError.TYPE.DEPRECATED_SCHEMA',
      NO_CLIENT_ID: 'EventError.TYPE.NO_CLIENT_ID',
      NO_EVENT: 'EventError.TYPE.NO_EVENT',
      NO_LAST_DATE: 'EventError.TYPE.NO_LAST_DATE',
      NO_LAST_ID: 'EventError.TYPE.NO_LAST_ID',
      NO_NOTIFICATIONS: 'EventError.TYPE.NO_NOTIFICATIONS',
      OUTDATED_E_CALL_EVENT: 'EventError.OUTDATED_E_CALL_EVENT',
      REQUEST_FAILURE: 'EventError.TYPE.REQUEST_FAILURE',
      VALIDATION_FAILED: 'EventError.TYPE.VALIDATION_FAILED',
    };
  }
};
