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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';

import {CALL_TYPE, CONV_TYPE, STATE as CALL_STATE} from '@wireapp/avs';

import {Conversation} from 'Repositories/entity/Conversation';
import {CanvasMediaStreamMixer} from 'Repositories/media/CanvasMediaStreamMixer';
import type {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {chunk, getDifference, partition} from 'Util/ArrayUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {sortUsersByPriority} from 'Util/StringUtil';

import {CallingEpochCache} from './CallingEpochCache';
import {MuteState} from './CallState';
import type {ClientId, Participant} from './Participant';

import {Config} from '../../Config';

export type SerializedConversationId = string;

interface ActiveSpeaker {
  clientId: string;
  levelNow: number;
  userId: QualifiedId;
}

export class Call {
  public readonly reason: ko.Observable<number | undefined> = ko.observable();
  public readonly startedAt: ko.Observable<number | undefined> = ko.observable();
  public readonly endedAt: ko.Observable<number> = ko.observable(0);
  public readonly state: ko.Observable<CALL_STATE> = ko.observable(CALL_STATE.UNKNOWN);
  public readonly muteState: ko.Observable<MuteState> = ko.observable(MuteState.NOT_MUTED);
  public readonly participants: ko.ObservableArray<Participant>;
  public readonly handRaisedParticipants: ko.PureComputed<Participant[]>;
  public readonly selfClientId: ClientId;
  public readonly initialType: CALL_TYPE;
  public readonly isCbrEnabled: ko.Observable<boolean> = ko.observable(
    Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE,
  );
  public readonly isConference: boolean;
  public readonly isGroupOrConference: boolean;
  public readonly activeSpeakers: ko.ObservableArray<Participant> = ko.observableArray([]);
  public blockMessages: boolean = false;
  public currentPage: ko.Observable<number> = ko.observable(0);
  public pages: ko.ObservableArray<Participant[]> = ko.observableArray();
  public numberOfParticipantsInOnePage: number = 9;
  public readonly maximizedParticipant: ko.Observable<Participant | null>;
  public readonly isActive: ko.PureComputed<boolean>;
  public readonly epochCache = new CallingEpochCache();
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
  public readonly canvasMixer: CanvasMediaStreamMixer;

  constructor(
    public readonly initiator: QualifiedId,
    public readonly conversation: Conversation,
    public readonly conversationType: CONV_TYPE,
    private readonly selfParticipant: Participant,
    callType: CALL_TYPE,
    // @ts-ignore
    private readonly mediaDevicesHandler: MediaDevicesHandler,
    isMuted: boolean = false,
  ) {
    this.initialType = callType;
    this.selfClientId = selfParticipant?.clientId;
    this.participants = ko.observableArray([selfParticipant]);
    this.handRaisedParticipants = ko.pureComputed(() =>
      this.participants()
        .filter(participant => Boolean(participant.handRaisedAt()))
        .sort((p1, p2) => p1.handRaisedAt()! - p2.handRaisedAt()!),
    );
    this.canvasMixer = new CanvasMediaStreamMixer();
    this.maximizedParticipant = ko.observable(null);
    this.muteState(isMuted ? MuteState.SELF_MUTED : MuteState.NOT_MUTED);
    this.isConference = [CONV_TYPE.CONFERENCE, CONV_TYPE.CONFERENCE_MLS].includes(this.conversationType);
    this.isGroupOrConference = this.isConference || this.conversationType === CONV_TYPE.GROUP;
    this.isActive = ko.pureComputed(() =>
      [CALL_STATE.OUTGOING, CALL_STATE.ANSWERED, CALL_STATE.MEDIA_ESTAB].includes(this.state()),
    );
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
    const audioElement = this.audios[audioId]?.audioElement;
    if (audioElement) {
      audioElement.remove();
      audioElement.srcObject = null;
    }
    delete this.audios[audioId];
  }

  removeAllAudio() {
    Object.keys(this.audios).forEach(audioId => {
      this.removeAudio(audioId);
    });
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
      if (audio.audioElement?.srcObject) {
        audio.audioElement.remove();
        audio.audioElement.srcObject = null;
      }
      const audioElement = new Audio();
      audioElement.srcObject = audio.stream;
      audioElement.play();
      audio.audioElement = audioElement;
      document.body.appendChild(audioElement);
    });
    this.updateAudioStreamsSink();
  }

  updateAudioStreamsSink() {
    const outputDeviceId = mediaDevicesStore.getState().audio.output.selectedId;
    if (!outputDeviceId) {
      return;
    }

    Object.values(this.audios).forEach(audio => {
      audio.audioElement?.setSinkId?.(outputDeviceId).catch(console.warn);
    });
  }

  setActiveSpeakers(audioLevels: ActiveSpeaker[]): void {
    // Make sure that every participant only has one entry in the list.
    const uniqueAudioLevels = audioLevels.reduce((acc, curr) => {
      if (!acc.some(({clientId, userId}) => matchQualifiedIds(userId, curr.userId) && clientId === curr.clientId)) {
        acc.push(curr);
      }
      return acc;
    }, [] as ActiveSpeaker[]);

    // Update activeSpeaking status on the participants based on their `audio_level_now`.
    this.participants().forEach(participant => {
      const match = uniqueAudioLevels.find(({userId, clientId}) => participant.doesMatchIds(userId, clientId));
      const audioLevelNow = match?.levelNow ?? 0;
      participant.isActivelySpeaking(audioLevelNow > 0);
    });

    // Get the corresponding participants for the entries in ActiveSpeakers in the incoming order.
    const activeSpeakers = uniqueAudioLevels
      // Get the participants.
      .map(({userId, clientId}) => this.getParticipant(userId, clientId))
      // Limit them to 4.
      .slice(0, 4)
      // Sort them by name
      .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user));

    // Set the new active speakers.
    const isSameSpeakers =
      this.activeSpeakers().length === activeSpeakers.length &&
      getDifference(this.activeSpeakers(), activeSpeakers).length === 0;
    if (!isSameSpeakers) {
      this.activeSpeakers(activeSpeakers);
    }
  }

  addParticipant(participant: Participant): void {
    this.participants.push(participant);
    this.updatePages();
  }

  getParticipant(userId: QualifiedId, clientId: ClientId): Participant | undefined {
    return this.participants().find(participant => participant.doesMatchIds(userId, clientId));
  }

  getRemoteParticipants(): Participant[] {
    return this.participants().filter(({user, clientId}) => !user.isMe || this.selfClientId !== clientId);
  }

  setNumberOfParticipantsInOnePage(participantsInOnePage: number): void {
    this.numberOfParticipantsInOnePage = participantsInOnePage;
    this.updatePages();
  }

  updatePages() {
    const selfParticipant = this.getSelfParticipant();
    const remoteParticipants = this.getRemoteParticipants().sort((p1, p2) => sortUsersByPriority(p1.user, p2.user));

    const [withVideoAndScreenShare, withoutVideo] = partition(remoteParticipants, participant =>
      participant.isSendingVideo(),
    );
    const [withScreenShare, withVideo] = partition(withVideoAndScreenShare, participant => participant.sharesScreen());

    const newPages = chunk<Participant>(
      [selfParticipant, ...withScreenShare, ...withVideo, ...withoutVideo].filter(Boolean),
      this.numberOfParticipantsInOnePage,
    );

    this.currentPage(Math.min(this.currentPage(), newPages.length - 1));
    this.pages(newPages);
  }

  public useAvsRustSFT(): boolean {
    const conversationName = this.conversation.display_name();
    if (!conversationName.includes('Sync - Calling')) {
      return false;
    }
    return !!window.wire?.app?.debug?.isEnabledAvsRustSFT();
  }
}
