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

import {AudioSpeakerFactory} from 'Repositories/calling/AudioSpeakerFactory';
import {Conversation} from 'Repositories/entity/Conversation';
import {CanvasMediaStreamMixer} from 'Repositories/media/CanvasMediaStreamMixer';
import type {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {chunk, getDifference, partition} from 'Util/arrayUtil';
import {getLogger, Logger} from 'Util/logger';
import {matchQualifiedIds} from 'Util/qualifiedId';
import {sortUsersByPriority} from 'Util/stringUtil';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

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

interface FlexibleFrontPageParticipant {
  participant: Participant;
  reservedUntil: number;
}

export const IS_TALKING_THRESHOLD = 2;
export const RESERVE_FRONTPAGE_THRESHOLD = 15;
const TALKING_THRESHOLD = IS_TALKING_THRESHOLD * TIME_IN_MILLIS.SECOND;
const FRONTPAGE_RESERVATION = RESERVE_FRONTPAGE_THRESHOLD * TIME_IN_MILLIS.SECOND;

export class Call {
  private readonly logger: Logger = getLogger('Call');
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
  private readonly audios: Record<string, {audioElement: HTMLAudioElement | null; stream: MediaStream}> = {};
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
  private readonly activeSpeakerStartedAt: Record<string, number> = {};
  private flexibleFrontPageParticipantQueue: FlexibleFrontPageParticipant[] = [];

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
        .toSorted((p1, p2) => p1.handRaisedAt()! - p2.handRaisedAt()!),
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
    const selfParticipant = this.participants().find(({user, clientId}) => user.isMe && this.selfClientId === clientId);
    return selfParticipant ?? this.selfParticipant;
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

      try {
        audio.audioElement = AudioSpeakerFactory.createNewCallingAudioSpeaker(audio.stream);
      } catch (e: unknown) {
        this.logger.warn('Fail to playAudioStreams:', e);
      }
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

  private getActiveSpeakerKey(participant: Participant): string {
    const {domain, id} = participant.user.qualifiedId;
    return `${domain}/${id}/${participant.clientId}`;
  }

  private getUniqueAudioLevels(audioLevels: ActiveSpeaker[]): ActiveSpeaker[] {
    return audioLevels.reduce((acc, curr) => {
      if (!acc.some(({clientId, userId}) => matchQualifiedIds(userId, curr.userId) && clientId === curr.clientId)) {
        acc.push(curr);
      }
      return acc;
    }, [] as ActiveSpeaker[]);
  }

  private getAvailableFlexibleTiles(): number {
    const screensharingUserCount = this.getRemoteParticipants().filter(participant =>
      participant.sharesScreen(),
    ).length;
    return Math.max(this.numberOfParticipantsInOnePage - 1 - screensharingUserCount, 0);
  }

  private isFlexibleFrontPageCandidate(participant: Participant): boolean {
    return (
      this.participants().includes(participant) &&
      participant !== this.getSelfParticipant() &&
      !participant.sharesScreen()
    );
  }

  private removeUnavailableFlexibleFrontPageParticipants(): boolean {
    const queueLength = this.flexibleFrontPageParticipantQueue.length;
    this.flexibleFrontPageParticipantQueue = this.flexibleFrontPageParticipantQueue.filter(({participant}) => {
      const shouldKeep = this.isFlexibleFrontPageCandidate(participant);

      if (!shouldKeep) {
        delete this.activeSpeakerStartedAt[this.getActiveSpeakerKey(participant)];
      }

      return shouldKeep;
    });

    return this.flexibleFrontPageParticipantQueue.length !== queueLength;
  }

  private getVisibleFlexibleFrontPageParticipants(): Participant[] {
    const availableFlexibleTiles = this.getAvailableFlexibleTiles();

    return this.flexibleFrontPageParticipantQueue
      .slice(0, availableFlexibleTiles)
      .map(({participant}) => participant);
  }

  private areSameParticipants(participantsA: Participant[], participantsB: Participant[]): boolean {
    return (
      participantsA.length === participantsB.length &&
      participantsA.every((participant, index) => participant === participantsB[index])
    );
  }

  private promoteFlexibleFrontPageParticipant(participant: Participant, now: number): void {
    const availableFlexibleTiles = this.getAvailableFlexibleTiles();
    const reservedUntil = now + FRONTPAGE_RESERVATION;

    if (availableFlexibleTiles <= 0) {
      return;
    }

    const existingIndex = this.flexibleFrontPageParticipantQueue.findIndex(entry => entry.participant === participant);
    if (existingIndex >= 0) {
      this.flexibleFrontPageParticipantQueue.splice(existingIndex, 1);
      this.flexibleFrontPageParticipantQueue.push({participant, reservedUntil});
      return;
    }

    if (this.flexibleFrontPageParticipantQueue.length < availableFlexibleTiles) {
      this.flexibleFrontPageParticipantQueue.push({participant, reservedUntil});
      return;
    }

    const replacementIndex = this.flexibleFrontPageParticipantQueue.findIndex(
      ({reservedUntil}, index) => index < availableFlexibleTiles && reservedUntil <= now,
    );

    if (replacementIndex < 0) {
      return;
    }

    this.flexibleFrontPageParticipantQueue.splice(replacementIndex, 1);
    this.flexibleFrontPageParticipantQueue.push({participant, reservedUntil});
  }

  private updateActiveSpeakerPageParticipants(uniqueAudioLevels: ActiveSpeaker[], now = Date.now()): boolean {
    this.removeUnavailableFlexibleFrontPageParticipants();
    const previousVisibleFlexibleParticipants = this.getVisibleFlexibleFrontPageParticipants();
    const currentlySpeakingKeys = new Set<string>();

    uniqueAudioLevels.forEach(({userId, clientId, levelNow}) => {
      const participant = this.getParticipant(userId, clientId);
      if (!participant || !this.isFlexibleFrontPageCandidate(participant)) {
        return;
      }

      const speakerKey = this.getActiveSpeakerKey(participant);
      if (levelNow <= 0) {
        delete this.activeSpeakerStartedAt[speakerKey];
        return;
      }

      currentlySpeakingKeys.add(speakerKey);

      const startedAt = this.activeSpeakerStartedAt[speakerKey] ?? now;
      this.activeSpeakerStartedAt[speakerKey] = startedAt;

      if (now - startedAt < TALKING_THRESHOLD) {
        return;
      }

      this.promoteFlexibleFrontPageParticipant(participant, now);
    });

    Object.keys(this.activeSpeakerStartedAt).forEach(speakerKey => {
      if (!currentlySpeakingKeys.has(speakerKey)) {
        delete this.activeSpeakerStartedAt[speakerKey];
      }
    });

    this.removeUnavailableFlexibleFrontPageParticipants();
    const nextVisibleFlexibleParticipants = this.getVisibleFlexibleFrontPageParticipants();
    const shouldUpdatePages = !this.areSameParticipants(
      previousVisibleFlexibleParticipants,
      nextVisibleFlexibleParticipants,
    );

    if (shouldUpdatePages) {
      this.updatePages();
    }

    return shouldUpdatePages;
  }

  setActiveSpeakers(audioLevels: ActiveSpeaker[], now = Date.now()): boolean {
    // Make sure that every participant only has one entry in the list.
    const uniqueAudioLevels = this.getUniqueAudioLevels(audioLevels);

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
      .filter((participant): participant is Participant => participant !== undefined)
      // Limit them to 4.
      .slice(0, 4)
      // Sort them by name
      .toSorted((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user));

    // Set the new active speakers.
    const isSameSpeakers =
      this.activeSpeakers().length === activeSpeakers.length &&
      getDifference(this.activeSpeakers(), activeSpeakers).length === 0;
    if (!isSameSpeakers) {
      this.activeSpeakers(activeSpeakers);
    }

    return this.updateActiveSpeakerPageParticipants(uniqueAudioLevels, now);
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
    const remoteParticipants = this.getRemoteParticipants().toSorted((p1, p2) => sortUsersByPriority(p1.user, p2.user));

    const [withScreenShare, withoutScreenShare] = partition(remoteParticipants, participant =>
      participant.sharesScreen(),
    );
    this.removeUnavailableFlexibleFrontPageParticipants();
    const visibleFlexibleFrontPageParticipants = this.getVisibleFlexibleFrontPageParticipants();
    const withoutFlexibleFrontPage = withoutScreenShare.filter(
      participant => !visibleFlexibleFrontPageParticipants.includes(participant),
    );
    const [withVideo, withoutVideo] = partition(withoutFlexibleFrontPage, participant =>
      participant.isSendingVideo(),
    );

    const newPages = chunk<Participant>(
      [selfParticipant, ...withScreenShare, ...visibleFlexibleFrontPageParticipants, ...withVideo, ...withoutVideo],
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
