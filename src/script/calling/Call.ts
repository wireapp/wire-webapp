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
  public readonly selfClientId: ClientId;
  public readonly conversationType: CONV_TYPE;
  public readonly initialType: CALL_TYPE;
  public readonly isCbrEnabled: ko.Observable<boolean>;
  public blockMessages: boolean = false;
  /**
   * set to `true` if anyone has enabled their video during a call (used for analytics)
   */
  public analyticsAvSwitchToggle: boolean = false;
  /**
   * set to `true` if anyone has shared their screen during a call (used for analytics)
   */
  public analyticsScreenSharing: boolean = false;
  /**
   * Maximum number of people joined in a call (used for analytics)
   */
  public analyticsMaximumParticipants: number = 0;

  constructor(
    initiator: UserId,
    conversationId: ConversationId,
    conversationType: CONV_TYPE,
    private readonly selfParticipant: Participant,
    callType: CALL_TYPE,
  ) {
    this.initiator = initiator;
    this.conversationId = conversationId;
    this.state = ko.observable(CALL_STATE.UNKNOWN);
    this.conversationType = conversationType;
    this.initialType = callType;
    this.selfClientId = selfParticipant?.clientId;
    this.participants = ko.observableArray([selfParticipant]);
    this.reason = ko.observable();
    this.startedAt = ko.observable();
    this.isCbrEnabled = ko.observable(false);
  }

  get hasWorkingAudioInput(): boolean {
    return !!this.selfParticipant.audioStream();
  }

  getSelfParticipant(): Participant {
    return this.participants().find(({user, clientId}) => user.isMe && this.selfClientId === clientId);
  }

  addParticipant(participant: Participant): void {
    this.participants.push(participant);
  }

  getParticipant(userId: UserId, clientId: ClientId): Participant | undefined {
    return this.participants().find(participant => participant.doesMatchIds(userId, clientId));
  }

  getRemoteParticipants(): Participant[] {
    return this.participants().filter(({user, clientId}) => !user.isMe || this.selfClientId !== clientId);
  }

  removeParticipant(participant: Participant): void {
    this.participants.remove(participant);
  }
}
