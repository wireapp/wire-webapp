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

import ko from 'knockout';
import {ConnectionStatus} from './ConnectionStatus';

export class ConnectionEntity {
  conversationId: string;
  from: string;
  lastUpdate: string;
  message: string;
  status: ko.Observable<ConnectionStatus>;
  userId: string;
  isBlocked: ko.PureComputed<boolean>;
  isCanceled: ko.PureComputed<boolean>;
  isConnected: ko.PureComputed<boolean>;
  isIgnored: ko.PureComputed<boolean>;
  isIncomingRequest: ko.PureComputed<boolean>;
  isOutgoingRequest: ko.PureComputed<boolean>;
  isUnknown: ko.PureComputed<boolean>;
  isRequest: ko.PureComputed<boolean>;

  constructor() {
    this.conversationId = null;
    this.from = null;
    this.lastUpdate = null;
    this.message = null;
    this.status = ko.observable(ConnectionStatus.UNKNOWN);
    this.userId = null;

    this.isBlocked = ko.pureComputed(() => this.status() === ConnectionStatus.BLOCKED);
    this.isCanceled = ko.pureComputed(() => this.status() === ConnectionStatus.CANCELLED);
    this.isConnected = ko.pureComputed(() => this.status() === ConnectionStatus.ACCEPTED);
    this.isIgnored = ko.pureComputed(() => this.status() === ConnectionStatus.IGNORED);
    this.isIncomingRequest = ko.pureComputed(() => this.status() === ConnectionStatus.PENDING);
    this.isOutgoingRequest = ko.pureComputed(() => this.status() === ConnectionStatus.SENT);
    this.isUnknown = ko.pureComputed(() =>
      [ConnectionStatus.CANCELLED, ConnectionStatus.UNKNOWN].includes(this.status())
    );

    this.isRequest = ko.pureComputed(() => this.isIncomingRequest() || this.isOutgoingRequest());
  }
}
