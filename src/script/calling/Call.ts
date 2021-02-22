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

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import type {Participant, UserId, ClientId} from './Participant';

export type ConversationId = string;

interface ActiveSpeaker {
  audio_level: number;
  audio_level_now: number;
  clientid: string;
  userid: string;
}

interface ActiveSpeakers {
  audio_levels: ActiveSpeaker[];
}

export class Call {
  public readonly reason: ko.Observable<number | undefined> = ko.observable();
  public readonly startedAt: ko.Observable<number | undefined> = ko.observable();
  public readonly state: ko.Observable<CALL_STATE> = ko.observable(CALL_STATE.UNKNOWN);
  public readonly participants: ko.ObservableArray<Participant>;
  public readonly selfClientId: ClientId;
  public readonly initialType: CALL_TYPE;
  public readonly isCbrEnabled: ko.Observable<boolean> = ko.observable(false);
  public readonly activeSpeakers: ko.ObservableArray<Participant> = ko.observableArray([]);
  public blockMessages: boolean = false;
  public type?: CALL_MESSAGE_TYPE;
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
    public readonly initiator: UserId,
    public readonly conversationId: ConversationId,
    public readonly conversationType: CONV_TYPE,
    private readonly selfParticipant: Participant,
    callType: CALL_TYPE,
  ) {
    this.initialType = callType;
    this.selfClientId = selfParticipant?.clientId;
    this.participants = ko.observableArray([selfParticipant]);
  }

  get hasWorkingAudioInput(): boolean {
    return !!this.selfParticipant.audioStream();
  }

  getSelfParticipant(): Participant {
    return this.participants().find(({user, clientId}) => user.isMe && this.selfClientId === clientId);
  }

  setActiveSpeakers({audio_levels}: ActiveSpeakers): void {
    // Update activeSpeaking status on the participants based on their `audio_level_now`.
    this.participants().forEach(participant => {
      const match = audio_levels.find(({userid, clientid}) => participant.doesMatchIds(userid, clientid));
      const audioLevelNow = match?.audio_level_now ?? 0;
      participant.isActivelySpeaking(audioLevelNow > 0);
    });

    // Get the corresponding participants for the entries in ActiveSpeakers in the incoming order.
    const activeSpeakers = audio_levels
      // Consider just the entries with audio activity.
      .filter(({audio_level}) => audio_level > 0)
      // Get the participants.
      .map(({userid, clientid}) => this.getParticipant(userid, clientid))
      // Make sure there was a participant found.
      .filter(participant => !!participant);

    // Set the new active speakers, limited to 4.
    this.activeSpeakers(activeSpeakers.slice(0, 4));
  }

  getActiveVideoSpeakers = () =>
    this.activeSpeakers()
      .filter(p => p.hasActiveVideo())
      .slice(0, 4);

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
