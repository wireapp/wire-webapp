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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.list = z.ViewModel.list || {};

z.ViewModel.list.TakeoverViewModel = class TakeoverViewModel {
  /**
   * View model for the username takeover screen.
   *
   * @param {string} element_id - HTML selector
   * @param {z.conversation.ConversationRepository} conversation_repository - Conversation repository
   * @param {z.user.UserRepository} user_repository - User repository
   */
  constructor(element_id, conversation_repository, user_repository) {
    this.conversation_repository = conversation_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.list.TakeoverViewModel', z.config.LOGGER.OPTIONS);

    this.self_user = this.user_repository.self;

    this.name = ko.pureComputed(() => {
      if (this.self_user()) {
        return this.self_user().name();
      }
    });

    this.username = ko.pureComputed(() => {
      if (this.self_user()) {
        return this.self_user().username();
      }
    });
  }

  keep_username() {
    this.user_repository
      .change_username(this.username())
      .then(() => {
        const conversation_et = this.conversation_repository.get_most_recent_conversation();
        if (conversation_et) {
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
        } else if (this.user_repository.connect_requests().length) {
          amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
        }

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.KEPT_GENERATED_USERNAME, {
          outcome: 'success',
        });
      })
      .catch(function() {
        amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.KEPT_GENERATED_USERNAME, {
          outcome: 'fail',
        });
      })
      .then(() => amplify.publish(z.event.WebApp.TAKEOVER.DISMISS));
  }

  choose_username() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.OPENED_USERNAME_SETTINGS);
    amplify.publish(z.event.WebApp.TAKEOVER.DISMISS);
    window.requestAnimationFrame(() => amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT));
  }

  on_added_to_view() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.SEEN_USERNAME_SCREEN);
  }

  on_link_click() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.OPENED_USERNAME_FAQ);
    return true;
  }
};
