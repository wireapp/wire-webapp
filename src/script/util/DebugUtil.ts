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

import {
  CONVERSATION_EVENT,
  USER_EVENT,
  BackendEvent,
  ConversationEvent,
  ConversationOtrMessageAddEvent,
} from '@wireapp/api-client/src/event/';
import type {Notification} from '@wireapp/api-client/src/notification/';
import {MemberLeaveReason} from '@wireapp/api-client/src/conversation/data/';
import {ConnectionStatus} from '@wireapp/api-client/src/connection/';
import {util as ProteusUtil} from '@wireapp/proteus';
import Dexie from 'dexie';
import {container} from 'tsyringe';

import {getLogger, Logger} from 'Util/Logger';

import {checkVersion} from '../lifecycle/newVersionHandler';
import {createRandomUuid, downloadFile} from './util';
import {StorageSchemata} from '../storage/StorageSchemata';
import {EventRepository} from '../event/EventRepository';
import {ViewModelRepositories} from '../view_model/MainViewModel';
import {CallingRepository} from '../calling/CallingRepository';
import {ClientRepository} from '../client/ClientRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRecord, StorageRepository} from '../storage';
import {UserRepository} from '../user/UserRepository';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {UserId} from '../calling/Participant';
import type {MessageRepository} from '../conversation/MessageRepository';
import {ClientState} from '../client/ClientState';
import {UserState} from '../user/UserState';
import {ConversationState} from '../conversation/ConversationState';
import {CallState} from '../calling/CallState';
import {MessageCategory} from '../message/MessageCategory';

function downloadText(text: string, filename: string = 'default.txt'): number {
  const url = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return downloadFile(url, filename);
}

export class DebugUtil {
  private readonly logger: Logger;
  private readonly callingRepository: CallingRepository;
  private readonly clientRepository: ClientRepository;
  private readonly connectionRepository: ConnectionRepository;
  /** Used by QA test automation. */
  public readonly conversationRepository: ConversationRepository;
  private readonly cryptographyRepository: CryptographyRepository;
  private readonly eventRepository: EventRepository;
  private readonly storageRepository: StorageRepository;
  private readonly messageRepository: MessageRepository;
  /** Used by QA test automation. */
  public readonly userRepository: UserRepository;
  /** Used by QA test automation. */
  public readonly $: JQueryStatic;
  /** Used by QA test automation. */
  public readonly Dexie: typeof Dexie;

  constructor(
    repositories: ViewModelRepositories,
    private readonly clientState = container.resolve(ClientState),
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly callState = container.resolve(CallState),
  ) {
    this.$ = $;
    this.Dexie = Dexie;

    const {calling, client, connection, conversation, cryptography, event, user, storage, message} = repositories;
    this.callingRepository = calling;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.connectionRepository = connection;
    this.cryptographyRepository = cryptography;
    this.eventRepository = event;
    this.storageRepository = storage;
    this.userRepository = user;
    this.messageRepository = message;

    this.logger = getLogger('DebugUtil');
  }

  /** Used by QA test automation. */
  blockAllConnections(): Promise<void[]> {
    const blockUsers = this.userState.users().map(userEntity => this.connectionRepository.blockUser(userEntity));
    return Promise.all(blockUsers);
  }

  /** Used by QA test automation. */
  async breakSession(userId: string, clientId: string): Promise<void> {
    const sessionId = `${userId}@${clientId}`;
    const cryptobox = this.cryptographyRepository.cryptobox;
    const cryptoboxSession = await cryptobox.session_load(sessionId);
    cryptoboxSession.session.session_states = {};

    const record = {
      created: Date.now(),
      id: sessionId,
      serialised: cryptoboxSession.session.serialise(),
      version: 'broken_by_qa',
    };

    cryptobox['cachedSessions'].set(sessionId, cryptoboxSession);

    const sessionStoreName = StorageSchemata.OBJECT_STORE.SESSIONS;
    await this.storageRepository.storageService.update(sessionStoreName, sessionId, record);
    this.logger.log(`Corrupted Session ID '${sessionId}'`);
  }

  /** Used by QA test automation. */
  triggerVersionCheck(baseVersion: string): Promise<string | void> {
    return checkVersion(baseVersion);
  }

