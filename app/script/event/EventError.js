/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.event.EventError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.event.EventError.TYPE.DATABASE_FAILURE:
        this.message = 'Event related database transaction failure';
        break;
      case z.event.EventError.TYPE.DEPRECATED_SCHEMA:
        this.message = 'Event type is deprecated';
        break;
      case z.event.EventError.TYPE.NO_CLIENT_ID:
        this.message = 'Missing client id';
        break;
      case z.event.EventError.TYPE.NO_LAST_ID:
        this.message = 'Last notification ID not found in storage';
        break;
      case z.event.EventError.TYPE.NO_NOTIFICATIONS:
        this.message = 'No notifications found';
        break;
      case z.event.EventError.TYPE.OUTDATED_E_CALL_EVENT:
        this.message = 'Ignoring outdated e-call event';
        break;
      case z.event.EventError.TYPE.REQUEST_FAILURE:
        this.message = 'Event related backend request failure';
        break;
      default:
        this.message = 'Unknown EventError';

    }
  }

  static get TYPE() {
    return {
      DATABASE_FAILURE: 'z.event.EventError.TYPE.DATABASE_FAILURE',
      DEPRECATED_SCHEMA: 'z.event.EventError.TYPE.DEPRECATED_SCHEMA',
      NO_CLIENT_ID: 'z.event.EventError.TYPE.NO_CLIENT_ID',
      NO_LAST_ID: 'z.event.EventError.TYPE.NO_LAST_ID',
      NO_NOTIFICATIONS: 'z.event.EventError.TYPE.NO_NOTIFICATIONS',
      OUTDATED_E_CALL_EVENT: 'z.event.EventError.OUTDATED_E_CALL_EVENT',
      REQUEST_FAILURE: 'z.event.EventError.TYPE.REQUEST_FAILURE',
    };
  }
};
