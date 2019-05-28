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

import {CALL_TYPE, CONV_TYPE, STATE as CALL_STATE} from 'avs-web';
import ko from 'knockout';
import {Participant} from './Participant';

export type ConversationId = string;
export type UserId = string;

export class Call {
  public readonly conversationId: ConversationId;
  public readonly initiator: UserId;
  public readonly reason: ko.Observable<number | undefined>;
  public readonly startedAt: ko.Observable<number | undefined>;
  public readonly state: ko.Observable<number>;
  public readonly participants: ko.ObservableArray<Participant>;
  public readonly selfParticipant: Participant;
  public readonly conversationType: CONV_TYPE;
  public readonly initialType: CALL_TYPE;
  public blockMessages: boolean = false;

  constructor(
    initiator: UserId,
    conversationId: ConversationId,
    conversationType: CONV_TYPE,
    selfParticipant: Participant,
    callType: CALL_TYPE
  ) {
    this.initiator = initiator;
    this.conversationId = conversationId;
    this.state = ko.observable(CALL_STATE.NONE);
    this.conversationType = conversationType;
    this.initialType = callType;
    this.selfParticipant = selfParticipant;
    this.participants = ko.observableArray();
    this.reason = ko.observable();
    this.startedAt = ko.observable();
  }
}