  /**
   * Used by QA test automation: Will allow the webapp to generate fake link previews when sending a link in a message.
   */
  enableLinkPreviews(): void {
    /*
     * To allow the LinkPreviewRepository to generate link previews, we need to expose a fake 'openGraphAsync' method.
     * This function is normally exposed by the desktop wrapper
     */
    window.openGraphAsync = url => {
      return Promise.resolve({
        image: {
          data:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAADiUlEQVR4nO3dS67cMAwEwHeWuf8dkxOMDV' +
            'DTJiVXA1pq+FF5EyDJ3+fz+XfCuUp3bzv3Wj1/3Q288bF26rV6wNJr5ICl18gBS6+RA5ZeIwcsvUbOJaxpSTxW9V5HzWkBC6xIwAIrEr' +
            'DAigQssCIBC6xIwAIrkgisu6VXT7Vm4l5HTnkPsIbllPcAa1hOeQ+whuWU9wBrWE55D7CG5ZT3AGtYTnmP18PqmGOnGas1wQILrGm9gg' +
            'UWWGDts3SwwAILrH2WDhZYYIH1+6V35JSPp1oTrFDAOmSQaQHrkEGmBaxDBpkWsA4ZZFrAOmSQaQHr5Y+1Mn9id6e8B1hglQMWWJGABV' +
            'YkYIEVCVhgRQIWWJGUYe10qguo3uuqucsBCyywpj0yWGCBBRZYJxywwAJr2iODdQHrcsoXZNpHcErAAisSsMCKBCywIgELrEjAAisSsM' +
            'CKpPznWCuZ9Fgrv/k0nmq9jo8HLLDAAgusxwdN9JK8+2SvYIEVqQcWWJF6YIEVqbcVrBSCSXg65u+YI7EDsAJLBQusyFLBAiuyVLDAii' +
            'wVLLAiSwULrMhSwbr5yxQdgySG7IA1acaOOcAK1Zs0I1g3AQusbZaeqjdpRrBuAhZY2yw9VW/SjGDdBCywtll6qt6kGY+BdZfU706pt9' +
            'JP4iPo6AeshoAF1uP9gLUQsMAC6+F+wFoIWGCB9XA/r4CVGqT6u4mz0svTc6SS6BWshV6eniMVsMCKBCywIgELrEjAAisSsMCKZBSsnQ' +
            'LWdRI1wSreA+s6YBXvgXUdsIr3wLoOWMV7YF0HrOI9sK4DVvEeWNd5xX/dW00HrGmp9gpWcalggRVZKlhgRZYKFliRpYIFVmSpYIEVWS' +
            'pYC7CmJfHI1XsdH0FqjkRNsIr3wAILLLCuAxZYkYAFViRggRUJWC+A1bH0ab0+jWenAxZYYE3rFSywwAKrVnPaY1XTDQKsAb2CBRZYYN' +
            'Vq7vSQiV5XZkzsByywIvsBC6zIfsACK7IfsMCK7AcssCL7AQusyH7AAiuyn9fDSs3YUXPSRwBWaMaOmmCBFakJFliRmmCBFakJFliRmm' +
            'CBFal5BKyO7PQRJPpJ7Gb17reABRZYYP1+N6t3vwUssMAC6/e7Wb37LWCBBRZYv9/N6t1vecU/btvx8UyCvNJr9R5YoYA1AAVYYI09ic' +
            'WtBKwBKMACa+xJLG4lYA1AAdZ5sP4Df5GjbWdSI2IAAAAASUVORK5CYII=',
        },
        title: 'A link to the past',
        url,
      });
    };
  }

  async getLastMessagesFromDatabase(
    amount = 10,
    conversationId = this.conversationState.activeConversation().id,
  ): Promise<EventRecord[]> {
    if (this.storageRepository.storageService.db) {
      const records = await this.storageRepository.storageService.db.events.toArray();
      const messages = records.filter(event => event.conversation === conversationId);
      return messages.slice(-amount).reverse();
    }
    return [];
  }

