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

'use strict';

window.z = window.z || {};
window.z.notification = z.notification || {};

/**
 * Notification repository to trigger browser and audio notifications.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
z.notification.NotificationRepository = class NotificationRepository {
  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 5,
      TITLE_LENGTH: 38,
    };
  }

  static get EVENTS_TO_NOTIFY() {
    return [
      z.message.SuperType.CALL,
      z.message.SuperType.CONTENT,
      z.message.SuperType.MEMBER,
      z.message.SuperType.PING,
      z.message.SuperType.REACTION,
      z.message.SuperType.SYSTEM,
    ];
  }

  /**
   * Construct a new Notification Repository.
   * @param {z.calling.CallingRepository} callingRepository - Repository for all call interactions
   * @param {z.conversation.ConversationRepository} conversationRepository - Repository for all conversation interactions
   * @param {z.permission.PermissionRepository} permissionRepository - Repository for all permission interactions
   * @param {z.user.UserRepository} userRepository - Repository for users
   */
  constructor(callingRepository, conversationRepository, permissionRepository, userRepository) {
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;

    this.logger = new z.util.Logger('z.notification.NotificationRepository', z.config.LOGGER.OPTIONS);

    this.notifications = [];

    this.subscribeToEvents();
    this.notificationsPreference = ko.observable(z.notification.NotificationPreference.ON);
    this.notificationsPreference.subscribe(notificationsPreference => {
      const preferenceIsNone = notificationsPreference === z.notification.NotificationPreference.NONE;
      if (!preferenceIsNone) {
        this.checkPermission();
      }
    });

    this.permissionState = this.permissionRepository.permissionState[z.permission.PermissionType.NOTIFICATIONS];
    this.selfUser = this.userRepository.self;
  }

  subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.NOTIFICATION.NOTIFY, this.notify.bind(this));
    amplify.subscribe(z.event.WebApp.NOTIFICATION.PERMISSION_STATE, this.updatePermissionState.bind(this));
    amplify.subscribe(z.event.WebApp.NOTIFICATION.REMOVE_READ, this.removeReadNotifications.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, this.updatedNotificationsProperty.bind(this));
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns {Promise} Promise that resolves with the permission state
   */
  checkPermission() {
    return this._checkPermissionState().then(isPermitted => {
      if (_.isBoolean(isPermitted)) {
        return isPermitted;
      }

      if (!z.util.Environment.browser.supports.notifications) {
        return this.updatePermissionState(z.notification.PermissionState.UNSUPPORTED);
      }

      if (z.util.Environment.browser.supports.permissions) {
        return this.permissionRepository.getPermissionState(z.permission.PermissionType.NOTIFICATIONS).then(() => {
          const shouldRequestPermission = this.permissionState() === z.permission.PermissionStatusState.PROMPT;
          return shouldRequestPermission ? this._requestPermission() : this._checkPermissionState();
        });
      }

      const currentPermission = window.Notification.permission;
      const shouldRequestPermission = currentPermission === z.notification.PermissionState.DEFAULT;
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
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification has been handled
   */
  notify(messageEntity, connectionEntity, conversationEntity) {
    const notifyInConversation = conversationEntity
      ? NotificationRepository.shouldNotifyInConversation(conversationEntity, messageEntity, this.selfUser().id)
      : true;

    return Promise.resolve(notifyInConversation).then(shouldNotifyInConversation => {
      if (shouldNotifyInConversation) {
        this._notifySound(messageEntity);
        return this._notifyBanner(messageEntity, connectionEntity, conversationEntity);
      }
    });
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
   * @param {z.permission.PermissionStatusState} permissionState - State of browser permission
   * @returns {Promise} Resolves with true if notifications are enabled
   */
  updatePermissionState(permissionState) {
    this.permissionState(permissionState);
    return this._checkPermissionState();
  }

  /**
   * Creates the notification body for calls.
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @returns {string} Notification message body
   */
  _createBodyCall(messageEntity) {
    if (messageEntity.is_activation()) {
      return z.l10n.text(z.string.notificationVoiceChannelActivate);
    }

    if (messageEntity.is_deactivation() && messageEntity.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED) {
      return z.l10n.text(z.string.notificationVoiceChannelDeactivate);
    }
  }

  /**
   * Creates the notification body for text messages and pictures.
   *
   * @private
   * @param {z.entity.ContentMessage} messageEntity - Normal message entity
   * @returns {string} Notification message body
   */
  _createBodyContent(messageEntity) {
    if (messageEntity.has_asset_text()) {
      for (const assetEntity of messageEntity.assets()) {
        if (assetEntity.is_text()) {
          let notificationText;

          if (assetEntity.isUserMentioned(this.selfUser().id)) {
            notificationText = z.l10n.text(z.string.notificationMention, assetEntity.text);
          } else if (messageEntity.isUserQuoted(this.selfUser().id)) {
            notificationText = z.l10n.text(z.string.notificationReply, assetEntity.text);
          } else {
            notificationText = assetEntity.text;
          }

          return z.util.StringUtil.truncate(notificationText, NotificationRepository.CONFIG.BODY_LENGTH);
        }
      }
    }

    if (messageEntity.has_asset_image()) {
      return z.l10n.text(z.string.notificationAssetAdd);
    }

    if (messageEntity.has_asset_location()) {
      return z.l10n.text(z.string.notificationSharedLocation);
    }

    if (messageEntity.has_asset()) {
      const assetEntity = messageEntity.get_first_asset();

      if (assetEntity.is_audio()) {
        return z.l10n.text(z.string.notificationSharedAudio);
      }

      if (assetEntity.is_video()) {
        return z.l10n.text(z.string.notificationSharedVideo);
      }

      if (assetEntity.is_file()) {
        return z.l10n.text(z.string.notificationSharedFile);
      }
    }
  }

  /**
   * Creates the notification body for people being added to a group conversation.
   *
   * @private
   * @param {z.entity.MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodyMemberJoin(messageEntity) {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant) {
      const [otherUserEntity] = messageEntity.userEntities();

      const declension = z.string.Declension.ACCUSATIVE;
      const nameOfJoinedUser = z.util.SanitizationUtil.getFirstName(otherUserEntity, declension);

      const senderJoined = messageEntity.user().id === otherUserEntity.id;
      if (senderJoined) {
        return z.l10n.text(z.string.notificationMemberJoinSelf, nameOfJoinedUser);
      }

      const substitutions = {user1: messageEntity.user().first_name(), user2: nameOfJoinedUser};
      return z.l10n.text(z.string.notificationMemberJoinOne, substitutions);
    }

    const substitutions = {number: messageEntity.userIds().length, user: messageEntity.user().first_name()};
    return z.l10n.text(z.string.notificationMemberJoinMany, substitutions);
  }

  /**
   * Creates the notification body for people being removed from or leaving a group conversation.
   * @note Only show a notification if self user was removed
   *
   * @private
   * @param {z.entity.MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodyMemberLeave(messageEntity) {
    const updatedOneParticipant = messageEntity.userEntities().length === 1;
    if (updatedOneParticipant && !messageEntity.remoteUserEntities().length) {
      return z.l10n.text(z.string.notificationMemberLeaveRemovedYou, messageEntity.user().first_name());
    }
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.MemberMessage} messageEntity - Member message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message body
   */
  _createBodyMemberUpdate(messageEntity, connectionEntity, conversationEntity) {
    const isGroup = conversationEntity && conversationEntity.isGroup();

    switch (messageEntity.memberMessageType) {
      case z.message.SystemMessageType.NORMAL:
        if (isGroup) {
          if (messageEntity.isMemberJoin()) {
            return this._createBodyMemberJoin(messageEntity);
          }
          if (messageEntity.isMemberLeave()) {
            return this._createBodyMemberLeave(messageEntity);
          }
        }
        break;
      case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        return z.l10n.text(z.string.notificationConnectionAccepted);
      case z.message.SystemMessageType.CONNECTION_CONNECTED:
        return z.l10n.text(z.string.notificationConnectionConnected);
      case z.message.SystemMessageType.CONNECTION_REQUEST:
        return z.l10n.text(z.string.notificationConnectionRequest);
      case z.message.SystemMessageType.CONVERSATION_CREATE:
        return z.l10n.text(z.string.notificationConversationCreate, messageEntity.user().first_name());
      default:
        const conversationId = this._getConversationId(connectionEntity, conversationEntity);
        const message = `No notification for '${messageEntity.id} in '${conversationId}'.`;
        this.logger.log(this.logger.levels.OFF, message);
    }
  }

  /**
   * Creates the notification body for obfuscated messages.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message to obfuscate body for
   * @returns {string} Notification message body
   */
  _createBodyObfuscated(messageEntity) {
    if (messageEntity.is_content()) {
      const isSelfMentioned = messageEntity.isUserMentioned(this.selfUser().id);

      if (isSelfMentioned) {
        return z.l10n.text(z.string.notificationObfuscatedMention);
      }

      const isSelfQuoted = messageEntity.isUserQuoted(this.selfUser().id);

      if (isSelfQuoted) {
        return z.l10n.text(z.string.notificationObfuscatedReply);
      }
    }

    return z.l10n.text(z.string.notificationObfuscated);
  }

  /**
   * Creates the notification body for ping.
   * @private
   * @returns {string} Notification message body
   */
  _createBodyPing() {
    return z.l10n.text(z.string.notificationPing);
  }

  /**
   * Creates the notification body for reaction.
   * @private
   * @param {z.entity.Message} messageEntity - Fake reaction message entity
   * @returns {string} Notification message body
   */
  _createBodyReaction(messageEntity) {
    return z.l10n.text(z.string.notificationReaction, messageEntity.reaction);
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.MemberMessage} messageEntity - Member message entity
   * @returns {string} Notification message body
   */
  _createBodySystem(messageEntity) {
    const createBodyMessageTimerUpdate = () => {
      const messageTimer = z.conversation.ConversationEphemeralHandler.validateTimer(messageEntity.message_timer);

      if (messageTimer) {
        const timeString = z.util.TimeUtil.formatDuration(messageTimer).text;
        const substitutions = {time: timeString, user: messageEntity.user().first_name()};
        return z.l10n.text(z.string.notificationConversationMessageTimerUpdate, substitutions);
      }
      return z.l10n.text(z.string.notificationConversationMessageTimerReset, messageEntity.user().first_name());
    };

    const createBodyRename = () => {
      const substitutions = {name: messageEntity.name, user: messageEntity.user().first_name()};
      return z.l10n.text(z.string.notificationConversationRename, substitutions);
    };

    switch (messageEntity.system_message_type) {
      case z.message.SystemMessageType.CONVERSATION_RENAME: {
        return createBodyRename();
      }

      case z.message.SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE: {
        return createBodyMessageTimerUpdate(messageEntity);
      }
    }
  }

  /**
   * Create notification content.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves with the notification content
   */
  _createNotificationContent(messageEntity, connectionEntity, conversationEntity) {
    let optionsBody = undefined;

    return this._createOptionsBody(messageEntity, connectionEntity, conversationEntity)
      .then(body => {
        optionsBody = body;
        if (optionsBody) {
          return this._shouldObfuscateNotificationSender(messageEntity);
        }
        throw new z.error.NotificationError(z.error.NotificationError.TYPE.HIDE_NOTIFICATION);
      })
      .then(shouldObfuscateSender => {
        return this._createOptionsIcon(shouldObfuscateSender, messageEntity.user()).then(iconUrl => {
          const shouldObfuscateMessage = this._shouldObfuscateNotificationMessage(messageEntity);
          return {
            options: {
              body: shouldObfuscateMessage ? this._createBodyObfuscated(messageEntity) : optionsBody,
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
      });
  }

  /**
   * Selects the type of message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} connectionEntity - Connection entity
   * @param {z.entity.Conversation} conversationEntity - Conversation entity
   * @returns {Promise} Resolves with the notification message body
   */
  _createOptionsBody(messageEntity, connectionEntity, conversationEntity) {
    return Promise.resolve().then(() => {
      switch (messageEntity.super_type) {
        case z.message.SuperType.CALL:
          return this._createBodyCall(messageEntity);
        case z.message.SuperType.CONTENT:
          return this._createBodyContent(messageEntity);
        case z.message.SuperType.MEMBER:
          return this._createBodyMemberUpdate(messageEntity, connectionEntity, conversationEntity);
        case z.message.SuperType.PING:
          return this._createBodyPing();
        case z.message.SuperType.REACTION:
          return this._createBodyReaction(messageEntity);
        case z.message.SuperType.SYSTEM:
          return this._createBodySystem(messageEntity);
        default:
          const conversationId = this._getConversationId(connectionEntity, conversationEntity);
          const message = `No notification for '${messageEntity.id} in '${conversationId}'.`;
          this.logger.log(this.logger.levels.OFF, message);
      }
    });
  }

  /**
   * Creates the notification data to help check its content.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
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
   * @param {z.entity.User} userEntity - Sender of message
   * @returns {Promise} Resolves with the icon URL
   */
  _createOptionsIcon(shouldObfuscateSender, userEntity) {
    const canShowUserImage = userEntity.previewPictureResource() && !shouldObfuscateSender;
    if (canShowUserImage) {
      return userEntity
        .previewPictureResource()
        .generateUrl()
        .catch(error => {
          if (error instanceof z.util.ValidationUtilError) {
            this.logger.error(`Failed to validate an asset URL: ${error.message}`);
          }
          return '';
        });
    }

    const isMacOsWrapper = z.util.Environment.electron && z.util.Environment.os.mac;
    return Promise.resolve(isMacOsWrapper ? '' : NotificationRepository.CONFIG.ICON_URL);
  }

  /**
   * Creates the notification tag.
   *
   * @private
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message tag
   */
  _createOptionsTag(connectionEntity, conversationEntity) {
    return this._getConversationId(connectionEntity, conversationEntity);
  }

  /**
   * Creates the notification title.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message title
   */
  _createTitle(messageEntity, conversationEntity) {
    const conversationName = conversationEntity && conversationEntity.display_name();
    const userEntity = messageEntity.user();

    let title;
    if (conversationName) {
      title = conversationEntity.isGroup()
        ? z.l10n.text(z.string.notificationTitleGroup, {conversation: conversationName, user: userEntity.first_name()})
        : conversationName;
    }

    return z.util.StringUtil.truncate(title || userEntity.name(), NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Create obfuscated title.
   * @private
   * @returns {string} Obfuscated notification message title
   */
  _createTitleObfuscated() {
    const obfuscatedTitle = z.l10n.text(z.string.notificationObfuscatedTitle);
    return z.util.StringUtil.truncate(obfuscatedTitle, NotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Creates the notification trigger.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Function} Function to be called when notification is clicked
   */
  _createTrigger(messageEntity, connectionEntity, conversationEntity) {
    const conversationId = this._getConversationId(connectionEntity, conversationEntity);

    const containsSelfMention = messageEntity.is_content() && messageEntity.isUserMentioned(this.selfUser().id);
    if (containsSelfMention) {
      const showOptions = {exposeMessage: messageEntity, openFirstSelfMention: true};
      return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity, showOptions);
    }

    const isConnectionRequest = messageEntity.is_member() && messageEntity.isConnectionRequest();
    if (isConnectionRequest) {
      return () => {
        amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
      };
    }

    return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity || conversationId);
  }

  /**
   * Retrieve conversation ID from either conversation or connection.
   *
   * @private
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} ID of conversation
   */
  _getConversationId(connectionEntity, conversationEntity) {
    return connectionEntity ? connectionEntity.conversationId : conversationEntity.id;
  }

  /**
   * Evaluates the current permission state.
   * @private
   * @returns {Promise} Resolves with true if notifications are permitted
   */
  _checkPermissionState() {
    switch (this.permissionState()) {
      case z.permission.PermissionStatusState.GRANTED: {
        return Promise.resolve(true);
      }

      case z.notification.PermissionState.IGNORED:
      case z.notification.PermissionState.UNSUPPORTED:
      case z.permission.PermissionStatusState.DENIED: {
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
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.connection.ConnectionEntity} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification was handled
   */
  _notifyBanner(messageEntity, connectionEntity, conversationEntity) {
    return this._shouldShowNotification(messageEntity, conversationEntity)
      .then(() => this._createNotificationContent(messageEntity, connectionEntity, conversationEntity))
      .then(notificationContent => {
        return this.checkPermission().then(isPermitted => {
          return isPermitted ? this._showNotification(notificationContent) : undefined;
        });
      })
      .catch(error => {
        const hideNotification = error.type === z.error.NotificationError.TYPE.HIDE_NOTIFICATION;
        if (!hideNotification) {
          throw error;
        }
      });
  }

  /**
   * Plays the sound from the audio repository.
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @returns {undefined} No return value
   */
  _notifySound(messageEntity) {
    const muteSound = !document.hasFocus() && z.util.Environment.browser.firefox && z.util.Environment.os.mac;
    const isFromSelf = messageEntity.user().is_me;
    const shouldPlaySound = !muteSound && !isFromSelf;

    if (shouldPlaySound) {
      switch (messageEntity.super_type) {
        case z.message.SuperType.CONTENT: {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.NEW_MESSAGE);
          break;
        }

        case z.message.SuperType.PING: {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.INCOMING_PING);
          break;
        }

        default:
          this.logger.log(this.logger.levels.OFF, `No notification sound for message '${messageEntity.id}.`);
      }
    }
  }

  // Request browser permission for notifications.
  _requestPermission() {
    return new Promise(resolve => {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
      // Note: The callback will be only triggered in Chrome.
      // If you ignore a permission request on Firefox, then the callback will not be triggered.
      if (window.Notification.requestPermission) {
        window.Notification.requestPermission(permissionState => {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.REQUEST_NOTIFICATION);
          this.updatePermissionState(permissionState).then(resolve);
        });
      }
    });
  }

  /**
   * Should message in a notification be obfuscated.
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @returns {boolean} Obfuscate message in notification
   */
  _shouldObfuscateNotificationMessage(messageEntity) {
    const preferencesToObfuscateMessage = [
      z.notification.NotificationPreference.OBFUSCATE,
      z.notification.NotificationPreference.OBFUSCATE_MESSAGE,
    ];

    return preferencesToObfuscateMessage.includes(this.notificationsPreference()) || messageEntity.is_ephemeral();
  }

  /**
   * Should sender in a notification be obfuscated.
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @returns {boolean} Obfuscate sender in notification
   */
  _shouldObfuscateNotificationSender(messageEntity) {
    const isSetToObfuscate = this.notificationsPreference() === z.notification.NotificationPreference.OBFUSCATE;
    return isSetToObfuscate || messageEntity.is_ephemeral();
  }

  /**
   * Should hide notification.
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves if the notification should be shown
   */
  _shouldShowNotification(messageEntity, conversationEntity) {
    const inActiveConversation = conversationEntity
      ? this.conversationRepository.is_active_conversation(conversationEntity)
      : false;
    const inConversationView = wire.app.view.content.state() === z.viewModel.ContentViewModel.STATE.CONVERSATION;
    const inMaximizedCall = this.callingRepository.joinedCall() && !wire.app.view.content.multitasking.isMinimized();

    const activeConversation = document.hasFocus() && inConversationView && inActiveConversation && !inMaximizedCall;
    const messageFromSelf = messageEntity.user().is_me;
    const permissionDenied = this.permissionState() === z.permission.PermissionStatusState.DENIED;
    const preferenceIsNone = this.notificationsPreference() === z.notification.NotificationPreference.NONE;
    const supportsNotification = z.util.Environment.browser.supports.notifications;

    const hideNotification =
      activeConversation || messageFromSelf || permissionDenied || preferenceIsNone || !supportsNotification;

    return hideNotification
      ? Promise.reject(new z.error.NotificationError(z.error.NotificationError.TYPE.HIDE_NOTIFICATION))
      : Promise.resolve();
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
    amplify.publish(z.event.WebApp.NOTIFICATION.SHOW, notificationContent);
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
      amplify.publish(z.event.WebApp.NOTIFICATION.CLICK);
      window.focus();
      wire.app.view.content.multitasking.isMinimized(true);
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
   * @param {z.entity.Conversation} conversationEntity - Conversation to notify in .
   * @param {z.entity.Message} messageEntity - The message to filter from.
   * @param {string} userId - The user id to check mentions for.
   * @returns {boolean} True if the conversation should show notification.
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

    return isEventToNotify && isSelfMentionOrReply;
  }
};
