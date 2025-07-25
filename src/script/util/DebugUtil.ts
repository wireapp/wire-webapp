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
import {FeatureStatus} from '@wireapp/api-client/lib/team/feature/';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {NotificationSource} from '@wireapp/core/lib/notification';
import {DatabaseKeys} from '@wireapp/core/lib/notification/NotificationDatabaseRepository';
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
    return this.eventRepository.connectWebSocket(this.core, () => {}, dryRun);
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
