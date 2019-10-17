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

import {Availability} from '@wireapp/protocol-messaging';

import {getLogger} from 'Util/Logger';
import {t, Declension} from 'Util/LocalizerUtil';
import {getFirstName} from 'Util/SanitizationUtil';
import {TIME_IN_MILLIS, formatDuration} from 'Util/TimeUtil';
import {Environment} from 'Util/Environment';
import {truncate} from 'Util/StringUtil';
import {ValidationUtilError} from 'Util/ValidationUtil';

import {TERMINATION_REASON} from '../calling/enum/TerminationReason';
import {PermissionState} from './PermissionState';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PermissionType} from '../permission/PermissionType';
import {NotificationPreference} from './NotificationPreference';
import {WebAppEvents} from '../event/WebApp';
import {AudioType} from '../audio/AudioType';

import {SystemMessageType} from '../message/SystemMessageType';
import {SuperType} from '../message/SuperType';
import {ConversationEphemeralHandler} from '../conversation/ConversationEphemeralHandler';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {ContentViewModel} from '../view_model/ContentViewModel';

/**
 * Notification repository to trigger browser and audio notifications.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
export class NotificationRepository {
  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: TIME_IN_MILLIS.SECOND * 5,
      TITLE_LENGTH: 38,
    };
  }

  static get EVENTS_TO_NOTIFY() {
    return [SuperType.CALL, SuperType.CONTENT, SuperType.MEMBER, SuperType.PING, SuperType.REACTION, SuperType.SYSTEM];
  }

  /**
   * Construct a new Notification Repository.
   * @param {CallingRepository} callingRepository - Repository for all call interactions
   * @param {ConversationRepository} conversationRepository - Repository for all conversation interactions
   * @param {PermissionRepository} permissionRepository - Repository for all permission interactions
   * @param {UserRepository} userRepository - Repository for users
   */
  constructor(callingRepository, conversationRepository, permissionRepository, userRepository) {
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;
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
    this.selfUser = this.userRepository.self;
  }

  __test__assignEnvironment(data) {
    Object.assign(Environment, data);
  }

  setContentViewModelStates(state, multitasking) {
    this.contentViewModelState = {multitasking, state};
  }

  subscribeToEvents() {
    amplify.subscribe(WebAppEvents.NOTIFICATION.NOTIFY, this.notify.bind(this));
    amplify.subscribe(WebAppEvents.NOTIFICATION.PERMISSION_STATE, this.updatePermissionState.bind(this));
    amplify.subscribe(WebAppEvents.NOTIFICATION.REMOVE_READ, this.removeReadNotifications.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.NOTIFICATIONS, this.updatedNotificationsProperty.bind(this));
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns {Promise} Promise that resolves with the permission state
   */
  checkPermission() {
    return this._checkPermissionState().then(isPermitted => {
      if (typeof isPermitted === 'boolean') {
        return isPermitted;
      }

      if (!Environment.browser.supports.notifications) {
        return this.updatePermissionState(PermissionState.UNSUPPORTED);
      }

      if (Environment.browser.supports.permissions) {
        const notificationState = this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
        const shouldRequestPermission = notificationState === PermissionStatusState.PROMPT;
        return shouldRequestPermission ? this._requestPermission() : this._checkPermissionState();
      }

      const currentPermission = window.Notification.permission;
      const shouldRequestPermission = currentPermission === PermissionState.DEFAULT;
      return shouldRequestPermission ? this._requestPermission() : this.updatePermissionState(currentPermission);
    });
  }

  /**
   * Close all notifications.
   * @returns {undefined} No return value
   */
  clearNotifications() {
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
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification has been handled
   */
  notify(messageEntity, connectionEntity, conversationEntity) {
    const isUserAway = this.selfUser().availability() === Availability.Type.AWAY;

    if (isUserAway) {
      return Promise.resolve();
    }

    const isUserBusy = this.selfUser().availability() === Availability.Type.BUSY;
    const isSelfMentionOrReply = messageEntity.is_content() && messageEntity.isUserTargeted(this.selfUser().id);
    const isCallMessage = messageEntity.super_type === SuperType.CALL;

    if (isUserBusy && !isSelfMentionOrReply && !isCallMessage) {
      return Promise.resolve();
    }

    const notifyInConversation = conversationEntity
      ? NotificationRepository.shouldNotifyInConversation(conversationEntity, messageEntity, this.selfUser().id)
      : true;

    if (notifyInConversation) {
      this._notifySound(messageEntity);
      return this._notifyBanner(messageEntity, connectionEntity, conversationEntity);
    }
    return Promise.resolve();
  }

  // Remove notifications from the queue that are no longer unread
  removeReadNotifications() {
    this.notifications.forEach(notification => {
      const {conversationId, messageId, messageType} = notification.data || {};

      if (messageId) {
        this.conversationRepository.is_message_read(conversationId, messageId).then(isRead => {
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

  updatedProperties(properties) {
    const notificationPreference = properties.settings.notifications;
    return this.notificationsPreference(notificationPreference);
  }

  updatedNotificationsProperty(notificationPreference) {
    return this.notificationsPreference(notificationPreference);
  }

  /**
   * Set the permission state.
   * @param {PermissionStatusState} permissionState - State of browser permission
   * @returns {Promise} Resolves with `true` if notifications are enabled
   */
  updatePermissionState(permissionState) {
    this.permissionState(permissionState);
    return this._checkPermissionState();
  }

  /**
   * Creates the notification body for calls.
   * @private
   * @param {Message} messageEntity - Message entity
   * @returns {string} Notification message body
   */
  _createBodyCall(messageEntity) {
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
   * @private
   * @param {ContentMessage} messageEntity - Normal message entity
   * @returns {string} Notification message body
   */
  _createBodyContent(messageEntity) {
    if (messageEntity.has_asset_text()) {
      for (const assetEntity of messageEntity.assets()) {
        if (assetEntity.is_text()) {
          let notificationText;

          if (assetEntity.isUserMentioned(this.selfUser().id)) {
            notificationText = t('notificationMention', assetEntity.text, {}, true);
          } else if (messageEntity.isUserQuoted(this.selfUser().id)) {
            notificationText = t('notificationReply', assetEntity.text, {}, true);
          } else {
            notificationText = assetEntity.text;
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
   * @private
   * @param {MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodyMemberJoin(messageEntity) {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant) {
      const [otherUserEntity] = messageEntity.userEntities();

      const declension = Declension.ACCUSATIVE;
      const nameOfJoinedUser = getFirstName(otherUserEntity, declension);

      const senderJoined = messageEntity.user().id === otherUserEntity.id;
      if (senderJoined) {
        return t('notificationMemberJoinSelf', nameOfJoinedUser, {}, true);
      }

      const substitutions = {user1: messageEntity.user().first_name(), user2: nameOfJoinedUser};
      return t('notificationMemberJoinOne', substitutions, {}, true);
    }

    const substitutions = {number: messageEntity.userIds().length, user: messageEntity.user().first_name()};
    return t('notificationMemberJoinMany', substitutions, {}, true);
  }

  /**
   * Creates the notification body for people being removed from or leaving a group conversation.
   * @note Only show a notification if self user was removed
   *
   * @private
   * @param {MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodyMemberLeave(messageEntity) {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant && !messageEntity.remoteUserEntities().length) {
      return t('notificationMemberLeaveRemovedYou', messageEntity.user().first_name(), {}, true);
    }
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {MemberMessage} messageEntity - Member message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message body
   */
  _createBodyMemberUpdate(messageEntity, connectionEntity, conversationEntity) {
    const isGroup = conversationEntity && conversationEntity.isGroup();

    switch (messageEntity.memberMessageType) {
      case SystemMessageType.NORMAL:
        if (isGroup) {
          if (messageEntity.isMemberJoin()) {
            return this._createBodyMemberJoin(messageEntity);
          }
          if (messageEntity.isMemberLeave()) {
            return this._createBodyMemberLeave(messageEntity);
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
        return t('notificationConversationCreate', messageEntity.user().first_name(), {}, true);
    }
  }

  /**
   * Creates the notification body for obfuscated messages.
   *
   * @private
   * @param {Message} messageEntity - Message to obfuscate body for
   * @returns {string} Notification message body
   */
  _createBodyObfuscated(messageEntity) {
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
   * @private
   * @returns {string} Notification message body
   */
  _createBodyPing() {
    return t('notificationPing');
  }

  /**
   * Creates the notification body for reaction.
   * @private
   * @param {Message} messageEntity - Fake reaction message entity
   * @returns {string} Notification message body
   */
  _createBodyReaction(messageEntity) {
    return t('notificationReaction', messageEntity.reaction);
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodySystem(messageEntity) {
    const createBodyMessageTimerUpdate = () => {
      const messageTimer = ConversationEphemeralHandler.validateTimer(messageEntity.message_timer);

      if (messageTimer) {
        const timeString = formatDuration(messageTimer).text;
        const substitutions = {time: timeString, user: messageEntity.user().first_name()};
        return t('notificationConversationMessageTimerUpdate', substitutions, {}, true);
      }
      return t('notificationConversationMessageTimerReset', messageEntity.user().first_name(), {}, true);
    };

    const createBodyRename = () => {
      const substitutions = {name: messageEntity.name, user: messageEntity.user().first_name()};
      return t('notificationConversationRename', substitutions, {}, true);
    };

    switch (messageEntity.system_message_type) {
      case SystemMessageType.CONVERSATION_RENAME: {
        return createBodyRename();
      }

      case SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE: {
        return createBodyMessageTimerUpdate(messageEntity);
      }
      case SystemMessageType.CONVERSATION_DELETE: {
        return messageEntity.caption;
      }
    }
  }

  /**
   * Create notification content.
   *
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves with the notification content
   */
  _createNotificationContent(messageEntity, connectionEntity, conversationEntity) {
    const body = this._createOptionsBody(messageEntity, connectionEntity, conversationEntity);
    if (!body) {
      return Promise.resolve();
    }
    const shouldObfuscateSender = this._shouldObfuscateNotificationSender(messageEntity);
    return this._createOptionsIcon(shouldObfuscateSender, messageEntity.user()).then(iconUrl => {
      const shouldObfuscateMessage = this._shouldObfuscateNotificationMessage(messageEntity);
      return {
        options: {
          body: shouldObfuscateMessage ? this._createBodyObfuscated(messageEntity) : body,
          data: this._createOptionsData(messageEntity, connectionEntity, conversationEntity),
          icon: iconUrl,
          silent: true, // @note When Firefox supports this we can remove the fix for WEBAPP-731
          tag: this._createOptionsTag(connectionEntity, conversationEntity),
        },
        timeout: NotificationRepository.CONFIG.TIMEOUT,
        title: shouldObfuscateSender
          ? this._createTitleObfuscated()
          : this._createTitle(messageEntity, conversationEntity),
        trigger: this._createTrigger(messageEntity, connectionEntity, conversationEntity),
      };
    });
  }

  /**
   * Selects the type of message that the notification body needs to be created for.
   *
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} connectionEntity - Connection entity
   * @param {Conversation} conversationEntity - Conversation entity
   * @returns {string|undefined} The notification message body
   */
  _createOptionsBody(messageEntity, connectionEntity, conversationEntity) {
    switch (messageEntity.super_type) {
      case SuperType.CALL:
        return this._createBodyCall(messageEntity);
      case SuperType.CONTENT:
        return this._createBodyContent(messageEntity);
      case SuperType.MEMBER:
        return this._createBodyMemberUpdate(messageEntity, connectionEntity, conversationEntity);
      case SuperType.PING:
        return this._createBodyPing();
      case SuperType.REACTION:
        return this._createBodyReaction(messageEntity);
      case SuperType.SYSTEM:
        return this._createBodySystem(messageEntity);
    }
  }

  /**
   * Creates the notification data to help check its content.
   *
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Object} Notification message data
   */
  _createOptionsData(messageEntity, connectionEntity, conversationEntity) {
    const {id: messageId, type: messageType} = messageEntity;

    return {
      conversationId: this._getConversationId(connectionEntity, conversationEntity),
      messageId: messageId === '0' ? undefined : messageId,
      messageType: messageType,
    };
  }

  /**
   * Creates the notification icon.
   *
   * @private
   * @param {boolean} shouldObfuscateSender - Sender visible in notification
   * @param {User} userEntity - Sender of message
   * @returns {Promise} Resolves with the icon URL
   */
  _createOptionsIcon(shouldObfuscateSender, userEntity) {
    const canShowUserImage = userEntity.previewPictureResource() && !shouldObfuscateSender;
    if (canShowUserImage) {
      return userEntity
        .previewPictureResource()
        .generateUrl()
        .catch(error => {
          if (error instanceof ValidationUtilError) {
            this.logger.error(`Failed to validate an asset URL: ${error.message}`);
          }
          return '';
        });
    }

    const isMacOsWrapper = Environment.electron && Environment.os.mac;
    return Promise.resolve(isMacOsWrapper ? '' : NotificationRepository.CONFIG.ICON_URL);
  }

  /**
   * Creates the notification tag.
   *
   * @private
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message tag
   */
  _createOptionsTag(connectionEntity, conversationEntity) {
    return this._getConversationId(connectionEntity, conversationEntity);
  }

  /**
   * Creates the notification title.
   *
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message title
   */
  _createTitle(messageEntity, conversationEntity) {
    const conversationName = conversationEntity && conversationEntity.display_name();
    const userEntity = messageEntity.user();

    let title;
    if (conversationName) {
      title = conversationEntity.isGroup()
        ? t('notificationTitleGroup', {conversation: conversationName, user: userEntity.first_name()}, {}, true)
        : conversationName;
    }

    return truncate(title || userEntity.name(), NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Create obfuscated title.
   * @private
   * @returns {string} Obfuscated notification message title
   */
  _createTitleObfuscated() {
    const obfuscatedTitle = t('notificationObfuscatedTitle');
    return truncate(obfuscatedTitle, NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Creates the notification trigger.
   *
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Function} Function to be called when notification is clicked
   */
  _createTrigger(messageEntity, connectionEntity, conversationEntity) {
    const conversationId = this._getConversationId(connectionEntity, conversationEntity);

    const containsSelfMention = messageEntity.is_content() && messageEntity.isUserMentioned(this.selfUser().id);
    if (containsSelfMention) {
      const showOptions = {exposeMessage: messageEntity, openFirstSelfMention: true};
      return () => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, showOptions);
    }

    const isConnectionRequest = messageEntity.is_member() && messageEntity.isConnectionRequest();
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
   * @private
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {string} ID of conversation
   */
  _getConversationId(connectionEntity, conversationEntity) {
    if (connectionEntity) {
      return connectionEntity.conversationId;
    }
    return conversationEntity && conversationEntity.id;
  }

  /**
   * Evaluates the current permission state.
   * @private
   * @returns {Promise} Resolves with `true` if notifications are permitted
   */
  _checkPermissionState() {
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
   * @private
   * @see https://developer.mozilla.org/en/docs/Web/API/notification#Parameters
   * @param {Message} messageEntity - Message entity
   * @param {ConnectionEntity} [connectionEntity] - Connection entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification was handled
   */
  _notifyBanner(messageEntity, connectionEntity, conversationEntity) {
    if (!this._shouldShowNotification(messageEntity, conversationEntity)) {
      return Promise.resolve();
    }
    return this._createNotificationContent(messageEntity, connectionEntity, conversationEntity).then(
      notificationContent => {
        if (notificationContent) {
          return this.checkPermission().then(isPermitted => {
            return isPermitted ? this._showNotification(notificationContent) : undefined;
          });
        }
      },
    );
  }

  /**
   * Plays the sound from the audio repository.
   * @private
   * @param {Message} messageEntity - Message entity
   * @returns {undefined} No return value
   */
  _notifySound(messageEntity) {
    const muteSound = !document.hasFocus() && Environment.browser.firefox && Environment.os.mac;
    const isFromSelf = messageEntity.user().is_me;
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
  _requestPermission() {
    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
      // Note: The callback will be only triggered in Chrome.
      // If you ignore a permission request on Firefox, then the callback will not be triggered.
      if (window.Notification.requestPermission) {
        window.Notification.requestPermission(permissionState => {
          amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
          this.updatePermissionState(permissionState).then(resolve);
        });
      }
    });
  }

  /**
   * Should message in a notification be obfuscated.
   * @private
   * @param {Message} messageEntity - Message entity
   * @returns {boolean} Obfuscate message in notification
   */
  _shouldObfuscateNotificationMessage(messageEntity) {
    const preferencesToObfuscateMessage = [NotificationPreference.OBFUSCATE, NotificationPreference.OBFUSCATE_MESSAGE];

    return preferencesToObfuscateMessage.includes(this.notificationsPreference()) || messageEntity.is_ephemeral();
  }

  /**
   * Should sender in a notification be obfuscated.
   * @private
   * @param {Message} messageEntity - Message entity
   * @returns {boolean} Obfuscate sender in notification
   */
  _shouldObfuscateNotificationSender(messageEntity) {
    const isSetToObfuscate = this.notificationsPreference() === NotificationPreference.OBFUSCATE;
    return isSetToObfuscate || messageEntity.is_ephemeral();
  }

  /**
   * Should hide notification.
   * @private
   * @param {Message} messageEntity - Message entity
   * @param {Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves if the notification should be shown
   */
  _shouldShowNotification(messageEntity, conversationEntity) {
    const inActiveConversation = conversationEntity
      ? this.conversationRepository.is_active_conversation(conversationEntity)
      : false;
    const inConversationView = this.contentViewModelState.state() === ContentViewModel.STATE.CONVERSATION;
    const inMaximizedCall =
      this.callingRepository.joinedCall() && !this.contentViewModelState.multitasking.isMinimized();

    const activeConversation = document.hasFocus() && inConversationView && inActiveConversation && !inMaximizedCall;
    const messageFromSelf = messageEntity.user().is_me;
    const permissionDenied = this.permissionState() === PermissionStatusState.DENIED;
    const preferenceIsNone = this.notificationsPreference() === NotificationPreference.NONE;
    const supportsNotification = Environment.browser.supports.notifications;

    const hideNotification =
      activeConversation || messageFromSelf || permissionDenied || preferenceIsNone || !supportsNotification;

    return !hideNotification;
  }

  /**
   * Sending the notification.
   *
   * @param {Object} notificationContent - Content of notification
   * @param {string} notificationContent.title - Title of notification
   * @param {Object} notificationContent.options - Notification options
   * @param {Function} notificationContent.trigger - Function to be called on notificiation click
   * @param {Integer} notificationContent.timeout - Timeout after which notification is closed
   * @returns {undefined} No return value
   */
  _showNotification(notificationContent) {
    amplify.publish(WebAppEvents.NOTIFICATION.SHOW, notificationContent);
    this._showNotificationInBrowser(notificationContent);
  }

  /**
   * Sending the browser notification.
   *
   * @private
   * @param {Object} notificationContent - Content of notification
   * @param {string} notificationContent.title - Notification title
   * @param {Object} notificationContent.options - Notification options
   * @param {Function} notificationContent.trigger - Function to be triggered on click [Function] trigger
   * @param {number} notificationContent.timeout - Timeout for notification
   * @returns {undefined} No return value
   */
  _showNotificationInBrowser(notificationContent) {
    /*
    @note Notification.data is only supported on Chrome
    @see https://developer.mozilla.org/en-US/docs/Web/API/Notification/data
    */
    this.removeReadNotifications();
    const notification = new window.Notification(notificationContent.title, notificationContent.options);
    const {conversationId, messageId, messageType} = notificationContent.options.data;
    let timeoutTriggerId = undefined;

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
   * Check whether conversation is in state to trigger notitication.
   *
   * @param {Conversation} conversationEntity - Conversation to notify in.
   * @param {Message} messageEntity - The message to filter from.
   * @param {string} userId - The user id to check mentions for.
   * @returns {boolean} `true` if the conversation should show notification.
   */
  static shouldNotifyInConversation(conversationEntity, messageEntity, userId) {
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
