/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.system_notification = z.system_notification || {};

/**
 * System notification repository to trigger browser and audio notifications.
 *
 * @see https://developer.mozilla.org/en/docs/Web/API/notification
 * @see http://www.w3.org/TR/notifications
 */
z.system_notification.SystemNotificationRepository = class SystemNotificationRepository {
  static get CONFIG() {
    return {
      BODY_LENGTH: 80,
      ICON_URL: '/image/logo/notification.png',
      TIMEOUT: 5000,
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
   * Construct a new System Notification Repository.
   * @param {z.calling.CallingRepository} calling_repository - Repository for all call interactions
   * @param {z.conversation.ConversationService} conversation_repository - Repository for all conversation interactions
   */
  constructor(calling_repository, conversation_repository) {
    this.calling_repository = calling_repository;
    this.conversation_repository = conversation_repository;
    this.logger = new z.util.Logger('z.system_notification.SystemNotificationRepository', z.config.LOGGER.OPTIONS);

    this.notifications = [];

    this.subscribe_to_events();
    this.notifications_preference = ko.observable(z.system_notification.SystemNotificationPreference.ON);
    this.notifications_preference.subscribe((notifications_preference) => {
      if (notifications_preference !== z.system_notification.SystemNotificationPreference.NONE) {
        this.check_permission();
      }
    });

    this.permission_state = z.system_notification.PermissionStatusState.PROMPT;
    this.permission_status = undefined;
  }

  subscribe_to_events() {
    amplify.subscribe(z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, this.notify.bind(this));
    amplify.subscribe(z.event.WebApp.SYSTEM_NOTIFICATION.PERMISSION_STATE, this.set_permission_state.bind(this));
    amplify.subscribe(z.event.WebApp.SYSTEM_NOTIFICATION.REMOVE_READ, this.remove_read_notifications.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updated_properties.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, this.updated_notifications_property.bind(this));
  }

  /**
   * Check for browser permission if we have not yet asked.
   * @returns {Promise} Promise that resolves with the permission state
   */
  check_permission() {
    if ([
      z.system_notification.PermissionStatusState.GRANTED,
      z.system_notification.PermissionStatusState.IGNORED,
      z.system_notification.PermissionStatusState.UNSUPPORTED,
    ].includes(this.permission_state)) {
      return Promise.resolve(this.permission_state);
    }

    if (!z.util.Environment.browser.supports.notifications) {
      this.set_permission_state(z.system_notification.PermissionStatusState.UNSUPPORTED);
      return Promise.resolve(this.permission_state);
    }

    if (navigator.permissions) {
      return navigator.permissions.query({name: 'notifications'})
        .then((permission_status) => {
          this.permission_status = permission_status;
          this.permission_status.onchange = () => {
            return this.set_permission_state(this.permission_status.state);
          };

          switch (permission_status.state) {
            case z.system_notification.PermissionStatusState.PROMPT:
              return this._request_permission();
            default:
              return this.set_permission_state(permission_status.state);
          }
        });
    }
    switch (window.Notification.permission) {
      case z.system_notification.PermissionStatusState.DEFAULT:
        return this._request_permission();
      default:
        this.set_permission_state(window.Notification.permission);
        return Promise.resolve(this.permission_state);
    }
  }

  /**
   * Close all notifications.
   * @returns {undefined} No return value
   */
  clear_notifications() {
    this.notifications.forEach((notification) => {
      notification.close();
      if (notification.data) {
        const {conversation_id, message_id} = notification.data;
        this.logger.info(`Notification for '${message_id}' in '${conversation_id}' closed on unload.`, notification);
      }
    });
  }

  /**
   * Display browser notification and play sound notification.
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Promise} Resolves when notification has been handled
   */
  notify(conversation_et, message_et) {
    return Promise.resolve()
      .then(() => {
        if (conversation_et.is_muted && conversation_et.is_muted()) {
          return;
        }

        if (message_et.is_content() && message_et.was_edited()) {
          return;
        }

        if (SystemNotificationRepository.EVENTS_TO_NOTIFY.includes(message_et.super_type)) {
          this._notify_sound(message_et);
          return this._notify_banner(conversation_et, message_et);
        }
      });
  }

  // Remove notifications from the queue that are no longer unread
  remove_read_notifications() {
    this.notifications.forEach((notification) => {
      if (notification.data) {
        const {conversation_id, message_id} = notification.data;
        this.conversation_repository.is_message_read(conversation_id, message_id)
          .then((is_read) => {
            if (is_read) {
              notification.close();
              this.logger.info(`Removed read notification for '${message_id}' in '${conversation_id}'.`);
            }
          });
      }
    });
  }

  /**
   * Set the permission state.
   * @param {z.system_notification.PermissionStatusState} permission_state - State of browser permission
   * @returns {z.system_notification.PermissionStatusState} New permission state
   */
  set_permission_state(permission_state) {
    return this.permission_state = permission_state;
  }

  updated_properties(properties) {
    return this.notifications_preference(properties.settings.notifications);
  }

  updated_notifications_property(notification_preference) {
    return this.notifications_preference(notification_preference);
  }

  /**
   * Creates the notification body for calls.
   * @private
   * @param {z.entity.Message} message_et - Message entity
   * @returns {string} Notification message body
   */
  _create_body_call(message_et) {
    if (message_et.is_activation()) {
      return z.l10n.text(z.string.system_notification_voice_channel_activate);
    }
    if (message_et.is_deactivation() && message_et.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED) {
      return z.l10n.text(z.string.system_notification_voice_channel_deactivate);
    }
  }

  /**
   * Creates the notification body for text messages and pictures.
   *
   * @private
   * @param {z.entity.ContentMessage} message_et - Normal message entity
   * @returns {string} Notification message body
   */
  _create_body_content(message_et) {
    if (message_et.has_asset_text()) {
      for (const asset_et of message_et.assets()) {
        if (asset_et.is_text() && !asset_et.previews().length) {
          return z.util.StringUtil.truncate(asset_et.text, SystemNotificationRepository.CONFIG.BODY_LENGTH);
        }
      }
    } else if (message_et.has_asset_image()) {
      return z.l10n.text(z.string.system_notification_asset_add);
    } else if (message_et.has_asset_location()) {
      return z.l10n.text(z.string.system_notification_shared_location);
    } else if (message_et.has_asset()) {
      const asset_et = message_et.assets()[0];
      if (asset_et.is_audio()) {
        return z.l10n.text(z.string.system_notification_shared_audio);
      }
      if (asset_et.is_video()) {
        return z.l10n.text(z.string.system_notification_shared_video);
      }
      if (asset_et.is_file()) {
        return z.l10n.text(z.string.system_notification_shared_file);
      }
    }
  }

  /**
   * Creates the notification body for a renamed conversation.
   *
   * @private
   * @param {z.entity.RenameMessage} message_et - Rename message entity
   * @returns {string} Notification message body
   */
  _create_body_conversation_rename(message_et) {
    return z.l10n.text(z.string.system_notification_conversation_rename, {
      name: message_et.name,
      user: message_et.user().first_name(),
    });
  }

  /**
   * Creates the notification body for people being added to a group conversation.
   *
   * @private
   * @param {z.entity.Message} message_et - Member message entity
   * @returns {string} Notification message body
   */
  _create_body_member_join(message_et) {
    if (message_et.user_ets().length === 1) {
      const user2_name = z.util.get_first_name(message_et.user_ets()[0], z.string.Declension.ACCUSATIVE);
      return z.l10n.text(z.string.system_notification_member_join_one, {
        user1: message_et.user().first_name(),
        user2: user2_name,
      });
    }

    return z.l10n.text(z.string.system_notification_member_join_many, {
      number: message_et.user_ids().length,
      user: message_et.user().first_name(),
    });
  }

  /**
   * Creates the notification body for people being removed from or leaving a group conversation.
   * @note Only show a notification if self user was removed
   *
   * @private
   * @param {z.entity.MemberMessage} message_et - Member message entity
   * @returns {string} Notification message body
   */
  _create_body_member_leave(message_et) {
    if (message_et.user_ets().length === 1 && !message_et.remote_user_ets().length) {
      return z.l10n.text(z.string.system_notification_member_leave_removed_you, message_et.user().first_name());
    }
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.MemberMessage} message_et - Member message entity
   * @param {z.entity.Conversation|z.entity.Connection} conversation_et - Conversation or connection entity
   * @returns {string} Notification message body
   */
  _create_body_member_update(message_et, conversation_et) {
    const is_group_conversation = conversation_et instanceof z.entity.Conversation ? conversation_et.is_group() : false;

    switch (message_et.member_message_type) {
      case z.message.SystemMessageType.NORMAL:
        if (is_group_conversation) {
          if (message_et.is_member_join()) {
            return this._create_body_member_join(message_et);
          }
          if (message_et.is_member_leave()) {
            return this._create_body_member_leave(message_et);
          }
        }
        break;
      case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        return z.l10n.text(z.string.system_notification_connection_accepted);
      case z.message.SystemMessageType.CONNECTION_CONNECTED:
        return z.l10n.text(z.string.system_notification_connection_connected);
      case z.message.SystemMessageType.CONNECTION_REQUEST:
        return z.l10n.text(z.string.system_notification_connection_request);
      case z.message.SystemMessageType.CONVERSATION_CREATE:
        return z.l10n.text(z.string.system_notification_conversation_create, message_et.user().first_name());
      default:
        this.logger.log(this.logger.levels.OFF, `Notification for '${message_et.id} in '${conversation_et.id}' does not show notification.`);
    }
  }

  /**
   * Creates the notification body for obfuscated messages.
   * @private
   * @returns {string} Notification message body
   */
  _create_body_obfuscated() {
    return z.l10n.text(z.string.system_notification_obfuscated);
  }

  /**
   * Creates the notification body for ping.
   * @private
   * @returns {string} Notification message body
   */
  _create_body_ping() {
    return z.l10n.text(z.string.system_notification_ping);
  }

  /**
   * Creates the notification body for reaction.
   * @private
   * @param {z.entity.Message} message_et - Fake reaction message entity
   * @returns {string} Notification message body
   */
  _create_body_reaction(message_et) {
    return z.l10n.text(z.string.system_notification_reaction, message_et.reaction);
  }

  /**
   * Selects the type of system message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.MemberMessage} message_et - Member message entity
   * @returns {string} Notification message body
   */
  _create_body_system(message_et) {
    if (message_et.system_message_type === z.message.SystemMessageType.CONVERSATION_RENAME) {
      return this._create_body_conversation_rename(message_et);
    }
  }

  /**
   * Create notification content.
   * @private
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Promise} Resolves with the notification content
   */
  _create_notification_content(conversation_et, message_et) {
    let options_body = undefined;

    return this._create_options_body(conversation_et, message_et)
      .then((body) => {
        options_body = body;
        if (options_body) {
          return this._should_obfuscate_notification_sender(message_et);
        }
        throw new z.system_notification.SystemNotificationError(z.system_notification.SystemNotificationError.TYPE.HIDE_NOTIFICATION);
      })
      .then((should_obfuscate_sender) => {
        return this._create_options_icon(should_obfuscate_sender, message_et.user())
          .then((icon_url) => {
            return {
              options: {
                body: this._should_obfuscate_notification_message(message_et) ? this._create_body_obfuscated() : options_body,
                data: this._create_options_data(conversation_et, message_et),
                icon: icon_url,
                silent: true, // @note When Firefox supports this we can remove the fix for WEBAPP-731
                tag: this._create_options_tag(conversation_et),
              },
              timeout: SystemNotificationRepository.CONFIG.TIMEOUT,
              title: should_obfuscate_sender ? this._create_title_obfuscated() : this._create_title(conversation_et, message_et),
              trigger: this._create_trigger(conversation_et, message_et),
            };
          });
      });
  }

  /**
   * Selects the type of message that the notification body needs to be created for.
   *
   * @private
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {string} Notification message body
   */
  _create_options_body(conversation_et, message_et) {
    return Promise.resolve()
      .then(() => {
        switch (message_et.super_type) {
          case z.message.SuperType.CALL:
            return this._create_body_call(message_et);
          case z.message.SuperType.CONTENT:
            return this._create_body_content(message_et);
          case z.message.SuperType.MEMBER:
            return this._create_body_member_update(message_et, conversation_et);
          case z.message.SuperType.PING:
            return this._create_body_ping();
          case z.message.SuperType.REACTION:
            return this._create_body_reaction(message_et);
          case z.message.SuperType.SYSTEM:
            return this._create_body_system(message_et);
          default:
            this.logger.log(this.logger.levels.OFF, `Notification for '${message_et.id} in '${conversation_et.id}' does not show notification.`);
        }
      });
  }

  /**
   * Creates the notification data to help check its content.
   *
   * @private
   * @param {z.entity.Conversation|z.entity.Connection} input - Information to grab the conversation ID from
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Object} Notification message data
   */
  _create_options_data(input, message_et) {
    return {
      conversation_id: input.id || input.conversation_id,
      message_id: message_et.id,
    };
  }

  /**
   * Creates the notification icon.
   *
   * @private
   * @param {boolean} should_obfuscate_sender - Sender visible in notification
   * @param {z.entity.User} user_et - Sender of message
   * @returns {string} Icon URL
  */
  _create_options_icon(should_obfuscate_sender, user_et) {
    if (user_et.preview_picture_resource() && !should_obfuscate_sender) {
      return user_et.preview_picture_resource().generate_url()
        .catch((error) => {
          if (error instanceof z.util.ValidationUtilError) {
            this.logger.error(`Failed to validate an asset URL: ${error.message}`);
          }
          return '';
        });
    }

    if (z.util.Environment.electron && z.util.Environment.os.mac) {
      return Promise.resolve('');
    }
    return Promise.resolve(SystemNotificationRepository.CONFIG.ICON_URL);
  }

  /**
   * Creates the notification tag.
   *
   * @private
   * @param {z.entity.Conversation|z.entity.Connection} input - Information to create the tag from
   * @returns {string} Notification message tag
  */
  _create_options_tag(input) {
    return input.id || input.conversation_id;
  }

  /**
   * Creates the notification title.
   *
   * @private
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {string} Notification message title
   */
  _create_title(conversation_et, message_et) {
    if (conversation_et instanceof z.entity.Conversation && conversation_et.display_name()) {
      if (conversation_et.is_group()) {
        return z.util.StringUtil.truncate(`${message_et.user().first_name()} in ${conversation_et.display_name()}`, SystemNotificationRepository.CONFIG.TITLE_LENGTH, false);
      }
      return z.util.StringUtil.truncate(conversation_et.display_name(), SystemNotificationRepository.CONFIG.TITLE_LENGTH, false);
    }
    return z.util.StringUtil.truncate(message_et.user().name(), SystemNotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Create obfuscated title.
   * @private
   * @returns {string} Obfuscated notification message title
   */
  _create_title_obfuscated() {
    return z.util.StringUtil.truncate(z.l10n.text(z.string.system_notification_obfuscated_title), SystemNotificationRepository.CONFIG.TITLE_LENGTH, false);
  }

  /**
   * Creates the notification trigger.
   *
   * @private
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Function} Function to be called when notification is clicked
   */
  _create_trigger(conversation_et, message_et) {
    if (message_et.is_member()) {
      switch (message_et.member_message_type) {
        case z.message.SystemMessageType.CONNECTION_ACCEPTED:
          return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et.conversation_id);
        case z.message.SystemMessageType.CONNECTION_REQUEST:
          return () => amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
        default:
          this.logger.log(this.logger.levels.OFF, `Notification for member message '${message_et.id} in '${conversation_et.id}' does not have specific trigger.`);
      }
    }
    return () => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
  }

  /**
   * Creates the browser notification and sends it.
   *
   * @private
   * @see https://developer.mozilla.org/en/docs/Web/API/notification#Parameters
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Promise} Resolves when notification was handled
   */
  _notify_banner(conversation_et, message_et) {
    return this._should_show_notification(conversation_et, message_et)
      .then(() => this._create_notification_content(conversation_et, message_et))
      .then((notification_content) => {
        return this.check_permission()
          .then((permission_state) => {
            if (permission_state === z.system_notification.PermissionStatusState.GRANTED) {
              return this._show_notification(notification_content);
            }
          });
      })
      .catch((error) => {
        if (error.type !== z.system_notification.SystemNotificationError.TYPE.HIDE_NOTIFICATION) {
          throw error;
        }
      });
  }


  /**
   * Plays the sound from the audio repository.
   * @private
   * @param {z.entity.Message} message_et - Message entity
   * @returns {undefined} No return value
   */
  _notify_sound(message_et) {
    if (!document.hasFocus() && z.util.Environment.browser.firefox && z.util.Environment.os.mac) {
      return;
    }
    switch (message_et.super_type) {
      case z.message.SuperType.CONTENT:
        if (!message_et.user().is_me) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.NEW_MESSAGE);
        }
        break;
      case z.message.SuperType.PING:
        if (!message_et.user().is_me) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.INCOMING_PING);
        }
        break;
      default:
        this.logger.log(this.logger.levels.OFF, `Notification for message '${message_et.id} does not play sound.`);
    }
  }

  // Request browser permission for notifications.
  _request_permission() {
    return new Promise((resolve) => {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_NOTIFICATION);
      // Note: The callback will be only triggered in Chrome.
      // If you ignore a permission request on Firefox, then the callback will not be triggered.
      if (window.Notification.requestPermission) {
        window.Notification.requestPermission((permission_state) => {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_NOTIFICATION);
          this.set_permission_state(permission_state);
          return resolve(this.permission_state);
        });
      }
    });
  }

  /**
   * Should message in a notification be obfuscated.
   * @private
   * @param {z.entity.Message} message_et - Message entity
   * @returns {boolean} Obfucscate message in notification
   */
  _should_obfuscate_notification_message(message_et) {
    return message_et.is_ephemeral() || [
      z.system_notification.SystemNotificationPreference.OBFUSCATE,
      z.system_notification.SystemNotificationPreference.OBFUSCATE_MESSAGE,
    ].includes(this.notifications_preference());
  }

  /**
   * Should sender in a notification be obfuscated.
   * @private
   * @param {z.entity.Message} message_et - Message entity
   * @returns {boolean} Obfuscate sender in noticiation
   */
  _should_obfuscate_notification_sender(message_et) {
    return message_et.is_ephemeral() || this.notifications_preference() === z.system_notification.SystemNotificationPreference.OBFUSCATE;
  }

  /**
   * Should hide notification.
   * @private
   * @param {z.entity.Conversation} conversation_et - Conversation entity
   * @param {z.entity.Message} message_et - Message entity
   * @returns {Promise} Resolves if the notification should be shown
   */
  _should_show_notification(conversation_et, message_et) {
    const in_active_conversation = this.conversation_repository.is_active_conversation(conversation_et);
    const in_conversation_view = document.hasFocus() && wire.app.view.content.content_state() === z.ViewModel.content.CONTENT_STATE.CONVERSATION;
    const in_maximized_call = this.calling_repository.joined_call() && !wire.app.view.content.multitasking.is_minimized();

    const active_conversation = in_conversation_view && in_active_conversation && !in_maximized_call;
    const message_from_self = message_et.user().is_me;
    const permission_denied = this.permission_state === z.system_notification.PermissionStatusState.DENIED;
    const preference_none = this.notifications_preference() === z.system_notification.SystemNotificationPreference.NONE;
    const supports_notification = z.util.Environment.browser.supports.notifications;

    const hide_notification = active_conversation || message_from_self || permission_denied || preference_none || !supports_notification;

    if (hide_notification) {
      return Promise.reject(new z.system_notification.SystemNotificationError(z.system_notification.SystemNotificationError.TYPE.HIDE_NOTIFICATION));
    }
    return Promise.resolve();
  }

  /**
   * Sending the notification.
   *
   * @param {Object} notification_content - Content of notification
   * @option notification_content [String] title
   * @option notification_content [Object] options
   * @option notification_content [Function] trigger
   * @option notification_content [Integer] timeout
   * @returns {undefined} No return value
   */
  _show_notification(notification_content) {
    amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.SHOW, notification_content);
    this._show_notification_in_browser(notification_content);
  }

  /**
   * Sending the browser notification.
   *
   * @private
   * @param {Object} notification_content - Content of notification
   * @param {string} notification_content.title - Notification title
   * @param {Object} notification_content.options - Notification options
   * @param {Function} notification_content.trigger - Function to be triggered on click [Function] trigger
   * @param {number} notification_content.timeout - Timeout for notification
   * @returns {undefined} No return value
   */
  _show_notification_in_browser(notification_content) {
    /*
    @note Notification.data is only supported on Chrome
    @see https://developer.mozilla.org/en-US/docs/Web/API/Notification/data
    */
    this.remove_read_notifications();
    const notification = new window.Notification(notification_content.title, notification_content.options);
    const {conversation_id, message_id = 'ID not specified'} = notification_content.options.data;
    let timeout_trigger_id = undefined;

    notification.onclick = () => {
      amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.CLICK);
      window.focus();
      wire.app.view.content.multitasking.is_minimized(true);
      notification_content.trigger();
      this.logger.info(`Notification for message '${message_id} in conversation '${conversation_id}' closed by click.`);
      notification.close();
    };

    notification.onclose = () => {
      window.clearTimeout(timeout_trigger_id);
      this.notifications.splice(this.notifications.indexOf(notification), 1);
      this.logger.info(`Removed notification for '${message_id}' in '${conversation_id}' locally.`);
    };

    notification.onerror = () => {
      this.logger.error(`Notification for '${message_id}' in '${conversation_id}' closed by error.`);
      notification.close();
    };

    notification.onshow = () => {
      timeout_trigger_id = window.setTimeout(() => {
        this.logger.info(`Notification for '${message_id}' in '${conversation_id}' closed by timeout.`);
        notification.close();
      },
      notification_content.timeout);
    };

    this.notifications.push(notification);
    this.logger.info(`Added notification for '${message_id}' in '${conversation_id}' to queue.`);
  }
};
