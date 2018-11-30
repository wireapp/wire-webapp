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

window.z = window.z || {};
window.z.connection = z.connection || {};

z.connection.ConnectionEntity = class ConnectionEntity {
  constructor() {
    this.conversationId = null;
    this.from = null;
    this.lastUpdate = null;
    this.message = null;
    this.status = ko.observable(z.connection.ConnectionStatus.UNKNOWN);
    this.userId = null;

    this.isBlocked = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.BLOCKED);
    this.isCanceled = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.CANCELLED);
    this.isConnected = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.ACCEPTED);
    this.isIgnored = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.IGNORED);
    this.isIncomingRequest = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.PENDING);
    this.isOutgoingRequest = ko.pureComputed(() => this.status() === z.connection.ConnectionStatus.SENT);
    this.isUnknown = ko.pureComputed(() =>
      [z.connection.ConnectionStatus.CANCELLED, z.connection.ConnectionStatus.UNKNOWN].includes(this.status())
    );

    this.isRequest = ko.pureComputed(() => this.isIncomingRequest() || this.isOutgoingRequest());
  }
};
