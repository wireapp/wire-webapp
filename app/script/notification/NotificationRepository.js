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
 * @see https://developer.mozilla.org/en/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
z.notification.NotificationRepository = class NotificationRepository {
  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: 5 * 1000,
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
   * @param {z.conversation.ConversationService} conversationRepository - Repository for all conversation interactions
   */
  constructor(callingRepository, conversationRepository) {
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
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

    this.permissionState = z.notification.PermissionStatusState.PROMPT;
    this.permissionStatus = undefined;
  }

  subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.NOTIFICATION.NOTIFY, this.notify.bind(this));
    amplify.subscribe(z.event.WebApp.NOTIFICATION.PERMISSION_STATE, this.setPermissionState.bind(this));
    amplify.subscribe(z.event.WebApp.NOTIFICATION.REMOVE_READ, this.removeReadNotifications.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, this.updatedNotificationsProperty.bind(this));
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns {Promise} Promise that resolves with the permission state
   */
  checkPermission() {
    return this._getPermissionState().then(isPermitted => {
      if (_.isBoolean(isPermitted)) {
        return isPermitted;
      }

      if (!z.util.Environment.browser.supports.notifications) {
        return this.setPermissionState(z.notification.PermissionStatusState.UNSUPPORTED);
      }

      if (navigator.permissions) {
        return navigator.permissions.query({name: 'notifications'}).then(permissionStatus => {
          this.permissionStatus = permissionStatus;
          this.permissionStatus.onchange = () => this.setPermissionState(this.permissionStatus.state);

          switch (permissionStatus.state) {
            case z.notification.PermissionStatusState.PROMPT:
              return this._requestPermission();
            default:
              return this.setPermissionState(permissionStatus.state);
          }
        });
      }

      switch (window.Notification.permission) {
        case z.notification.PermissionStatusState.DEFAULT:
          return this._requestPermission();
        default:
          return this.setPermissionState(window.Notification.permission);
      }
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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification has been handled
   */
  notify(messageEntity, connectionEntity, conversationEntity) {
    return Promise.resolve().then(() => {
      const isEventToNotify = NotificationRepository.EVENTS_TO_NOTIFY.includes(messageEntity.super_type);
      const isMuted = conversationEntity && conversationEntity.is_muted();

      const shouldNotify = isEventToNotify && !messageEntity.isEdited() && !messageEntity.isLinkPreview() && !isMuted;
      if (shouldNotify) {
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

  /**
   * Set the permission state.
   * @param {z.notification.PermissionStatusState} permissionState - State of browser permission
   * @returns {Promise} Resolves with true if notificaions are enabled
   */
  setPermissionState(permissionState) {
    this.permissionState = permissionState;
    return this._getPermissionState();
  }

  updatedProperties(properties) {
    const notificationPreference = properties.settings.notifications;
    return this.notificationsPreference(notificationPreference);
  }

  updatedNotificationsProperty(notificationPreference) {
    return this.notificationsPreference(notificationPreference);
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
      for (const asset_et of messageEntity.assets()) {
        if (asset_et.is_text()) {
          return z.util.StringUtil.truncate(asset_et.text, NotificationRepository.CONFIG.BODY_LENGTH);
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
      const [asset_et] = messageEntity.assets();
      if (asset_et.is_audio()) {
        return z.l10n.text(z.string.notificationSharedAudio);
      }

      if (asset_et.is_video()) {
        return z.l10n.text(z.string.notificationSharedVideo);
      }

      if (asset_et.is_file()) {
        return z.l10n.text(z.string.notificationSharedFile);
      }
    }
  }

  /**
   * Creates the notification body for a renamed conversation.
   *
   * @private
   * @param {z.entity.RenameMessage} messageEntity - Rename message entity
   * @returns {string} Notification message body
   */
  _createBodyConversationRename(messageEntity) {
    const substitutions = {name: messageEntity.name, user: messageEntity.user().first_name()};
    return z.l10n.text(z.string.notificationConversationRename, substitutions);
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
      const nameOfJoinedUser = z.util.getFirstName(otherUserEntity, z.string.Declension.ACCUSATIVE);

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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} Notification message body
   */
  _createBodyMemberUpdate(messageEntity, connectionEntity, conversationEntity) {
    const isGroup = conversationEntity && conversationEntity.is_group();

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
   * @private
   * @returns {string} Notification message body
   */
  _createBodyObfuscated() {
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
    const isConversationRename = messageEntity.system_message_type === z.message.SystemMessageType.CONVERSATION_RENAME;
    if (isConversationRename) {
      return this._createBodyConversationRename(messageEntity);
    }
  }

  /**
   * Create notification content.
   *
   * @private
   * @param {z.entity.Message} messageEntity - Message entity
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
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
        throw new z.notification.NotificationError(z.notification.NotificationError.TYPE.HIDE_NOTIFICATION);
      })
      .then(shouldObfuscateSender => {
        return this._createOptionsIcon(shouldObfuscateSender, messageEntity.user()).then(iconUrl => {
          const shouldObfuscateMessage = this._shouldObfuscateNotificationMessage(messageEntity);
          return {
            options: {
              body: shouldObfuscateMessage ? this._createBodyObfuscated() : optionsBody,
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
   * @param {z.entity.Connection} connectionEntity - Connection entity
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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
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
    let titleMessage;

    const isConversation = conversationEntity && conversationEntity.display_name();
    if (isConversation) {
      titleMessage = conversationEntity.is_group()
        ? `${messageEntity.user().first_name()} in ${conversationEntity.display_name()}`
        : conversationEntity.display_name();
    }

    titleMessage = titleMessage || messageEntity.user().name();
    return z.util.StringUtil.truncate(titleMessage, NotificationRepository.CONFIG.TITLE_LENGTH, false);
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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Function} Function to be called when notification is clicked
   */
  _createTrigger(messageEntity, connectionEntity, conversationEntity) {
    const conversationId = this._getConversationId(connectionEntity, conversationEntity);

    if (messageEntity.is_member()) {
      switch (messageEntity.memberMessageType) {
        case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        case z.message.SystemMessageType.CONNECTION_CONNECTED: {
          return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationId);
        }

        case z.message.SystemMessageType.CONNECTION_REQUEST: {
          return () => {
            amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
          };
        }

        default: {
          const message = `No notification trigger for message '${messageEntity.id} in '${conversationId}'.`;
          this.logger.log(this.logger.levels.OFF, message);
        }
      }
    }
    return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity || conversationId);
  }

  /**
   * Retrieve conversation ID from either conversation or connection.
   *
   * @private
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {string} ID of conversation
   */
  _getConversationId(connectionEntity, conversationEntity) {
    return connectionEntity ? connectionEntity.conversation_id : conversationEntity.id;
  }

  /**
   * Evaluates the current permission state
   * @private
   * @returns {Promise} Resolves with true if notifications are permitted
   */
  _getPermissionState() {
    switch (this.permissionState) {
      case z.notification.PermissionStatusState.GRANTED: {
        return Promise.resolve(true);
      }

      case z.notification.PermissionStatusState.IGNORED:
      case z.notification.PermissionStatusState.UNSUPPORTED: {
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
   * @param {z.entity.Connection} [connectionEntity] - Connection entity
   * @param {z.entity.Conversation} [conversationEntity] - Conversation entity
   * @returns {Promise} Resolves when notification was handled
   */
  _notifyBanner(messageEntity, connectionEntity, conversationEntity) {
    return this._shouldShowNotification(messageEntity, conversationEntity)
      .then(() => this._createNotificationContent(messageEntity, connectionEntity, conversationEntity))
      .then(notificationContent => {
        return this.checkPermission().then(isPermitted => {
          if (isPermitted) {
            return this._showNotification(notificationContent);
          }
        });
      })
      .catch(error => {
        const hideNotification = error.type === z.notification.NotificationError.TYPE.HIDE_NOTIFICATION;
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
    if (!muteSound) {
      switch (messageEntity.super_type) {
        case z.message.SuperType.CONTENT: {
          if (!messageEntity.user().is_me) {
            amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.NEW_MESSAGE);
          }
          break;
        }

        case z.message.SuperType.PING: {
          if (!messageEntity.user().is_me) {
            amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.INCOMING_PING);
          }
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
          return this.setPermissionState(permissionState).then(resolve);
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
   * @param {z.entity.Message} message_et - Message entity
   * @returns {boolean} Obfuscate sender in notification
   */
  _shouldObfuscateNotificationSender(message_et) {
    const isSetToObfuscate = this.notificationsPreference() === z.notification.NotificationPreference.OBFUSCATE;
    return isSetToObfuscate || message_et.is_ephemeral();
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
    const permissionDenied = this.permissionState === z.notification.PermissionStatusState.DENIED;
    const preferenceIsNone = this.notificationsPreference() === z.notification.NotificationPreference.NONE;
    const supportsNotification = z.util.Environment.browser.supports.notifications;

    const hideNotification =
      activeConversation || messageFromSelf || permissionDenied || preferenceIsNone || !supportsNotification;

    if (hideNotification) {
      const error = new z.notification.NotificationError(z.notification.NotificationError.TYPE.HIDE_NOTIFICATION);
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  /**
   * Sending the notification.
   *
   * @param {Object} notificationContent - Content of notification
   * @option notificationContent [String] title
   * @option notificationContent [Object] options
   * @option notificationContent [Function] trigger
   * @option notificationContent [Integer] timeout
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

    notification.onerror = () => {
      this.logger.error(`Notification for ${messageInfo} in '${conversationId}' closed by error.`);
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
};
