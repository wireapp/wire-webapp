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

import {sortUsersByPriority} from 'Util/StringUtil';
import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import type {Participant, UserId, ClientId} from './Participant';
import type {MediaDevicesHandler} from '../media/MediaDevicesHandler';

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
  private readonly audios: Record<string, {audioElement: HTMLAudioElement; stream: MediaStream}> = {};
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
  activeAudioOutput: string;

  constructor(
    public readonly initiator: UserId,
    public readonly conversationId: ConversationId,
    public readonly conversationType: CONV_TYPE,
    private readonly selfParticipant: Participant,
    callType: CALL_TYPE,
    private readonly mediaDevicesHandler: MediaDevicesHandler,
  ) {
    this.initialType = callType;
    this.selfClientId = selfParticipant?.clientId;
    this.participants = ko.observableArray([selfParticipant]);
    this.activeAudioOutput = this.mediaDevicesHandler.currentAvailableDeviceId.audioOutput();
    this.mediaDevicesHandler.currentAvailableDeviceId.audioOutput.subscribe((newActiveAudioOutput: string) => {
      this.activeAudioOutput = newActiveAudioOutput;
      this.updateAudioStreamsSink();
    });
  }

  get hasWorkingAudioInput(): boolean {
    return !!this.selfParticipant.audioStream();
  }

  getSelfParticipant(): Participant {
    return this.participants().find(({user, clientId}) => user.isMe && this.selfClientId === clientId);
  }

  addAudio(audioId: string, stream: MediaStream) {
    this.audios[audioId] = {audioElement: null, stream};
  }

  removeAudio(audioId: string) {
    this.releaseStream(this.audios[audioId]?.stream);
    delete this.audios[audioId];
  }

  private releaseStream(mediaStream?: MediaStream): void {
    if (!mediaStream) {
      return;
    }

    mediaStream.getTracks().forEach(track => {
      track.stop();
      mediaStream.removeTrack(track);
    });
  }

  playAudioStreams() {
    Object.values(this.audios).forEach(audio => {
      if ((audio.audioElement?.srcObject as MediaStream)?.active) {
        return;
      }
      const audioElement = new Audio();
      audioElement.srcObject = audio.stream;
      audioElement.play();
      audio.audioElement = audioElement;
    });
    this.updateAudioStreamsSink();
  }

  updateAudioStreamsSink() {
    if (this.activeAudioOutput) {
      Object.values(this.audios).forEach(audio => {
        audio.audioElement?.setSinkId?.(this.activeAudioOutput);
      });
    }
  }

  setActiveSpeakers({audio_levels}: ActiveSpeakers): void {
    // Make sure that every participant only has one entry in the list.
    const uniqueAudioLevels = audio_levels.reduce((acc, curr) => {
      if (!acc.some(({clientid, userid}) => userid === curr.userid && clientid === curr.clientid)) {
        acc.push(curr);
      }
      return acc;
    }, [] as ActiveSpeaker[]);

    // Update activeSpeaking status on the participants based on their `audio_level_now`.
    this.participants().forEach(participant => {
      const match = uniqueAudioLevels.find(({userid, clientid}) => participant.doesMatchIds(userid, clientid));
      const audioLevelNow = match?.audio_level_now ?? 0;
      participant.isActivelySpeaking(audioLevelNow > 0);
    });

    // Get the corresponding participants for the entries in ActiveSpeakers in the incoming order.
    const activeSpeakers = uniqueAudioLevels
      // Get the participants.
      .map(({userid, clientid}) => this.getParticipant(userid, clientid))
      // Make sure there was a participant found.
      .filter(participant => participant?.hasActiveVideo())
      // Limit them to 4.
      .slice(0, 4)
      // Sort them by name
      .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user));

    // Set the new active speakers.
    this.activeSpeakers(activeSpeakers);
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
