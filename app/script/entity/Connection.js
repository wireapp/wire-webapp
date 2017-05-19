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
window.z.entity = z.entity || {};

z.entity.Connection = class Connection {
  constructor() {
    this.conversation_id = null;
    this.from = null;
    this.last_update = null;
    this.message = null;
    this.status = ko.observable(z.user.ConnectionStatus.UNKNOWN);
    this.to = null;

    this.is_blocked = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.BLOCKED);
    this.is_canceled = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.CANCELLED);
    this.is_connected = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.ACCEPTED);
    this.is_ignored = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.IGNORED);
    this.is_incoming_request = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.PENDING);
    this.is_outgoing_request = ko.pureComputed(() => this.status() === z.user.ConnectionStatus.SENT);
    this.is_unknown = ko.pureComputed(() => [z.user.ConnectionStatus.CANCELLED, z.user.ConnectionStatus.UNKNOWN].includes(this.status()));

    this.is_request = ko.pureComputed(() => this.is_incoming_request() || this.is_outgoing_request());
  }
};