  async haveISentThisMessageToMyOtherClients(
    messageId: string,
    conversationId: string = this.conversationState.activeConversation().id,
  ): Promise<void> {
    const clientId = this.clientState.currentClient().id;
    const userId = this.userState.self().id;

    const isOTRMessage = (notification: BackendEvent) => notification.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD;
    const isInCurrentConversation = (notification: ConversationEvent) => notification.conversation === conversationId;
    const wasSentByOurCurrentClient = (notification: ConversationOtrMessageAddEvent) =>
      notification.from === userId && notification.data && notification.data.sender === clientId;
    const hasExpectedTimestamp = (notification: ConversationOtrMessageAddEvent, dateTime: Date) =>
      notification.time === dateTime.toISOString();
    const conversation = await this.conversationRepository.getConversationById(conversationId);
    const message = await this.messageRepository.getMessageInConversationById(conversation, messageId);
    const notificationList = await this.eventRepository.notificationService.getNotifications(
      undefined,
      undefined,
      EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX,
    );
    const dateTime = new Date(message.timestamp());
    const filteredEvents: ConversationOtrMessageAddEvent[] = notificationList.notifications
      .flatMap((notification: Notification) => notification.payload)
      .filter((event: ConversationOtrMessageAddEvent) => {
        return (
          isOTRMessage(event) &&
          isInCurrentConversation(event) &&
          wasSentByOurCurrentClient(event) &&
          hasExpectedTimestamp(event, dateTime)
        );
      }) as ConversationOtrMessageAddEvent[];
    const recipients = filteredEvents.map(event => event.data.recipient);
    const selfClients = await this.clientRepository.getClientsForSelf();
    const selfClientIds = selfClients.map(client => client.id);
    const missingClients = selfClientIds.filter(id => recipients.includes(id));
    const logMessage = missingClients.length
      ? `Message was sent to all other "${selfClients.length}" clients.`
      : `Message was NOT sent to the following own clients: ${missingClients.join(',')}`;
    this.logger.info(logMessage);
  }

  async getEventInfo(
    event: ConversationEvent,
  ): Promise<{conversation: Conversation; event: ConversationEvent; user: User}> {
    const conversation = await this.conversationRepository.getConversationById(event.conversation);
    const user = await this.userRepository.getUserById(event.from, event.qualified_from?.domain);

    const debugInformation = {
      conversation,
      event,
      user,
    };

    const logMessage = `Hey ${this.userState.self().name()}, this is for you:`;
    this.logger.warn(logMessage, debugInformation);
    this.logger.warn(`Conversation: ${debugInformation.conversation.name()}`, debugInformation.conversation);
    this.logger.warn(`From: ${debugInformation.user.name()}`, debugInformation.user);

    return debugInformation;
  }

  async exportCryptobox(): Promise<void> {
    const clientId = this.clientState.currentClient().id;
    const userId = this.userState.self().id;
    const fileName = `cryptobox-${userId}-${clientId}.json`;
    const cryptobox = await this.cryptographyRepository.cryptobox.serialize();
    downloadText(JSON.stringify(cryptobox), fileName);
  }

  /** Used by QA test automation. */
  isLibsodiumUsingWASM(): Promise<boolean> {
    return ProteusUtil.WASMUtil.isUsingWASM();
  }

  /** Used by QA test automation. */
  getCallingLogs(): string {
    return this.callingRepository['callLog'].join('\n');
  }

  getActiveCallStats(): Promise<{stats: RTCStatsReport; userid: UserId}[]> {
    const activeCall = this.callState.joinedCall();
    if (!activeCall) {
      throw new Error('no active call found');
    }
    return this.callingRepository.getStats(activeCall.conversationId);
  }

  /** Used by QA test automation. */
  enableFakeMediaDevices(): void {
    const cameras = [
      {deviceId: 'ff0000', groupId: 'fakeCamera1', kind: 'videoinput', label: 'Red cam'},
      {deviceId: '00ff00', groupId: 'fakeCamera2', kind: 'videoinput', label: 'Green cam'},
      {deviceId: '0000ff', groupId: 'fakeCamera3', kind: 'videoinput', label: 'Blue cam'},
    ];
    const microphones = [
      {deviceId: '440', groupId: 'fakeMic1', kind: 'audioinput', label: 'First mic'},
      {deviceId: '100', groupId: 'fakeMic2', kind: 'audioinput', label: 'Second mic'},
    ];
    navigator.mediaDevices.enumerateDevices = () => Promise.resolve(cameras.concat(microphones) as MediaDeviceInfo[]);

    navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
      const audioSet = constraints.audio as MediaTrackConstraintSet;
      const audio = audioSet ? generateAudioTrack(audioSet) : [];

      const videoSet = constraints.video as MediaTrackConstraintSet;
      const video = videoSet ? generateVideoTrack(videoSet) : [];

      return Promise.resolve(new MediaStream(audio.concat(video)));
    };

