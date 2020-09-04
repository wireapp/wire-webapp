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

import type {BackendEvent, ConversationEvent, ConversationOtrMessageAddEvent} from '@wireapp/api-client/dist/event';
import {CONVERSATION_EVENT} from '@wireapp/api-client/dist/event';
import {util as ProteusUtil} from '@wireapp/proteus';
import {getLogger, Logger} from 'Util/Logger';
import Dexie from 'dexie';
import {checkVersion} from '../lifecycle/newVersionHandler';
import {downloadFile} from './util';
import {StorageSchemata} from '../storage/StorageSchemata';
import {EventRepository} from '../event/EventRepository';
import type {Notification, NotificationList} from '@wireapp/api-client/dist/notification/';
import {ViewModelRepositories} from '../view_model/MainViewModel';
import {CallingRepository} from '../calling/CallingRepository';
import {ClientRepository} from '../client/ClientRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRecord, StorageRepository} from '../storage';
import {UserRepository} from '../user/UserRepository';
import {ContentMessage} from '../entity/message/ContentMessage';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {UserId} from '../calling/Participant';

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
  /** Used by QA test automation. */
  public readonly userRepository: UserRepository;
  /** Used by QA test automation. */
  public readonly $: JQueryStatic;
  /** Used by QA test automation. */
  public readonly Dexie: typeof Dexie;

  constructor(repositories: ViewModelRepositories) {
    this.$ = $;
    this.Dexie = Dexie;

    const {calling, client, connection, conversation, cryptography, event, user, storage} = repositories;
    this.callingRepository = calling;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.connectionRepository = connection;
    this.cryptographyRepository = cryptography;
    this.eventRepository = event;
    this.storageRepository = storage;
    this.userRepository = user;

    this.logger = getLogger('DebugUtil');
  }

  /** Used by QA test automation. */
  blockAllConnections(): Promise<void[]> {
    const blockUsers = this.userRepository.users().map(userEntity => this.connectionRepository.blockUser(userEntity));
    return Promise.all(blockUsers);
  }

  /** Used by QA test automation. */
  breakSession(userId: string, clientId: string): Promise<void> {
    const sessionId = `${userId}@${clientId}`;
    const cryptobox = this.cryptographyRepository.cryptobox;
    return cryptobox
      .session_load(sessionId)
      .then(cryptoboxSession => {
        cryptoboxSession.session.session_states = {};

        const record = {
          created: Date.now(),
          id: sessionId,
          serialised: cryptoboxSession.session.serialise(),
          version: 'broken_by_qa',
        };

        cryptobox['cachedSessions'].set(sessionId, cryptoboxSession);

        const sessionStoreName = StorageSchemata.OBJECT_STORE.SESSIONS;
        return this.storageRepository.storageService.update(sessionStoreName, sessionId, record);
      })
      .then(() => this.logger.log(`Corrupted Session ID '${sessionId}'`));
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
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAADiUlEQVR4nO3dS67cMAwEwHeWuf8dkxOMDVDTJiVXA1pq+FF5EyDJ3+fz+XfCuUp3bzv3Wj1/3Q288bF26rV6wNJr5ICl18gBS6+RA5ZeIwcsvUbOJaxpSTxW9V5HzWkBC6xIwAIrErDAigQssCIBC6xIwAIrkgisu6VXT7Vm4l5HTnkPsIbllPcAa1hOeQ+whuWU9wBrWE55D7CG5ZT3AGtYTnmP18PqmGOnGas1wQILrGm9ggUWWGDts3SwwAILrH2WDhZYYIH1+6V35JSPp1oTrFDAOmSQaQHrkEGmBaxDBpkWsA4ZZFrAOmSQaQHr5Y+1Mn9id6e8B1hglQMWWJGABVYkYIEVCVhgRQIWWJGUYe10qguo3uuqucsBCyywpj0yWGCBBRZYJxywwAJr2iODdQHrcsoXZNpHcErAAisSsMCKBCywIgELrEjAAisSsMCKpPznWCuZ9Fgrv/k0nmq9jo8HLLDAAgusxwdN9JK8+2SvYIEVqQcWWJF6YIEVqbcVrBSCSXg65u+YI7EDsAJLBQusyFLBAiuyVLDAiiwVLLAiSwULrMhSwbr5yxQdgySG7IA1acaOOcAK1Zs0I1g3AQusbZaeqjdpRrBuAhZY2yw9VW/SjGDdBCywtll6qt6kGY+BdZfU706pt9JP4iPo6AeshoAF1uP9gLUQsMAC6+F+wFoIWGCB9XA/r4CVGqT6u4mz0svTc6SS6BWshV6eniMVsMCKBCywIgELrEjAAisSsMCKZBSsnQLWdRI1wSreA+s6YBXvgXUdsIr3wLoOWMV7YF0HrOI9sK4DVvEeWNd5xX/dW00HrGmp9gpWcalggRVZKlhgRZYKFliRpYIFVmSpYIEVWSpYC7CmJfHI1XsdH0FqjkRNsIr3wAILLLCuAxZYkYAFViRggRUJWC+A1bH0ab0+jWenAxZYYE3rFSywwAKrVnPaY1XTDQKsAb2CBRZYYNVq7vSQiV5XZkzsByywIvsBC6zIfsACK7IfsMCK7AcssCL7AQusyH7AAiuyn9fDSs3YUXPSRwBWaMaOmmCBFakJFliRmmCBFakJFliRmmCBFal5BKyO7PQRJPpJ7Gb17reABRZYYP1+N6t3vwUssMAC6/e7Wb37LWCBBRZYv9/N6t1vecU/btvx8UyCvNJr9R5YoYA1AAVYYI09icWtBKwBKMACa+xJLG4lYA1AAdZ5sP4Df5GjbWdSI2IAAAAASUVORK5CYII=',
        },
        title: 'A link to the past',
        url,
      });
    };
  }

  getLastMessagesFromDatabase(
    amount = 10,
    conversationId = this.conversationRepository.active_conversation().id,
  ): EventRecord[] {
    if (this.storageRepository.storageService.db) {
      return this.storageRepository.storageService.db[StorageSchemata.OBJECT_STORE.EVENTS].toArray(
        (records: EventRecord[]) => {
          const messages = records.filter((event: EventRecord) => event.conversation === conversationId);
          return messages.slice(amount * -1).reverse();
        },
      );
    }
    return [];
  }

  haveISentThisMessageToMyOtherClients(
    messageId: string,
    conversationId: string = this.conversationRepository.active_conversation().id,
  ): Promise<void> {
    let recipients: string[] = [];

    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;

    const isOTRMessage = (notification: BackendEvent) => notification.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD;
    const isInCurrentConversation = (notification: ConversationEvent) => notification.conversation === conversationId;
    const wasSentByOurCurrentClient = (notification: ConversationOtrMessageAddEvent) =>
      notification.from === userId && notification.data && notification.data.sender === clientId;
    const hasExpectedTimestamp = (notification: ConversationOtrMessageAddEvent, dateTime: Date) =>
      notification.time === dateTime.toISOString();

    return this.conversationRepository
      .get_conversation_by_id(conversationId)
      .then(conversation => {
        return this.conversationRepository.getMessageInConversationById(conversation, messageId);
      })
      .then(message => {
        return this.eventRepository.notificationService
          .getNotifications(undefined, undefined, EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX)
          .then(({notifications}: NotificationList) => ({
            message,
            notifications,
          }));
      })
      .then(({message, notifications}: {message: ContentMessage; notifications: Notification[]}) => {
        const dateTime = new Date(message.timestamp());
        return notifications
          .flatMap(({payload}) => payload)
          .filter(event => {
            return (
              isOTRMessage(event) &&
              isInCurrentConversation(event) &&
              wasSentByOurCurrentClient(event) &&
              hasExpectedTimestamp(event, dateTime)
            );
          });
      })
      .then(filteredEvents => {
        recipients = filteredEvents.map(event => event.data.recipient);
        return this.clientRepository.getClientsForSelf();
      })
      .then(selfClients => {
        const selfClientIds = selfClients.map(client => client.id);
        const missingClients = selfClientIds.filter(id => recipients.includes(id));
        const logMessage = missingClients.length
          ? `Message was sent to all other "${selfClients.length}" clients.`
          : `Message was NOT sent to the following own clients: ${missingClients.join(',')}`;
        this.logger.info(logMessage);
      })
      .catch(error => this.logger.info(`Message was not sent to other clients. Reason: ${error.message}`, error));
  }

  getEventInfo(
    event: ConversationEvent,
  ): Promise<{conversation?: Conversation; event: ConversationEvent; user?: User}> {
    const debugInformation: {conversation?: Conversation; event: ConversationEvent; user?: User} = {
      conversation: undefined,
      event,
      user: undefined,
    };

    return this.conversationRepository
      .get_conversation_by_id(event.conversation)
      .then((conversation_et: Conversation) => {
        debugInformation.conversation = conversation_et;
        return this.userRepository.getUserById(event.from);
      })
      .then(user_et => {
        debugInformation.user = user_et;
        const logMessage = `Hey ${this.userRepository.self().name()}, this is for you:`;
        this.logger.warn(logMessage, debugInformation);
        this.logger.warn(`Conversation: ${debugInformation.conversation.name()}`, debugInformation.conversation);
        this.logger.warn(`From: ${debugInformation.user.name()}`, debugInformation.user);
        return debugInformation;
      });
  }

  exportCryptobox(): void {
    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;
    const fileName = `cryptobox-${userId}-${clientId}.json`;

    this.cryptographyRepository.cryptobox
      .serialize()
      .then(cryptobox => downloadText(JSON.stringify(cryptobox), fileName));
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
    const activeCall = this.callingRepository.joinedCall();
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
      const audio = (constraints.audio as MediaTrackConstraints)
        ? generateAudioTrack(constraints.audio as MediaTrackConstraints)
        : [];
      const video = (constraints.video as MediaTrackConstraints)
        ? generateVideoTrack(constraints.video as MediaTrackConstraints)
        : [];
      return Promise.resolve(new MediaStream(audio.concat(video)));
    };

    function generateAudioTrack(constraints: MediaTrackConstraints): MediaStreamTrack[] {
      const hz = constraints.deviceId || microphones[0].deviceId;
      const context = new window.AudioContext();
      const osc = context.createOscillator(); // instantiate an oscillator
      osc.type = 'sine'; // this is the default - also square, sawtooth, triangle
      osc.frequency.value = parseInt(`${hz}`, 10); // Hz
      const dest = context.createMediaStreamDestination();
      osc.connect(dest); // connect it to the destination
      osc.start(0);

      return dest.stream.getAudioTracks();
    }

    function generateVideoTrack(constraints: MediaTrackConstraints): MediaStreamTrack[] {
      const color = constraints.deviceId || cameras[0].deviceId;
      const width = 300;
      const height = 240;
      const canvas = document.createElement('canvas');
      canvas.height = height;
      canvas.width = width;
      const ctx = canvas.getContext('2d');
      setInterval(() => {
        ctx.fillStyle = `#${color}`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, Math.random() * 10, Math.random() * 10);
      }, 500);
      // Typings missing for: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
      const stream = (canvas as any).captureStream(25);
      return stream.getVideoTracks();
    }

    navigator.mediaDevices.ondevicechange(null);
  }
}
