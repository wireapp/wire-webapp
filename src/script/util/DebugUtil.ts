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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {
  BackendEvent,
  ConversationEvent,
  ConversationOtrMessageAddEvent,
  CONVERSATION_EVENT,
  USER_EVENT,
} from '@wireapp/api-client/lib/event/';
import type {Notification, NotificationList} from '@wireapp/api-client/lib/notification/';
import {FEATURE_KEY, FeatureStatus} from '@wireapp/api-client/lib/team/feature/';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {NotificationSource} from '@wireapp/core/lib/notification';
import {DatabaseKeys} from '@wireapp/core/lib/notification/NotificationDatabaseRepository';
import {Encoder, Decoder} from 'bazinga64';
import Dexie from 'dexie';
import keyboardjs from 'keyboardjs';
import {observable} from 'knockout';
import {$createTextNode, $getRoot, LexicalEditor} from 'lexical';
import {container} from 'tsyringe';

import {AvsDebugger} from '@wireapp/avs-debugger';

import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallState} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import {ClientRepository} from 'Repositories/client';
import {ClientState} from 'Repositories/client/ClientState';
import {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {isMLSCapableConversation} from 'Repositories/conversation/ConversationSelectors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {EventRecord, StorageRepository, StorageSchemata} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {disableForcedErrorReporting} from 'Repositories/tracking/Telemetry.helpers';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {getStorage} from 'Util/localStorage';
import {getLogger, Logger} from 'Util/Logger';

import {TIME_IN_MILLIS} from './TimeUtil';
import {createUuid} from './uuid';

import {E2EIHandler} from '../E2EIdentity';
import {checkVersion} from '../lifecycle/newVersionHandler';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';
import {ViewModelRepositories} from '../view_model/MainViewModel';

export class DebugUtil {
  private readonly logger: Logger;
  private readonly callingRepository: CallingRepository;
  private readonly clientRepository: ClientRepository;
  private readonly connectionRepository: ConnectionRepository;
  /** Used by QA test automation. */
  public readonly conversationRepository: ConversationRepository;
  private readonly eventRepository: EventRepository;
  private readonly propertiesRepository: PropertiesRepository;
  private readonly storageRepository: StorageRepository;
  private readonly messageRepository: MessageRepository;
  /** Used by QA test automation. */
  public readonly userRepository: UserRepository;
  /** Used by QA test automation. */
  public readonly Dexie: typeof Dexie;

  constructor(
    repositories: ViewModelRepositories,
    private readonly clientState = container.resolve(ClientState),
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly callState = container.resolve(CallState),
    private readonly core = container.resolve(Core),
    private readonly apiClient = container.resolve(APIClient),
  ) {
    this.Dexie = Dexie;

    const {calling, client, connection, conversation, event, user, storage, message, properties} = repositories;
    this.callingRepository = calling;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.connectionRepository = connection;
    this.eventRepository = event;
    this.storageRepository = storage;
    this.userRepository = user;
    this.messageRepository = message;
    this.propertiesRepository = properties;

    this.logger = getLogger('DebugUtil');

    keyboardjs.bind(['command+shift+1', 'ctrl+shift+1'], this.toggleDebugUi);

    // If the debugger marked as active in the LocalStorage, install the Web Component
    this.setupAvsDebugger();
  }

  async importEvents() {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      const data = await file.text();
      const notificationResponse: NotificationList = JSON.parse(data);
      const startTime = performance.now();

      for (const notification of notificationResponse.notifications) {
        const events = this.core.service.notification.handleNotification(
          notification,
          NotificationSource.NOTIFICATION_STREAM,
          false,
        );

        for await (const event of events) {
          await this.eventRepository.importEvents([event]);
        }
      }

      const endTime = performance.now();
      this.logger.info(
        `Importing ${notificationResponse.notifications.length} event(s) took ${endTime - startTime} milliseconds`,
      );
    } catch (error) {
      this.logger.error(`Failed to import events: ${error}`);
    }
  }

  addCallParticipants(number: number) {
    const call = this.callState.activeCalls()[0];

    if (!call) {
      return;
    }

    const participants = new Array(number).fill(0).map((_, i) => new Participant(new User(), `some-client-id-${i}`));
    participants.forEach(participant => call.addParticipant(participant));
  }

  /** will print all the ids of entities that show on screen (userIds, conversationIds, messageIds) */
  toggleDebugUi = (): void => {
    const logMLSInfo = async (event: Event) => {
      const eventTarget = event.currentTarget;
      if (!(eventTarget instanceof HTMLDivElement)) {
        return;
      }
      const value = eventTarget.innerText;
      const localConversation = this.conversationState.conversations().find(({id}) => id === value);

      if (!localConversation || !isMLSCapableConversation(localConversation)) {
        return;
      }

      const {id, groupId, domain} = localConversation;
      const remoteConversation = await this.core.service?.conversation.getConversation({id, domain});
      const epochCC = await this.core.service?.mls?.getEpoch(groupId);
      const membersCC = (await this.core.service?.mls?.getClientIds(groupId))?.reduce<Record<string, string[]>>(
        (acc, curr) => {
          acc[curr.userId] = acc[curr.userId] ? [...acc[curr.userId], curr.clientId] : [curr.clientId];
          return acc;
        },
        {},
      );

      this.logger.info({
        id,
        groupId,
        epochCC: Number(epochCC),
        epochRemote: remoteConversation?.epoch,
        membersCC,
      });
    };

    const removeDebugInfo = (els: NodeListOf<HTMLElement>) => els.forEach(el => el.parentNode?.removeChild(el));

    const addDebugInfo = (els: NodeListOf<HTMLElement>) =>
      els.forEach(el => {
        const debugInfo = document.createElement('div');
        debugInfo.classList.add('debug-info');
        const value = el.dataset.uieUid;
        if (value) {
          debugInfo.textContent = value;
          el.appendChild(debugInfo);
        }

        const isConversation = el.dataset.uieName === 'item-conversation';

        if (!isConversation) {
          return;
        }
        debugInfo.addEventListener('click', logMLSInfo);
      });

    const debugInfos = document.querySelectorAll<HTMLElement>('.debug-info');
    const isShowingDebugInfo = debugInfos.length > 0;

    if (isShowingDebugInfo) {
      removeDebugInfo(debugInfos);
    } else {
      const debugElements = document.querySelectorAll<HTMLElement>(
        '.message[data-uie-uid], .conversation-list-cell[data-uie-uid], [data-uie-name=sender-name]',
      );
      addDebugInfo(debugElements);
    }
  };

  breakLastNotificationId() {
    return this.storageRepository.storageService.update(
      StorageSchemata.OBJECT_STORE.AMPLIFY,
      DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION,
      {value: createUuid(1)},
    );
  }

  enableCameraBlur(flag: boolean) {
    return this.callingRepository.switchVideoBackgroundBlur(flag);
  }

  reconnectWebSocket({dryRun} = {dryRun: false}) {
    const teamFeatures = this.teamState.teamFeatures();
    const useAsyncNotificationStream =
      teamFeatures?.[FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]?.status === FeatureStatus.ENABLED;
    const useLegacyNotificationStream = !useAsyncNotificationStream;
    return this.eventRepository.connectWebSocket(this.core, useLegacyNotificationStream, () => {}, dryRun);
  }

  async reconnectWebSocketWithLastNotificationIdFromBackend({dryRun} = {dryRun: false}) {
    return this.reconnectWebSocket({dryRun});
  }

  async updateActiveConversationKeyPackages() {
    const groupId = this.conversationState.activeConversation()?.groupId;
    if (groupId) {
      return this.core.service?.mls?.renewKeyMaterial(groupId);
    }
  }

  async enablePressSpaceToUnmute() {
    this.propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE, true);
  }

  async disablePressSpaceToUnmute() {
    this.propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE, false);
  }

  setupAvsDebugger() {
    if (this.isEnabledAvsDebugger()) {
      this.enableAvsDebugger(true);
    }
  }

  enableAvsDebugger(enable: boolean): boolean {
    const storage = getStorage();

    if (storage === undefined) {
      return false;
    }
    if (enable) {
      AvsDebugger.initTrackDebugger();
    } else {
      AvsDebugger.destructTrackDebugger();
    }

    storage.setItem('avs-debugger-enabled', `${enable}`);
    return enable;
  }

  isEnabledAvsDebugger(): boolean {
    const storage = getStorage();

    if (storage === undefined) {
      return false;
    }

    const isEnabled = storage.getItem('avs-debugger-enabled');
    return isEnabled === 'true';
  }

  isEnabledAvsRustSFT(): boolean {
    const storage = getStorage();

    if (storage === undefined) {
      return false;
    }

    const isEnabled = storage.getItem('avs-rust-sft-enabled');
    return isEnabled === 'true';
  }

  enableAvsRustSFT(enable: boolean): boolean {
    const storage = getStorage();

    if (storage === undefined) {
      return false;
    }
    storage.setItem('avs-rust-sft-enabled', `${enable}`);
    return enable;
  }

  /** Used by QA test automation. */
  blockAllConnections(): Promise<void[]> {
    const blockUsers = this.userState.users().map(userEntity => this.connectionRepository.blockUser(userEntity));
    return Promise.all(blockUsers);
  }

  async resetIdentity(): Promise<void> {
    const proteusService = this.core.service!.proteus;
    await proteusService['cryptoClient'].debugResetIdentity();
  }

  /** Used by QA test automation. */
  async breakSession(userId: QualifiedId, clientId: string): Promise<void> {
    const proteusService = this.core.service!.proteus;
    const sessionId = proteusService.constructSessionId(userId, clientId);
    await proteusService['cryptoClient'].debugBreakSession(sessionId);
  }

  async setTeamSupportedProtocols(supportedProtocols: ConversationProtocol[], defaultProtocol?: ConversationProtocol) {
    const {teamId} = await this.userRepository.getSelf();
    if (!teamId) {
      throw new Error('teamId of self user is undefined');
    }

    const mlsFeature = this.teamState.teamFeatures()?.mls;

    if (!mlsFeature) {
      throw new Error('MLS feature is not enabled');
    }

    const response = await this.apiClient.api.teams.feature.putMLSFeature(teamId, {
      config: {...mlsFeature.config, supportedProtocols, defaultProtocol: defaultProtocol || supportedProtocols[0]},
      status: FeatureStatus.ENABLED,
    });

    return response;
  }

  /** Used by QA test automation. */
  async setMLSMigrationConfig(
    isEnabled = true,
    config = {
      startTime: new Date().toISOString(),
      finaliseRegardlessAfter: new Date(Date.now() + TIME_IN_MILLIS.YEAR).toISOString(),
    },
  ) {
    const {teamId} = await this.userRepository.getSelf();

    if (!teamId) {
      throw new Error('teamId of self user is undefined');
    }

    const response = await this.apiClient.api.teams.feature.putMLSMigrationFeature(teamId, {
      config,
      status: isEnabled ? FeatureStatus.ENABLED : FeatureStatus.DISABLED,
    });

    return response;
  }

  /** Used by QA test automation. */
  triggerVersionCheck(baseVersion: string): Promise<string | void> {
    return checkVersion(baseVersion);
  }

  /**
   * will allow to programatically add text in the message input.
   * This is used by QA to fill the input
   * @param text the text to add to the input
   */
  inputText(text: string) {
    // This is a hacky way of accessing the lexical editor directly from the DOM element
    const lexicalEditor = (document.querySelector<HTMLElement>('[data-uie-name=input-message]') as any)
      .__lexicalEditor as LexicalEditor;

    lexicalEditor.update(() => {
      const root = $getRoot().getLastChild()!;
      const textNode = $createTextNode(text);
      // the "as any" can be removed when this issue is fixed https://github.com/facebook/lexical/issues/5502
      (root as any).append(textNode);
    });
  }

  // Used by QA to trigger a focus event on the app (in order to trigger the update of the team feature-config)
  simulateAppToForeground() {
    window.dispatchEvent(new FocusEvent('focus'));
  }

  setE2EICertificateTtl(ttl: number) {
    E2EIHandler.getInstance().certificateTtl = ttl;
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
        description: 'an interesting article about the past',
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
        type: 'article',
        url,
      });
    };
  }

  /** Used by QA test automation. */
  isSendingMessage(): boolean {
    return this.core.service!.conversation.isSendingMessage();
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
    const clientId = this.clientState.currentClient?.id;
    const userId = this.userState.self().id;

    const isOTRMessage = (notification: BackendEvent) => notification.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD;
    const isInCurrentConversation = (notification: ConversationEvent) => notification.conversation === conversationId;
    const wasSentByOurCurrentClient = (notification: ConversationOtrMessageAddEvent) =>
      notification.from === userId && notification.data && notification.data.sender === clientId;
    const hasExpectedTimestamp = (notification: ConversationOtrMessageAddEvent, dateTime: Date) =>
      notification.time === dateTime.toISOString();
    const conversation = await this.conversationRepository.getConversationById({domain: '', id: conversationId});
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
    const conversation = await this.conversationRepository.getConversationById(event.qualified_conversation);
    const user = await this.userRepository.getUserById(event.qualified_from || {domain: '', id: event.from});

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

  /** Used by QA test automation. */
  getCallingLogs(): string {
    return this.callingRepository['callLog'].join('\n');
  }

  getActiveCallStats() {
    const activeCall = this.callState.joinedCall();
    if (!activeCall) {
      throw new Error('no active call found');
    }
    return this.callingRepository.getStats(activeCall.conversation.qualifiedId);
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

  injectLegalHoldLeaveEvent(includeSelf = false, maxUsers = Infinity) {
    const conversation = this.conversationState.activeConversation();
    let users = [];
    if (includeSelf) {
      users.push(this.userState.self().qualifiedId);
    }
    users.push(...conversation.participating_user_ids());
    users = users.slice(0, maxUsers);
    return this.eventRepository['handleEvent'](
      {
        event: {
          conversation: conversation.id,
          data: {
            reason: MemberLeaveReason.LEGAL_HOLD_POLICY_CONFLICT,
            user_ids: users.map(({id}) => id),
            qualified_user_ids: users,
          },
          from: this.userState.self().id,
          time: conversation.getNextIsoDate(),
          type: CONVERSATION_EVENT.MEMBER_LEAVE,
        },
      },
      EventRepository.SOURCE.WEB_SOCKET,
    );
  }

  blockUserForLegalHold(userId: string) {
    const conversation = this.conversationState.activeConversation();
    return this.eventRepository['handleEvent'](
      {
        event: {
          connection: {
            conversation: conversation.id,
            from: this.userState.self().id,
            last_update: conversation.getNextIsoDate(),
            message: ' ',
            status: ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT,
            to: userId,
          },
          type: USER_EVENT.CONNECTION,
        } as BackendEvent,
      },
      EventRepository.SOURCE.WEB_SOCKET,
    );
  }

  // Used by QA test automation, allows to disable or enable the forced error reporting
  disableForcedErrorReporting() {
    return disableForcedErrorReporting();
  }

  /**
   * Export all data from an IndexedDB database
   *
   * @param {IDBDatabase} idbDatabase The database to export from
   * @return {Promise<string>}
   */
  static exportToJson(idbDatabase: IDBDatabase) {
    return new Promise<string>((resolve, reject) => {
      const exportObject: Record<string, any[]> = {};

      if (idbDatabase.objectStoreNames.length === 0) {
        resolve(JSON.stringify(exportObject, DebugUtil.jsonReplacer));
        return;
      }

      const tx = idbDatabase.transaction(idbDatabase.objectStoreNames, 'readonly');
      tx.addEventListener('error', reject);

      let doneStores = 0;

      for (const storeName of idbDatabase.objectStoreNames) {
        const store = tx.objectStore(storeName);
        const isOutOfLine = store.keyPath === null; // out-of-line keys
        const all: any[] = [];

        store.openCursor().addEventListener('success', ev => {
          const cursor = (ev.target as any)?.result as IDBCursorWithValue | null;
          if (cursor) {
            if (isOutOfLine) {
              all.push({__key: cursor.key, __value: cursor.value});
            } else {
              all.push(cursor.value);
            }
            cursor.continue();
          } else {
            exportObject[storeName] = all;
            doneStores++;
            if (doneStores === idbDatabase.objectStoreNames.length) {
              resolve(JSON.stringify(exportObject, DebugUtil.jsonReplacer));
            }
          }
        });
      }
    });
  }

  /**
   * Import data from JSON into an IndexedDB database.
   * This does not delete any existing data from the database, so keys may clash.
   *
   * @param {IDBDatabase} idbDatabase Database to import into
   * @param {string}      json        Data to import, one key per object store
   * @return {Promise<void>}
   */
  static importFromJson(idbDatabase: IDBDatabase, json: string) {
    return new Promise<void>((resolve, reject) => {
      // const importObject: Record<string, any[]> = JSON.parse(json) || {};
      const importObject = JSON.parse(json, DebugUtil.jsonReviver);

      const storeNames = Array.from(idbDatabase.objectStoreNames || []);

      // If nothing to do, resolve
      if (storeNames.length === 0) {
        resolve();
        return;
      }

      const tx = idbDatabase.transaction(storeNames, 'readwrite');
      tx.addEventListener('error', reject);

      let remainingStores = storeNames.length;

      for (const storeName of storeNames) {
        const store = tx.objectStore(storeName);
        const items = importObject[storeName] || [];

        // Detect mode
        const isOutOfLine = store.keyPath === null;
        const hasKeyGenerator = (store as any).autoIncrement === true; // spec allows reading this

        if (items.length === 0) {
          // Done with this store
          if (--remainingStores === 0) {
            resolve();
          }
          continue;
        }

        let processed = 0;

        for (const entry of items) {
          try {
            if (isOutOfLine) {
              if (hasKeyGenerator) {
                // key generator: we can omit explicit key
                store.add(entry.__value ?? entry);
              } else {
                // no key generator: MUST provide key
                const key = entry?.__key;
                const val = entry?.__value ?? entry;
                // use put to avoid DuplicateKeyError if data already exists
                store.put(val, key);
              }
            } else {
              // inline keyPath: key is inside value object
              const val = entry?.__value ?? entry;
              store.put(val);
            }
          } catch (e) {
            // Let the transaction onerror catch anything unexpected
            // but keep flowing—IndexedDB will queue requests anyway.
            // You can log e here if you want finer granularity.
          } finally {
            processed++;
            if (processed === items.length) {
              // Finished this store
              if (--remainingStores === 0) {
                resolve();
              }
            }
          }
        }
      }
    });
  }

  /**
   * Clear a database
   *
   * @param {IDBDatabase} idbDatabase The database to delete all data from
   * @return {Promise<void>}
   */
  static clearDatabase(idbDatabase: IDBDatabase) {
    return new Promise<void>((resolve, reject) => {
      const transaction = idbDatabase.transaction(idbDatabase.objectStoreNames, 'readwrite');
      transaction.addEventListener('error', reject);

      let count = 0;
      for (const storeName of idbDatabase.objectStoreNames) {
        transaction
          .objectStore(storeName)
          .clear()
          .addEventListener('success', () => {
            count++;
            if (count === idbDatabase.objectStoreNames.length) {
              // Cleared all object stores
              resolve();
            }
          });
      }
      // If DB has zero stores, resolve immediately
      if (idbDatabase.objectStoreNames.length === 0) {
        resolve();
      }
    });
  }

  // ================== Minimal private utilities ==================

  private async _listDbNames(): Promise<string[]> {
    let names: string[] = [];
    try {
      if (typeof indexedDB.databases === 'function') {
        const metas = await indexedDB.databases();
        names = (metas || []).map(m => m?.name).filter((n): n is string => !!n);
      } else {
        names = await this.Dexie.getDatabaseNames();
      }
    } catch (e) {
      this.logger.error('Failed to enumerate IndexedDB databases', e);
      names = [];
    }

    // 🚫 Ignore secrets-* DBs
    const filtered = names.filter(n => !n.startsWith('secrets-'));
    return filtered;
  }

  private _openDb(name: string, version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error(`Failed to open DB ${name}`));
      req.onupgradeneeded = () => resolve(req.result); // we’re not changing schema
    });
  }

  /** Dump ALL databases of the origin into one JSON file (using exportToJson per DB). */
  public async dumpIndexedDB(): Promise<void> {
    const dbNames = await this._listDbNames();
    if (!dbNames.length) {
      this.logger.info('No IndexedDB databases found for this origin.');
      return;
    }

    const bundle: {
      format: 'SimpleMultiDBDump';
      version: 1;
      origin: string;
      createdAt: string;
      databases: Array<{name: string; data: string}>;
    } = {
      format: 'SimpleMultiDBDump',
      version: 1,
      origin: location.origin,
      createdAt: new Date().toISOString(),
      databases: [],
    };

    for (const name of dbNames) {
      const db = await this._openDb(name);
      try {
        const json = await DebugUtil.exportToJson(db);
        bundle.databases.push({name: db.name, data: json});
      } finally {
        try {
          db.close();
        } catch {}
      }
    }

    const fileName = `wire-idb-dump-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(bundle)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    this.logger.info(`IndexedDB dump complete: ${fileName} (DBs: ${bundle.databases.length})`);
  }

  /**
   * Restore from a JSON dump:
   * - Clears ALL stores in ALL existing DBs
   * - Imports matching DB data via importFromJson
   * (No schema creation, no cross-origin.)
   */
  public async restoreIndexedDB(): Promise<void> {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{description: 'JSON', accept: {'application/json': ['.json']}}],
      excludeAcceptAllOption: false,
      multiple: false,
    });
    const file = await handle.getFile();
    const text = await file.text();

    const parsed = JSON.parse(text);
    if (parsed?.format !== 'SimpleMultiDBDump' || parsed?.version !== 1) {
      throw new Error('Unsupported dump format/version (expected SimpleMultiDBDump v1).');
    }

    if (
      !window.confirm('This will ERASE all local IndexedDB data for this origin and then import the dump. Continue?')
    ) {
      return;
    }

    const existing = await this._listDbNames();

    // 1) Clear everything first
    for (const name of existing) {
      const db = await this._openDb(name);
      try {
        await DebugUtil.clearDatabase(db);
      } finally {
        try {
          db.close();
        } catch {}
      }
    }

    // 2) Import per-DB (only into DBs that exist today; no schema creation)
    for (const dbEntry of parsed.databases as Array<{name: string; data: string}>) {
      if (!existing.includes(dbEntry.name)) {
        this.logger.warn(`[restore] Skipping DB not present locally: ${dbEntry.name}`);
        continue;
      }
      const db = await this._openDb(dbEntry.name);
      try {
        await DebugUtil.importFromJson(db, dbEntry.data);
        this.logger.info(`[restore] Imported ${dbEntry.name}`);
      } finally {
        try {
          db.close();
        } catch {}
      }
    }

    this.logger.info('IndexedDB restore complete.');
    // eslint-disable-next-line no-alert
    alert('IndexedDB restore complete.');
    window.location.reload();
  }

  /** Erase ALL databases (all stores) for this origin (no import). */
  public async eraseIndexedDB(): Promise<void> {
    const names = await this._listDbNames();
    let wipedStores = 0;
    for (const name of names) {
      const db = await this._openDb(name);
      try {
        // count stores before clearing
        wipedStores += db.objectStoreNames.length;
        await DebugUtil.clearDatabase(db);
        this.logger.info(`[erase] Cleared ${name}`);
      } finally {
        try {
          db.close();
        } catch {}
      }
    }
    this.logger.info(`IndexedDB erase complete. Databases: ${names.length}, Stores cleared: ${wipedStores}`);
    // eslint-disable-next-line no-alert
    alert(`IndexedDB erased.\nDBs: ${names.length}\nStores cleared: ${wipedStores}`);
  }

  // --- Replacer: only ArrayBuffer & Uint8Array -> base64 wrappers ---
  static jsonReplacer(_key: string, value: any) {
    if (value instanceof Uint8Array) {
      return {__type: 'Uint8Array', __b64: Encoder.toBase64(value).asString};
    }
    if (value instanceof ArrayBuffer) {
      return {__type: 'ArrayBuffer', __b64: Encoder.toBase64(value).asString};
    }
    return value;
  }

  // --- Reviver: restore those wrappers back to real binaries ---
  static jsonReviver(_key: string, value: any) {
    if (value && value.__b64 && value.__type === 'Uint8Array') {
      return Decoder.fromBase64(value.__b64).asBytes;
    }
    if (value && value.__b64 && value.__type === 'ArrayBuffer') {
      return Decoder.fromBase64(value.__b64).asBytes;
    }
    return value;
  }
}

export function observableWithProxy(
  initialValue: any,
  name = 'unnamed',
  extraInformation: Record<string, string> = {},
) {
  const obs = observable(initialValue);

  return new Proxy(obs, {
    apply(target, thisArg, args) {
      if (args.length) {
        // eslint-disable-next-line no-console
        console.trace(`DEBUG: Proxy Observable "${name}" set to:`, {args: args[0], ...extraInformation});
      }
      return Reflect.apply(target, thisArg, args);
    },
  });
}
