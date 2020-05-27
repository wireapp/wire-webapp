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

import {CALL_TYPE, CONV_TYPE, STATE as CALL_STATE} from '@wireapp/avs';
import ko from 'knockout';

import type {Participant, UserId, ClientId} from './Participant';

export type ConversationId = string;

export class Call {
  public readonly conversationId: ConversationId;
  public readonly initiator: UserId;
  public readonly reason: ko.Observable<number | undefined>;
  public readonly startedAt: ko.Observable<number | undefined>;
  public readonly state: ko.Observable<CALL_STATE>;
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
    callType: CALL_TYPE,
  ) {
    this.initiator = initiator;
    this.conversationId = conversationId;
    this.state = ko.observable(CALL_STATE.UNKNOWN);
    this.conversationType = conversationType;
    this.initialType = callType;
    this.selfParticipant = selfParticipant;
    this.participants = ko.observableArray([selfParticipant]);
    this.reason = ko.observable();
    this.startedAt = ko.observable();
  }

  getSelfParticipant(): Participant {
    return this.participants().find(
      ({userId, clientId}) => this.selfParticipant.userId === userId && this.selfParticipant.clientId === clientId,
    );
  }

  addParticipant(participant: Participant): void {
    this.participants.push(participant);
  }

  getParticipant(userId: UserId, clientId: ClientId): Participant {
    return this.participants().find(participant => participant.userId === userId && clientId === participant.clientId);
  }

  removeParticipant(participant: Participant): void {
    this.participants.remove(participant);
  }
}
