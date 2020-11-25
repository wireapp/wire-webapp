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

import {NotificationPreference, WebappProperties} from '@wireapp/api-client/src/user/data';
import {Availability} from '@wireapp/protocol-messaging';
import {amplify} from 'amplify';
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Declension, t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {getUserName} from 'Util/SanitizationUtil';
import {truncate} from 'Util/StringUtil';
import {TIME_IN_MILLIS, formatDuration} from 'Util/TimeUtil';
import {ValidationUtilError} from 'Util/ValidationUtil';
import {getRenderedTextContent} from 'Util/messageRenderer';

import {AudioType} from '../audio/AudioType';
import {TERMINATION_REASON} from '../calling/enum/TerminationReason';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PermissionType} from '../permission/PermissionType';
import {PermissionState} from './PermissionState';

import type {CallingRepository} from '../calling/CallingRepository';
import type {ConnectionEntity} from '../connection/ConnectionEntity';
import {ConversationEphemeralHandler} from '../conversation/ConversationEphemeralHandler';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation} from '../entity/Conversation';
import type {CallMessage} from '../entity/message/CallMessage';
import type {ContentMessage} from '../entity/message/ContentMessage';
import type {DeleteConversationMessage} from '../entity/message/DeleteConversationMessage';
import type {MemberMessage} from '../entity/message/MemberMessage';
import type {Message} from '../entity/message/Message';
import type {MessageTimerUpdateMessage} from '../entity/message/MessageTimerUpdateMessage';
import type {RenameMessage} from '../entity/message/RenameMessage';
import type {SystemMessage} from '../entity/message/SystemMessage';
import type {User} from '../entity/User';
import {SuperType} from '../message/SuperType';
import {SystemMessageType} from '../message/SystemMessageType';
import type {PermissionRepository} from '../permission/PermissionRepository';
import {ContentViewModel} from '../view_model/ContentViewModel';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {AssetRepository} from '../assets/AssetRepository';
import {container} from 'tsyringe';
import {Runtime} from '@wireapp/commons';
import {UserState} from '../user/UserState';
import {ConversationState} from '../conversation/ConversationState';

export interface Multitasking {
  autoMinimize?: ko.Observable<boolean>;
  isMinimized: ko.Observable<boolean> | (() => false);
  resetMinimize?: ko.Observable<boolean>;
}

interface ContentViewModelState {
  multitasking: Multitasking;
  state: () => string | false;
}

interface NotificationContent {
  /** Notification options */
  options: {data: {conversationId: string; messageId: string; messageType: string}};
  /** Timeout for notification */
  timeout: number;
  /** Notification title */
  title: string;
  /** Function to be triggered on click */
  trigger: Function;
}

