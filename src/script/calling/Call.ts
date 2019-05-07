/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {Participant} from './Participant';

export type ConversationId = string;

export class Call {
  public readonly conversationId: ConversationId;
  public readonly reason: ko.Observable<number | undefined>;
  public readonly startedAt: ko.Observable<number | undefined>;
  public readonly state: ko.Observable<number>;
  public readonly participants: ko.ObservableArray<Participant>;
  public readonly initialType: number;

  constructor(conversationId: ConversationId, state: number, initialType: number) {
    this.conversationId = conversationId;
    this.state = ko.observable(state);
    this.participants = ko.observableArray();
    this.reason = ko.observable();
    this.startedAt = ko.observable();
    this.initialType = initialType;
  }
}
