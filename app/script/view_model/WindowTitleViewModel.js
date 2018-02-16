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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.WindowTitleViewModel = class WindowTitleViewModel {
  constructor(content_state, conversation_repository, user_repository) {
    this.content_state = content_state;
    this.conversation_repository = conversation_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.WindowTitleViewModel', z.config.LOGGER.OPTIONS);

    this.update_window_title = ko.observable(false);

    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.set_update_state.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.initiate_title_updates.bind(this));
  }

  initiate_title_updates() {
    this.logger.info('Starting to update window title');
    this.update_window_title(true);

    ko
      .computed(() => {
        if (this.update_window_title()) {
          let window_title = '';
          let number_of_unread_conversations = 0;
          const number_of_requests = this.user_repository.connect_requests().length;

          this.conversation_repository.conversations_unarchived().forEach(conversation_et => {
            const is_ignored = conversation_et.is_request() || conversation_et.is_muted();
            if (conversation_et.unread_message_count() && !is_ignored) {
              number_of_unread_conversations++;
            }
          });

          this.conversation_repository.conversations_calls().forEach(conversation_et => {
            if (conversation_et.has_joinable_call()) {
              number_of_unread_conversations++;
            }
          });

          const badge_count = number_of_requests + number_of_unread_conversations;
          if (badge_count > 0) {
            window_title = `(${badge_count}) · `;
          }

          amplify.publish(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, badge_count);

          switch (this.content_state()) {
            case z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS: {
              if (number_of_requests > 1) {
                window_title += z.l10n.text(z.string.conversations_connection_request_many, number_of_requests);
              } else {
                window_title += z.l10n.text(z.string.conversations_connection_request_one);
              }
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.CONVERSATION: {
              if (this.conversation_repository.active_conversation()) {
                window_title += this.conversation_repository.active_conversation().display_name();
              }
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT: {
              window_title += z.l10n.text(z.string.preferences_about);
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT: {
              window_title += z.l10n.text(z.string.preferences_account);
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_AV: {
              window_title += z.l10n.text(z.string.preferences_av);
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS: {
              window_title += z.l10n.text(z.string.preferences_device_details);
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES: {
              window_title += z.l10n.text(z.string.preferences_devices);
              break;
            }

            case z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS: {
              window_title += z.l10n.text(z.string.preferences_options);
              break;
            }

            default:
              break;
          }

          if (window_title !== '' && !window_title.endsWith(' ')) {
            window_title += ' · ';
          }
          window_title += z.l10n.text(z.string.wire);

          window.document.title = window_title;
        }
      })
      .extend({rateLimit: 250});
  }

  set_update_state(handling_notifications) {
    const update_window_title = handling_notifications === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.update_window_title() !== update_window_title) {
      this.update_window_title(update_window_title);
      this.logger.debug(`Set window title update state to '${this.update_window_title()}'`);
    }
  }
};
