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

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {NotificationPreference, WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {AudioRepository} from 'Repositories/audio/AudioRepository';
import {AudioType} from 'Repositories/audio/AudioType';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {TERMINATION_REASON} from 'Repositories/calling/enum/TerminationReason';
import type {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {ConversationEphemeralHandler} from 'Repositories/conversation/ConversationEphemeralHandler';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {CallMessage} from 'Repositories/entity/message/CallMessage';
import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {DeleteConversationMessage} from 'Repositories/entity/message/DeleteConversationMessage';
import type {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import type {Message} from 'Repositories/entity/message/Message';
import type {MessageTimerUpdateMessage} from 'Repositories/entity/message/MessageTimerUpdateMessage';
import type {RenameMessage} from 'Repositories/entity/message/RenameMessage';
import type {SystemMessage} from 'Repositories/entity/message/SystemMessage';
import type {User} from 'Repositories/entity/User';
import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
import type {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {normalizePermissionState} from 'Repositories/permission/usePermissionsStore';
import {UserState} from 'Repositories/user/UserState';
import {Declension, t, getUserName} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {getRenderedTextContent} from 'Util/messageRenderer';
import {truncate} from 'Util/StringUtil';
import {formatDuration, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {ValidationUtilError} from 'Util/ValidationUtil';

import {AppPermissionState} from './AppPermissionState';

import {SuperType} from '../../message/SuperType';
import {SystemMessageType} from '../../message/SystemMessageType';
import {ContentState, useAppState} from '../../page/useAppState';
import {Warnings} from '../../view_model/WarningsContainer';

type NotificationData = {conversationId?: QualifiedId; messageId?: string; messageType: string};
interface NotificationContent {
  /** Notification options */
  options: {data: NotificationData; tag: string};
  /** Timeout for notification */
  timeout: number;
  /** Notification title */
  title: string;
  /** Function to be triggered on click */
  trigger: Function;
}
interface WebappNotifications extends Notification {
  data: NotificationData;
}

/**
 * Notification repository to trigger browser and audio notifications.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
export class NotificationRepository {
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private readonly notifications: WebappNotifications[];
  private readonly notificationsPreference: ko.Observable<NotificationPreference>;
  private readonly permissionRepository: PermissionRepository;
  private readonly assetRepository: AssetRepository;
  private isSoftLock = false;

  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: TIME_IN_MILLIS.SECOND * 5,
      TITLE_LENGTH: 17,
      TITLE_MAX_LENGTH: 38,
    };
  }

  static get EVENTS_TO_NOTIFY(): SuperType[] {
    return [SuperType.CALL, SuperType.CONTENT, SuperType.MEMBER, SuperType.PING, SuperType.SYSTEM];
  }

  /**
   * Construct a new Notification Repository.
   * @param conversationRepository Repository for all conversation interactions
   * @param permissionRepository Repository for all permission interactions
   * @param userState Repository for users
   */
  constructor(
    conversationRepository: ConversationRepository,
    permissionRepository: PermissionRepository,
    private readonly audioRepository: AudioRepository,
    private readonly callingRepository: CallingRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly callState = container.resolve(CallState),
  ) {
    this.assetRepository = container.resolve(AssetRepository);
    this.conversationRepository = conversationRepository;
    this.permissionRepository = permissionRepository;

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
  }

  subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.NOTIFICATION.NOTIFY, this.notify);
    amplify.subscribe(WebAppEvents.NOTIFICATION.PERMISSION_STATE, this.updatePermissionState);
    amplify.subscribe(WebAppEvents.NOTIFICATION.REMOVE_READ, this.removeReadNotifications);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.NOTIFICATIONS, this.updatedNotificationsProperty);
  }

  setSoftLock(value: boolean) {
    this.isSoftLock = value;
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns Promise that resolves with the permission state
   */
  async checkPermission(): Promise<boolean | void> {
    const isPermitted = this.checkPermissionState();

    if (typeof isPermitted === 'boolean') {
      return isPermitted;
    }

    if (!Runtime.isSupportingNotifications()) {
      return this.updatePermissionState(AppPermissionState.UNSUPPORTED);
    }

    if (Runtime.isSupportingPermissions()) {
      const notificationState = this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
      const shouldRequestPermission = notificationState === BrowserPermissionStatus.PROMPT;
      return shouldRequestPermission ? this.requestPermission() : this.checkPermissionState();
    }

    const currentPermission = window.Notification.permission as BrowserPermissionStatus;
    const shouldRequestPermission = currentPermission === BrowserPermissionStatus.PROMPT;
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
        this.logger.info(`Notification for '${messageId}' in '${conversationId?.id}' closed on unload.`);
      }
    });
  }

  /**
   * Display browser notification and play sound notification.
   * @returns Resolves when notification has been handled
   */
  readonly notify = (
    messageEntity: Message,
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): Promise<void> => {
    if (this.isSoftLock) {
      return Promise.resolve();
    }

    const isUserAway = this.userState.self().availability() === Availability.Type.AWAY;
    const isComposite = messageEntity.isComposite();

    if (isUserAway && !isComposite) {
      return Promise.resolve();
    }

    const isUserBusy = this.userState.self().availability() === Availability.Type.BUSY;
    const isSelfMentionOrReply =
      messageEntity.isContent() && messageEntity.isUserTargeted(this.userState.self().qualifiedId);
    const isCallMessage = messageEntity.super_type === SuperType.CALL;

    if (isUserBusy && !isSelfMentionOrReply && !isCallMessage && !isComposite) {
      return Promise.resolve();
    }

    const notifyInConversation = conversationEntity
      ? NotificationRepository.shouldNotifyInConversation(
          conversationEntity,
          messageEntity,
          this.userState.self().qualifiedId,
        )
      : true;

    if (notifyInConversation) {
      this.notifySound(messageEntity);
      return this.notifyBanner(messageEntity, connectionEntity, conversationEntity);
    }

    return Promise.resolve();
  };

  /** Remove notifications from the queue that are no longer unread */
  readonly removeReadNotifications = (): void => {
    this.notifications.forEach(notification => {
      const {conversationId, messageId, messageType} = notification.data || {};

      if (conversationId && messageId) {
        this.conversationRepository.isMessageRead(conversationId, messageId).then(isRead => {
          if (isRead) {
            notification.close();
            const messageInfo = messageId
              ? `message '${messageId}' of type '${messageType}'`
              : `'${messageType}' message`;
            this.logger.info(
              `Removed read notification for ${messageInfo} in '${conversationId?.id || conversationId}'.`,
            );
          }
        });
      }
    });
  };

  readonly updatedProperties = (properties: WebappProperties): void => {
    const notificationPreference = properties.settings.notifications;
    return this.notificationsPreference(notificationPreference);
  };

  readonly updatedNotificationsProperty = (notificationPreference: NotificationPreference): void => {
    return this.notificationsPreference(notificationPreference);
  };

  /**
   * Set the permission state.
   * @param permissionState State of browser permission
   * @returns Resolves with `true` if notifications are enabled
   */
  readonly updatePermissionState = (
    permissionState: AppPermissionState | BrowserPermissionStatus | NotificationPermission,
  ): boolean | undefined => {
    // Normalize the permission state and set it in the store
    const normalizedState = normalizePermissionState(permissionState);
    this.permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, normalizedState);
    return this.checkPermissionState();
  };

  /**
   * Creates the notification body for calls.
   */
  private createBodyCall(messageEntity: CallMessage): string | void {
    if (messageEntity.isActivation()) {
      return t('notificationVoiceChannelActivate');
    }

    if (messageEntity.isDeactivation() && messageEntity.finished_reason === TERMINATION_REASON.MISSED) {
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
    if (messageEntity.hasAssetText()) {
      for (const assetEntity of messageEntity.assets()) {
        if (assetEntity.isText() || assetEntity.isMultipart()) {
          let notificationText;

          if (assetEntity.isUserMentioned(this.userState.self().qualifiedId)) {
            notificationText = t('notificationMention', {text: assetEntity.text}, {}, true);
          } else if (messageEntity.isUserQuoted(this.userState.self().id)) {
            notificationText = t('notificationReply', {text: assetEntity.text}, {}, true);
          } else {
            notificationText = getRenderedTextContent(assetEntity.text);
          }

          return truncate(notificationText, NotificationRepository.CONFIG.BODY_LENGTH);
        }
      }
    }

    if (messageEntity.hasAssetImage()) {
      return t('notificationAssetAdd');
    }

    if (messageEntity.hasAssetLocation()) {
      return t('notificationSharedLocation');
    }

    if (messageEntity.hasAsset()) {
      const assetEntity = messageEntity.getFirstAsset();

      if (assetEntity.isAudio()) {
        return t('notificationSharedAudio');
      }

      if (assetEntity.isVideo()) {
        return t('notificationSharedVideo');
      }

      if (assetEntity.isFile()) {
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
        return t('notificationMemberJoinSelf', {user: nameOfJoinedUser}, {}, true);
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
      return t('notificationMemberLeaveRemovedYou', {user: messageEntity.user().name()}, {}, true);
    }
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @param messageEntity Member message entity
   * @param conversationEntity Conversation entity
   */
  private createBodyMemberUpdate(messageEntity?: MemberMessage, conversationEntity?: Conversation): string | void {
    const isGroupOrChannel = conversationEntity && conversationEntity.isGroupOrChannel();

    switch (messageEntity?.memberMessageType) {
      case SystemMessageType.NORMAL:
        if (isGroupOrChannel) {
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
        return t('notificationConversationCreate', {user: messageEntity.user().name()}, {}, true);
    }
  }

  /**
   * Creates the notification body for obfuscated messages.
   *
   * @param messageEntity Message to obfuscate body for
   * @returns Notification message body
   */
  private createBodyObfuscated(messageEntity: Message): string {
    if (messageEntity.isContent()) {
      const isSelfMentioned = messageEntity.isUserMentioned(this.userState.self().qualifiedId);

      if (isSelfMentioned) {
        return t('notificationObfuscatedMention');
      }

      const isSelfQuoted = messageEntity.isUserQuoted(this.userState.self().id);

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
      return t('notificationConversationMessageTimerReset', {user: messageEntity.user().name()}, {}, true);
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
    messageEntity: Message,
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): Promise<NotificationContent | undefined> {
    const body = this.createOptionsBody(messageEntity, conversationEntity);
    if (!body) {
      return Promise.resolve(undefined);
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
    conversationEntity?: Conversation,
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
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): NotificationContent['options']['data'] {
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
        return await this.assetRepository.getObjectUrl(userEntity.previewPictureResource());
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
    return this.getConversationId(connectionEntity, conversationEntity)?.id || '';
  }

  /**
   Calculate the length of the opposite title section string and return the extra length
  */
  private calculatedTitleLength = (sectionString: string) => {
    const maxSectionLength = NotificationRepository.CONFIG.TITLE_LENGTH;
    const length = maxSectionLength - sectionString.length + maxSectionLength;

    return length > maxSectionLength ? length : maxSectionLength;
  };

  /**
   * Creates the notification title.
   *
   * @param Notification message title
   */
  private createTitle(messageEntity: Message, conversationEntity?: Conversation): string {
    const conversationName = conversationEntity && conversationEntity.display_name();
    const userEntity = messageEntity.user();

    const truncatedConversationName = truncate(
      conversationName ?? '',
      this.calculatedTitleLength(userEntity.name()),
      false,
    );

    const truncatedName = truncate(userEntity.name(), this.calculatedTitleLength(conversationName ?? ''), false);

    let title;
    if (conversationName) {
      title = conversationEntity.isGroupOrChannel()
        ? t('notificationTitleGroup', {conversation: truncatedConversationName, user: truncatedName}, {}, true)
        : conversationName;
    }

    return truncate(title ?? truncatedName, NotificationRepository.CONFIG.TITLE_MAX_LENGTH, false);
  }

  /**
   * Create obfuscated title.
   *
   * @returns Obfuscated notification message title
   */
  private createTitleObfuscated(): string {
    const obfuscatedTitle = t('notificationObfuscatedTitle');
    return truncate(obfuscatedTitle, NotificationRepository.CONFIG.TITLE_MAX_LENGTH, false);
  }

  /**
   * Creates the notification trigger.
   *
   * @returns Function to be called when notification is clicked
   */
  private createTrigger(
    messageEntity: Message,
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): () => void {
    const conversationId = this.getConversationId(connectionEntity, conversationEntity);

    const containsSelfMention =
      messageEntity.isContent() && (messageEntity as ContentMessage).isUserMentioned(this.userState.self().qualifiedId);
    if (containsSelfMention) {
      const showOptions = {exposeMessage: messageEntity, openFirstSelfMention: true};
      return () => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, showOptions);
    }

    const isConnectionRequest = messageEntity.isMember() && (messageEntity as MemberMessage).isConnectionRequest();
    if (isConnectionRequest) {
      return () => {
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.CONNECTION_REQUESTS);
      };
    }

    return () => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity || conversationId, {});
  }

  /**
   * Retrieve conversation ID from either conversation or connection.
   *
   * @param connectionEntity Connection entity
   * @param conversationEntity Conversation entity
   * @returns ID of conversation
   */
  private getConversationId(
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
  ): QualifiedId | undefined {
    if (connectionEntity) {
      return connectionEntity.conversationId;
    }
    return conversationEntity?.qualifiedId;
  }

  /**
   * Evaluates the current permission state.
   * @returns Returns `true` if notifications are permitted
   */
  private checkPermissionState(): boolean | undefined {
    const permissionState = this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
    switch (permissionState) {
      case BrowserPermissionStatus.GRANTED: {
        return true;
      }

      case AppPermissionState.IGNORED:
      case AppPermissionState.UNSUPPORTED:
      case BrowserPermissionStatus.DENIED: {
        return false;
      }

      default: {
        return undefined;
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
    messageEntity: Message,
    connectionEntity?: ConnectionEntity,
    conversationEntity?: Conversation,
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
          void this.audioRepository.play(AudioType.NEW_MESSAGE);
          break;
        }

        case SuperType.PING: {
          void this.audioRepository.play(AudioType.INCOMING_PING);
          break;
        }
      }
    }
  }

  // Request browser permission for notifications.
  private async requestPermission(): Promise<void> {
    Warnings.showWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
    // Note: The callback will be only triggered in Chrome.
    // If you ignore a permission request on Firefox, then the callback will not be triggered.
    if (window.Notification.requestPermission) {
      const permissionState = await window.Notification.requestPermission();
      Warnings.hideWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
      this.updatePermissionState(permissionState);
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

    return preferencesToObfuscateMessage.includes(this.notificationsPreference()) || messageEntity.isEphemeral();
  }

  /**
   * Should sender in a notification be obfuscated?
   *
   * @param messageEntity Message entity
   * @returns Obfuscate sender in notification
   */
  private shouldObfuscateNotificationSender(messageEntity: Message): boolean {
    const isSetToObfuscate = this.notificationsPreference() === NotificationPreference.OBFUSCATE;
    return isSetToObfuscate || messageEntity.isEphemeral();
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
    const {contentState} = useAppState.getState();
    const inConversationView = contentState === ContentState.CONVERSATION;
    const inMaximizedCall =
      !!this.callState.joinedCall() && this.callState.viewMode() === CallingViewMode.DETACHED_WINDOW;

    const activeConversation = document.hasFocus() && inConversationView && inActiveConversation && !inMaximizedCall;
    const messageFromSelf = messageEntity.user().isMe;
    const permissionDenied =
      this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS) === BrowserPermissionStatus.DENIED;

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
    this.removeReadNotifications();
    const notification: WebappNotifications = new window.Notification(
      notificationContent.title,
      notificationContent.options,
    );
    const {conversationId, messageId, messageType} = notificationContent.options.data;
    let timeoutTriggerId: number;

    const messageInfo = messageId ? `message '${messageId}' of type '${messageType}'` : `'${messageType}' message`;
    notification.onclick = () => {
      amplify.publish(WebAppEvents.NOTIFICATION.CLICK);
      window.focus();
      void this.callingRepository.setViewModeMinimized();
      notificationContent.trigger();

      this.logger.info(`Notification for ${messageInfo} in '${conversationId?.id || conversationId}' closed by click.`);
      notification.close();
    };

    notification.onclose = () => {
      window.clearTimeout(timeoutTriggerId);
      this.notifications.splice(this.notifications.indexOf(notification), 1);
      this.logger.info(`Removed notification for ${messageInfo} in '${conversationId?.id || conversationId}' locally.`);
    };

    notification.onerror = error => {
      this.logger.error(
        `Notification for ${messageInfo} in '${conversationId?.id || conversationId}' closed by error.`,
        error,
      );
      notification.close();
    };

    notification.onshow = () => {
      timeoutTriggerId = window.setTimeout(() => {
        this.logger.info(
          `Notification for ${messageInfo} in '${conversationId?.id || conversationId}' closed by timeout.`,
        );
        notification.close();
      }, notificationContent.timeout);
    };

    this.notifications.push(notification);
    this.logger.info(`Added notification for ${messageInfo} in '${conversationId?.id || conversationId}' to queue.`);
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
    messageEntity: Message,
    userId: QualifiedId,
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

    const isSelfMentionOrReply = messageEntity.isContent() && messageEntity.isUserTargeted(userId);
    const isCallMessage = messageEntity.super_type === SuperType.CALL;
    return isEventToNotify && (isCallMessage || isSelfMentionOrReply);
  }
}