/**
 * Notification repository to trigger browser and audio notifications.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
export class NotificationRepository {
  private contentViewModelState: ContentViewModelState;
  private readonly callingRepository: CallingRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private readonly notifications: any[];
  private readonly notificationsPreference: ko.Observable<NotificationPreference>;
  private readonly permissionRepository: PermissionRepository;
  private readonly permissionState: ko.Observable<PermissionState | PermissionStatusState>;
  private readonly selfUser: ko.Observable<User>;
  private readonly assetRepository: AssetRepository;

  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: TIME_IN_MILLIS.SECOND * 5,
      TITLE_LENGTH: 38,
    };
  }

  static get EVENTS_TO_NOTIFY(): SuperType[] {
    return [SuperType.CALL, SuperType.CONTENT, SuperType.MEMBER, SuperType.PING, SuperType.REACTION, SuperType.SYSTEM];
  }

  /**
   * Construct a new Notification Repository.
   * @param callingRepository Repository for all call interactions
   * @param conversationRepository Repository for all conversation interactions
   * @param permissionRepository Repository for all permission interactions
   * @param userState Repository for users
   */
  constructor(
    callingRepository: CallingRepository,
    conversationRepository: ConversationRepository,
    permissionRepository: PermissionRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.assetRepository = container.resolve(AssetRepository);
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.permissionRepository = permissionRepository;
    this.contentViewModelState = {multitasking: {isMinimized: () => false}, state: () => false};

    this.logger = getLogger('NotificationRepository');

    this.notifications = [];

    this.subscribeToEvents();
    this.notificationsPreference = ko.observable(NotificationPreference.ON);
    this.notificationsPreference.subscribe(notificationsPreference => {
      const preferenceIsNone = notificationsPreference === NotificationPreference.NONE;
      if (!preferenceIsNone) {
        this.checkPermission();
      }
    });

    this.permissionState = this.permissionRepository.permissionState[PermissionType.NOTIFICATIONS];
    this.selfUser = this.userState.self;
  }

  setContentViewModelStates(
    state: () => string,
    multitasking: {isMinimized: ko.Observable<boolean> | (() => false)},
  ): void {
    this.contentViewModelState = {multitasking, state};
  }

  subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.NOTIFICATION.NOTIFY, this.notify.bind(this));
    amplify.subscribe(WebAppEvents.NOTIFICATION.PERMISSION_STATE, this.updatePermissionState.bind(this));
    amplify.subscribe(WebAppEvents.NOTIFICATION.REMOVE_READ, this.removeReadNotifications.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.NOTIFICATIONS, this.updatedNotificationsProperty.bind(this));
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns Promise that resolves with the permission state
   */
  async checkPermission(): Promise<boolean | void> {
    const isPermitted = await this.checkPermissionState();

    if (typeof isPermitted === 'boolean') {
      return isPermitted;
    }

    if (!Runtime.isSupportingNotifications()) {
      return this.updatePermissionState(PermissionState.UNSUPPORTED);
    }

    if (Runtime.isSupportingPermissions()) {
      const notificationState = this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
      const shouldRequestPermission = notificationState === PermissionStatusState.PROMPT;
      return shouldRequestPermission ? this.requestPermission() : this.checkPermissionState();
    }

    const currentPermission = window.Notification.permission as PermissionState;
    const shouldRequestPermission = currentPermission === PermissionState.DEFAULT;
    return shouldRequestPermission ? this.requestPermission() : this.updatePermissionState(currentPermission);
  }

  /**
   * Close all notifications.
   */
  clearNotifications(): void {
    this.notifications.forEach(notification => {
      notification.close();
      if (notification.data) {
        const {conversationId, messageId} = notification.data;
        this.logger.info(`Notification for '${messageId}' in '${conversationId}' closed on unload.`, notification);
      }
    });
  }

  /**
   * Display browser notification and play sound notification.
   * @returns Resolves when notification has been handled
   */
  notify(
    messageEntity: ContentMessage,
    connectionEntity: ConnectionEntity,
    conversationEntity: Conversation,
  ): Promise<void> {
    const isUserAway = this.selfUser().availability() === Availability.Type.AWAY;
    const isComposite = messageEntity.isComposite();

    if (isUserAway && !isComposite) {
      return Promise.resolve();
    }

    const isUserBusy = this.selfUser().availability() === Availability.Type.BUSY;
    const isSelfMentionOrReply = messageEntity.is_content() && messageEntity.isUserTargeted(this.selfUser().id);
    const isCallMessage = messageEntity.super_type === SuperType.CALL;

    if (isUserBusy && !isSelfMentionOrReply && !isCallMessage && !isComposite) {
      return Promise.resolve();
    }

    const notifyInConversation = conversationEntity
      ? NotificationRepository.shouldNotifyInConversation(conversationEntity, messageEntity, this.selfUser().id)
      : true;

    if (notifyInConversation) {
      this.notifySound(messageEntity);
      return this.notifyBanner(messageEntity, connectionEntity, conversationEntity);
    }

    return Promise.resolve();
  }

  /** Remove notifications from the queue that are no longer unread */
  removeReadNotifications(): void {
    this.notifications.forEach(notification => {
      const {conversationId, messageId, messageType} = notification.data || {};

      if (messageId) {
        this.conversationRepository.isMessageRead(conversationId, messageId).then(isRead => {
          if (isRead) {
            notification.close();
            const messageInfo = messageId
              ? `message '${messageId}' of type '${messageType}'`
              : `'${messageType}' message`;
            this.logger.info(`Removed read notification for ${messageInfo} in '${conversationId}'.`);
          }
        });
      }
    });
  }

  updatedProperties(properties: WebappProperties): void {
    const notificationPreference = properties.settings.notifications;
    return this.notificationsPreference(notificationPreference);
  }

  updatedNotificationsProperty(notificationPreference: NotificationPreference): void {
    return this.notificationsPreference(notificationPreference);
  }

  /**
   * Set the permission state.
   * @param permissionState State of browser permission
   * @returns Resolves with `true` if notifications are enabled
   */
  updatePermissionState(permissionState: PermissionState | PermissionStatusState): Promise<boolean> {
    this.permissionState(permissionState);
    return this.checkPermissionState();
  }

  /**
   * Creates the notification body for calls.
   */
  private createBodyCall(messageEntity: CallMessage): string | void {
    if (messageEntity.is_activation()) {
      return t('notificationVoiceChannelActivate');
    }

    if (messageEntity.is_deactivation() && messageEntity.finished_reason === TERMINATION_REASON.MISSED) {
      return t('notificationVoiceChannelDeactivate');
    }
  }

  /**
   * Creates the notification body for text messages and pictures.
   *
   * @param messageEntity Normal message entity
   * @returns Notification message body
   */
  private createBodyContent(messageEntity: ContentMessage): string | void {
    if (messageEntity.has_asset_text()) {
      for (const assetEntity of messageEntity.assets()) {
        if (assetEntity.is_text()) {
          let notificationText;

          if (assetEntity.isUserMentioned(this.selfUser().id)) {
            notificationText = t('notificationMention', assetEntity.text, {}, true);
          } else if (messageEntity.isUserQuoted(this.selfUser().id)) {
            notificationText = t('notificationReply', assetEntity.text, {}, true);
          } else {
            notificationText = getRenderedTextContent(assetEntity.text);
          }

          return truncate(notificationText, NotificationRepository.CONFIG.BODY_LENGTH);
        }
      }
    }

    if (messageEntity.has_asset_image()) {
      return t('notificationAssetAdd');
    }

    if (messageEntity.has_asset_location()) {
      return t('notificationSharedLocation');
    }

    if (messageEntity.has_asset()) {
      const assetEntity = messageEntity.get_first_asset();

      if (assetEntity.is_audio()) {
        return t('notificationSharedAudio');
      }

      if (assetEntity.is_video()) {
        return t('notificationSharedVideo');
      }

      if (assetEntity.is_file()) {
        return t('notificationSharedFile');
      }
    }
  }

  /**
   * Creates the notification body for people being added to a group conversation.
   *
   * @param messageEntity Member message entity
   * @param Notification message body
   */
  private createBodyMemberJoin(messageEntity: MemberMessage): string {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant) {
      const [otherUserEntity] = messageEntity.userEntities();

      const declension = Declension.ACCUSATIVE;
      const nameOfJoinedUser = getUserName(otherUserEntity, declension);

      const senderJoined = messageEntity.user().id === otherUserEntity.id;
      if (senderJoined) {
        return t('notificationMemberJoinSelf', nameOfJoinedUser, {}, true);
      }

      const substitutions = {user1: messageEntity.user().name(), user2: nameOfJoinedUser};
      return t('notificationMemberJoinOne', substitutions, {}, true);
    }

    const substitutions = {number: messageEntity.userIds().length.toString(), user: messageEntity.user().name()};
    return t('notificationMemberJoinMany', substitutions, {}, true);
  }

  /**
   * Creates the notification body for people being removed from or leaving a group conversation.
   * @note Only show a notification if self user was removed
   *
   * @param messageEntity Member message entity
   * @param Notification message body
   */
  private createBodyMemberLeave(messageEntity: MemberMessage): string | void {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant && !messageEntity.remoteUserEntities().length) {
      return t('notificationMemberLeaveRemovedYou', messageEntity.user().name(), {}, true);
    }
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @param messageEntity Member message entity
   * @param conversationEntity Conversation entity
   */
  private createBodyMemberUpdate(messageEntity?: MemberMessage, conversationEntity?: Conversation): string | void {
    const isGroup = conversationEntity && conversationEntity.isGroup();

    switch (messageEntity.memberMessageType) {
      case SystemMessageType.NORMAL:
        if (isGroup) {
          if (messageEntity.isMemberJoin()) {
            return this.createBodyMemberJoin(messageEntity);
          }
          if (messageEntity.isMemberLeave()) {
            return this.createBodyMemberLeave(messageEntity);
          }
        }
        break;
      case SystemMessageType.CONNECTION_ACCEPTED:
        return t('notificationConnectionAccepted');
      case SystemMessageType.CONNECTION_CONNECTED:
        return t('notificationConnectionConnected');
      case SystemMessageType.CONNECTION_REQUEST:
        return t('notificationConnectionRequest');
      case SystemMessageType.CONVERSATION_CREATE:
        return t('notificationConversationCreate', messageEntity.user().name(), {}, true);
    }
  }

  /**
   * Creates the notification body for obfuscated messages.
   *
   * @param messageEntity Message to obfuscate body for
   * @returns Notification message body
   */
  private createBodyObfuscated(messageEntity: ContentMessage): string {
    if (messageEntity.is_content()) {
      const isSelfMentioned = messageEntity.isUserMentioned(this.selfUser().id);

      if (isSelfMentioned) {
        return t('notificationObfuscatedMention');
      }

      const isSelfQuoted = messageEntity.isUserQuoted(this.selfUser().id);

      if (isSelfQuoted) {
        return t('notificationObfuscatedReply');
      }
    }

    return t('notificationObfuscated');
  }

  /**
   * Creates the notification body for ping.
   * @returns Notification message body
   */
  private createBodyPing(): string {
    return t('notificationPing');
  }

  /**
   * Creates the notification body for reaction.
   * @param messageEntity Fake reaction message entity
   * @returns Notification message body
   */
  private createBodyReaction(messageEntity: any): string {
    return t('notificationReaction', messageEntity.reaction);
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @param messageEntity Member message entity
   * @returns Notification message body
   */
  private createBodySystem(messageEntity: Message): string | void {
    const createBodyMessageTimerUpdate = () => {
      const messageTimer = ConversationEphemeralHandler.validateTimer(
        (messageEntity as MessageTimerUpdateMessage).message_timer,
      );

      if (messageTimer) {
        const timeString = formatDuration(messageTimer).text;
        const substitutions = {time: timeString, user: messageEntity.user().name()};
        return t('notificationConversationMessageTimerUpdate', substitutions, {}, true);
      }
      return t('notificationConversationMessageTimerReset', messageEntity.user().name(), {}, true);
    };

    const createBodyRename = () => {
      const substitutions = {name: (messageEntity as RenameMessage).name, user: messageEntity.user().name()};
      return t('notificationConversationRename', substitutions, {}, true);
    };

    switch ((messageEntity as SystemMessage).system_message_type) {
      case SystemMessageType.CONVERSATION_RENAME: {
        return createBodyRename();
      }
      case SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE: {
        return createBodyMessageTimerUpdate();
      }
      case SystemMessageType.CONVERSATION_DELETE: {
        return (messageEntity as DeleteConversationMessage).caption;
      }
    }
  }

  /**
   * Create notification content.
   *
   * @returns Resolves with the notification content
   */
  private createNotificationContent(
    messageEntity: ContentMessage,
    connectionEntity: ConnectionEntity,
    conversationEntity: Conversation,
  ): Promise<any> {
    const body = this.createOptionsBody(messageEntity, conversationEntity);
    if (!body) {
      return Promise.resolve();
    }
    const shouldObfuscateSender = this.shouldObfuscateNotificationSender(messageEntity);
    return this.createOptionsIcon(shouldObfuscateSender, messageEntity.user()).then(iconUrl => {
      const shouldObfuscateMessage = this.shouldObfuscateNotificationMessage(messageEntity);
      return {
        options: {
          body: shouldObfuscateMessage ? this.createBodyObfuscated(messageEntity) : body,
          data: this.createOptionsData(messageEntity, connectionEntity, conversationEntity),
          icon: iconUrl,
          silent: true, // @note When Firefox supports this we can remove the fix for WEBAPP-731
          tag: this.createOptionsTag(connectionEntity, conversationEntity),
        },
        timeout: NotificationRepository.CONFIG.TIMEOUT,
        title: shouldObfuscateSender
          ? this.createTitleObfuscated()
          : this.createTitle(messageEntity, conversationEntity),
        trigger: this.createTrigger(messageEntity, connectionEntity, conversationEntity),
      };
    });
  }

  /**
   * Selects the type of message that the notification body needs to be created for.
   *
   * @returns The notification message body
   */
  private createOptionsBody(
    messageEntity: Message | CallMessage | ContentMessage | MemberMessage,
    conversationEntity: Conversation,
  ): string | void {
    switch (messageEntity.super_type) {
      case SuperType.CALL:
        return this.createBodyCall(messageEntity as CallMessage);
      case SuperType.CONTENT:
        return this.createBodyContent(messageEntity as ContentMessage);
      case SuperType.MEMBER:
        return this.createBodyMemberUpdate(messageEntity as MemberMessage, conversationEntity);
      case SuperType.PING:
        return this.createBodyPing();
      case SuperType.REACTION:
        return this.createBodyReaction(messageEntity);
      case SuperType.SYSTEM:
        return this.createBodySystem(messageEntity as MemberMessage);
    }
  }

  /**
   * Creates the notification data to help check its content.
   *
   * @returns Notification message data
   */
  private createOptionsData(
    messageEntity: Message,
    connectionEntity: ConnectionEntity,
    conversationEntity: Conversation,
  ): {conversationId: string; messageId: string | undefined; messageType: string} {
    const {id: messageId, type: messageType} = messageEntity;

    return {
      conversationId: this.getConversationId(connectionEntity, conversationEntity),
      messageId: messageId === '0' ? undefined : messageId,
      messageType: messageType,
    };
  }

  /**
   * Creates the notification icon.
   *
   * @param shouldObfuscateSender Sender visible in notification
   * @param userEntity Sender of message
   * @returns Resolves with the icon URL
   */
  private async createOptionsIcon(shouldObfuscateSender: boolean, userEntity: User): Promise<string> {
    const canShowUserImage = userEntity.previewPictureResource() && !shouldObfuscateSender;
    if (canShowUserImage) {
      try {
        return this.assetRepository.generateAssetUrl(userEntity.previewPictureResource());
      } catch (error) {
        if (error instanceof ValidationUtilError) {
          this.logger.error(`Failed to validate an asset URL: ${error.message}`);
        }
      }
    }

    const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();
    return Promise.resolve(isMacOsWrapper ? '' : NotificationRepository.CONFIG.ICON_URL);
  }

  /**
   * Creates the notification tag.
   *
   * @param connectionEntity Connection entity
   * @param conversationEntity Conversation entity
   */
  private createOptionsTag(connectionEntity?: ConnectionEntity, conversationEntity?: Conversation): string {
    return this.getConversationId(connectionEntity, conversationEntity);
  }

  /**
   * Creates the notification title.
   *
   * @param Notification message title
   */
  private createTitle(messageEntity: Message, conversationEntity?: Conversation): string {
    const conversationName = conversationEntity && conversationEntity.display_name();
    const userEntity = messageEntity.user();

    let title;
    if (conversationName) {
      title = conversationEntity.isGroup()
        ? t('notificationTitleGroup', {conversation: conversationName, user: userEntity.name()}, {}, true)
        : conversationName;
    }

    return truncate(title || userEntity.name(), NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Create obfuscated title.
   *
   * @returns Obfuscated notification message title
   */
  private createTitleObfuscated(): string {
    const obfuscatedTitle = t('notificationObfuscatedTitle');
    return truncate(obfuscatedTitle, NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Creates the notification trigger.
   *
   * @returns Function to be called when notification is clicked
   */
  private createTrigger(
    messageEntity: ContentMessage | MemberMessage,
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): () => void {
    const conversationId = this.getConversationId(connectionEntity, conversationEntity);

    const containsSelfMention =
      messageEntity.is_content() && (messageEntity as ContentMessage).isUserMentioned(this.selfUser().id);
    if (containsSelfMention) {
      const showOptions = {exposeMessage: messageEntity, openFirstSelfMention: true};
      return () => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, showOptions);
    }

    const isConnectionRequest = messageEntity.isMember() && (messageEntity as MemberMessage).isConnectionRequest();
    if (isConnectionRequest) {
      return () => {
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.CONNECTION_REQUESTS);
      };
    }

    return () => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity || conversationId);
  }

  /**
   * Retrieve conversation ID from either conversation or connection.
   *
   * @param connectionEntity Connection entity
   * @param conversationEntity Conversation entity
   * @returns ID of conversation
   */
  private getConversationId(connectionEntity?: ConnectionEntity, conversationEntity?: Conversation): string {
    if (connectionEntity) {
      return connectionEntity.conversationId;
    }
    return conversationEntity && conversationEntity.id;
  }

  /**
   * Evaluates the current permission state.
   * @returns Resolves with `true` if notifications are permitted
   */
  private checkPermissionState(): Promise<boolean | undefined> {
    switch (this.permissionState()) {
      case PermissionStatusState.GRANTED: {
        return Promise.resolve(true);
      }

      case PermissionState.IGNORED:
      case PermissionState.UNSUPPORTED:
      case PermissionStatusState.DENIED: {
        return Promise.resolve(false);
      }

      default: {
        return Promise.resolve(undefined);
      }
    }
  }

  /**
   * Creates the browser notification and sends it.
   *
   * @see https://developer.mozilla.org/en/docs/Web/API/notification#Parameters
   * @returns Resolves when notification was handled
   */
  private async notifyBanner(
    messageEntity: ContentMessage,
    connectionEntity: ConnectionEntity,
    conversationEntity: Conversation,
  ): Promise<void> {
    if (!this.shouldShowNotification(messageEntity, conversationEntity)) {
      return;
    }
    const notificationContent = await this.createNotificationContent(
      messageEntity,
      connectionEntity,
      conversationEntity,
    );
    if (notificationContent) {
      const isPermitted = await this.checkPermission();
      if (isPermitted) {
        this.showNotification(notificationContent);
      }
    }
  }

  /**
   * Plays the sound from the audio repository.
   *
   * @param messageEntity Message entity
   */
  private notifySound(messageEntity: Message): void {
    const muteSound = !document.hasFocus() && Runtime.isFirefox() && Runtime.isMacOS();
    const isFromSelf = messageEntity.user().isMe;
    const shouldPlaySound = !muteSound && !isFromSelf;

    if (shouldPlaySound) {
      switch (messageEntity.super_type) {
        case SuperType.CONTENT: {
          amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.NEW_MESSAGE);
          break;
        }

        case SuperType.PING: {
          amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.INCOMING_PING);
          break;
        }
      }
    }
  }

  // Request browser permission for notifications.
  private async requestPermission(): Promise<void> {
    amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
    // Note: The callback will be only triggered in Chrome.
    // If you ignore a permission request on Firefox, then the callback will not be triggered.
    if (window.Notification.requestPermission) {
      const permissionState = (await window.Notification.requestPermission()) as PermissionState;
      amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
      await this.updatePermissionState(permissionState);
    }
  }

  /**
   * Should message in a notification be obfuscated?
   *
   * @param messageEntity Message entity
   * @param Obfuscate message in notification
   */
  private shouldObfuscateNotificationMessage(messageEntity: Message): boolean {
    const preferencesToObfuscateMessage = [NotificationPreference.OBFUSCATE, NotificationPreference.OBFUSCATE_MESSAGE];

    return preferencesToObfuscateMessage.includes(this.notificationsPreference()) || messageEntity.is_ephemeral();
  }

  /**
   * Should sender in a notification be obfuscated?
   *
   * @param messageEntity Message entity
   * @returns Obfuscate sender in notification
   */
  private shouldObfuscateNotificationSender(messageEntity: Message): boolean {
    const isSetToObfuscate = this.notificationsPreference() === NotificationPreference.OBFUSCATE;
    return isSetToObfuscate || messageEntity.is_ephemeral();
  }

  /**
   * @param messageEntity Message entity
   * @param conversationEntity Conversation entity
   * @returns Returns `true` if the notification should be shown, `false` otherwise
   */
  private shouldShowNotification(messageEntity: Message, conversationEntity?: Conversation): boolean {
    const inActiveConversation = conversationEntity
      ? this.conversationState.isActiveConversation(conversationEntity)
      : false;
    const inConversationView = this.contentViewModelState.state() === ContentViewModel.STATE.CONVERSATION;
    const inMaximizedCall =
      !!this.callingRepository.joinedCall() && !this.contentViewModelState.multitasking.isMinimized();

    const activeConversation = document.hasFocus() && inConversationView && inActiveConversation && !inMaximizedCall;
    const messageFromSelf = messageEntity.user().isMe;
    const permissionDenied = this.permissionState() === PermissionStatusState.DENIED;

    // The in-app notification settings should be ignored for alerts (which are composite messages for now)
    const preferenceIsNone =
      this.notificationsPreference() === NotificationPreference.NONE && !messageEntity.isComposite();
    const supportsNotification = Runtime.isSupportingNotifications();

    const hideNotification =
      activeConversation || messageFromSelf || permissionDenied || preferenceIsNone || !supportsNotification;

    return !hideNotification;
  }

  /**
   * Sending the notification.
   *
   * @param notificationContent Content of notification
   */
  private showNotification(notificationContent: NotificationContent): void {
    amplify.publish(WebAppEvents.NOTIFICATION.SHOW, notificationContent);
    this.showNotificationInBrowser(notificationContent);
  }

  /**
   * Sending the browser notification.
   *
   * @param notificationContent Content of notification
   */
  private showNotificationInBrowser(notificationContent: NotificationContent): void {
    /*
     * Note: Notification.data is only supported on Chrome.
     * See https://developer.mozilla.org/en-US/docs/Web/API/Notification/data
     */
    this.removeReadNotifications();
    const notification = new window.Notification(notificationContent.title, notificationContent.options);
    const {conversationId, messageId, messageType} = notificationContent.options.data;
    let timeoutTriggerId: number;

    const messageInfo = messageId ? `message '${messageId}' of type '${messageType}'` : `'${messageType}' message`;
    notification.onclick = () => {
      amplify.publish(WebAppEvents.NOTIFICATION.CLICK);
      window.focus();
      this.contentViewModelState.multitasking.isMinimized(true);
      notificationContent.trigger();

      this.logger.info(`Notification for ${messageInfo} in '${conversationId}' closed by click.`);
      notification.close();
    };

    notification.onclose = () => {
      window.clearTimeout(timeoutTriggerId);
      this.notifications.splice(this.notifications.indexOf(notification), 1);
      this.logger.info(`Removed notification for ${messageInfo} in '${conversationId}' locally.`);
    };

    notification.onerror = error => {
      this.logger.error(`Notification for ${messageInfo} in '${conversationId}' closed by error.`, error);
      notification.close();
    };

    notification.onshow = () => {
      timeoutTriggerId = window.setTimeout(() => {
        this.logger.info(`Notification for ${messageInfo} in '${conversationId}' closed by timeout.`);
        notification.close();
      }, notificationContent.timeout);
    };

    this.notifications.push(notification);
    this.logger.info(`Added notification for ${messageInfo} in '${conversationId}' to queue.`);
  }

  /**
   * Check whether conversation is in state to trigger notification.
   *
   * @param conversationEntity Conversation to notify in
   * @param messageEntity The message to filter from
   * @param userId The user id to check mentions for
   * @returns `true` if the conversation should show notification
   */
  static shouldNotifyInConversation(
    conversationEntity: Conversation,
    messageEntity: ContentMessage,
    userId: string,
  ): boolean {
    if (messageEntity.isComposite()) {
      return true;
    }

    if (conversationEntity.showNotificationsNothing()) {
      return false;
    }

    const isEventTypeToNotify = NotificationRepository.EVENTS_TO_NOTIFY.includes(messageEntity.super_type);
    const isEventToNotify = isEventTypeToNotify && !messageEntity.isEdited() && !messageEntity.isLinkPreview();

    if (conversationEntity.showNotificationsEverything()) {
      return isEventToNotify;
    }

    const isSelfMentionOrReply = messageEntity.is_content() && messageEntity.isUserTargeted(userId);
    const isCallMessage = messageEntity.super_type === SuperType.CALL;
    return isEventToNotify && (isCallMessage || isSelfMentionOrReply);
  }
}