    function generateAudioTrack(constraints: MediaTrackConstraintSet): MediaStreamTrack[] {
      const constrainMatchMock = {exact: undefined} as ConstrainDOMStringParameters;
      const constrainMatch = (constraints.deviceId as ConstrainDOMStringParameters) || constrainMatchMock;
      const hz = (constrainMatch.exact as string) || microphones[0].deviceId;
      const context = new window.AudioContext();
      const osc = context.createOscillator(); // instantiate an oscillator
      osc.type = 'sine'; // this is the default - also square, sawtooth, triangle
      osc.frequency.value = parseInt(hz, 10); // Hz
      const dest = context.createMediaStreamDestination();
      osc.connect(dest); // connect it to the destination
      osc.start(0);

      return dest.stream.getAudioTracks();
    }

    function generateVideoTrack(constraints: MediaTrackConstraintSet): MediaStreamTrack[] {
      const constrainMatchMock = {exact: undefined} as ConstrainDOMStringParameters;
      const constrainMatch = (constraints.deviceId as ConstrainDOMStringParameters) || constrainMatchMock;
      const color = (constrainMatch.exact as string) || cameras[0].deviceId;
      const width = 300;
      const height = 240;
      const canvas = document.createElement('canvas');
      canvas.height = height;
      canvas.width = width;
      const ctx = canvas.getContext('2d');
      setInterval(() => {
        ctx.fillStyle = `#${color}`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, Math.random() * 10, Math.random() * 10);
      }, 500);
      // Typings missing for: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
      const stream = (canvas as any).captureStream(25);
      return stream.getVideoTracks();
    }

    navigator.mediaDevices.ondevicechange(null);
  }

  async reprocessNotifications(notificationId?: string) {
    const isEncryptedEvent = (event: any): event is ConversationOtrMessageAddEvent => {
      return event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD;
    };

    const clientId = this.eventRepository.currentClient().id;
    this.logger.log(`Your current client has ID "${clientId}".`);

    const notifications = await this.eventRepository.notificationService.getAllNotificationsForClient(clientId);
    this.logger.log(
      `The notification stream has "${notifications.length}" notifications in total for your current client.`,
    );

    if (notificationId) {
      this.logger.log(`You've set a filter, so only notification with ID "${notificationId}" will be processed...`);
    }

    const filteredNotifications = notifications.filter(notification =>
      notificationId ? notification.id === notificationId : true,
    );

    for (const {payload} of filteredNotifications) {
      for (const event of payload) {
        if (isEncryptedEvent(event)) {
          this.logger.log(`Processing event type "${event.type}" from "${event.time}"...`);
          await this.cryptographyRepository.handleEncryptedEvent(event);
        }
      }
    }
  }

  injectLegalHoldLeaveEvent(includeSelf = false, maxUsers = Infinity) {
    const conversation = this.conversationState.activeConversation();
    let users = [];
    if (includeSelf) {
      users.push(this.userState.self().id);
    }
    users.push(...conversation.participating_user_ids());
    users = users.slice(0, maxUsers);
    return this.eventRepository['handleEvent'](
      {
        category: MessageCategory.NONE,
        conversation: conversation.id,
        data: {reason: MemberLeaveReason.LEGAL_HOLD_POLICY_CONFLICT, user_ids: users},
        from: this.userState.self().id,
        id: createRandomUuid(),
        time: conversation.getNextIsoDate(),
        type: CONVERSATION_EVENT.MEMBER_LEAVE,
      } as EventRecord,
      EventRepository.SOURCE.WEB_SOCKET,
    );
  }

  blockUserForLegalHold(userId: string) {
    const conversation = this.conversationState.activeConversation();
    return this.eventRepository['handleEvent'](
      {
        connection: {
          conversation: conversation.id,
          from: this.userState.self().id,
          last_update: conversation.getNextIsoDate(),
          message: ' ',
          status: ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT,
          to: userId,
        },
        type: USER_EVENT.CONNECTION,
      } as unknown as EventRecord,
      EventRepository.SOURCE.WEB_SOCKET,
    );
  }
}
