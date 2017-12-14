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

z.ViewModel.list.ConversationListViewModel = class ConversationListViewModel {
  /**
   * View model for conversation list.
   *
   * @param {string} element_id - HTML selector
   * @param {z.ViewModel.list.ListViewModel} list_view_model - List view model
   * @param {z.ViewModel.ContentViewModel} content_view_model - Content view model
   * @param {z.calling.CallingRepository} calling_repository - Calling repository
   * @param {z.conversation.ConversationRepository} conversation_repository - Conversation repository
   * @param {z.team.TeamRepository} team_repository - Team repository
   * @param {z.user.UserRepository} user_repository - User repository
   */
  constructor(
    element_id,
    list_view_model,
    content_view_model,
    calling_repository,
    conversation_repository,
    team_repository,
    user_repository
  ) {
    this.click_on_conversation = this.click_on_conversation.bind(this);
    this.is_selected_conversation = this.is_selected_conversation.bind(this);

    this.list_view_model = list_view_model;
    this.content_view_model = content_view_model;
    this.calling_repository = calling_repository;
    this.conversation_repository = conversation_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.list.ConversationListViewModel', z.config.LOGGER.OPTIONS);

    this.show_calls = ko.observable(false);

    this.content_state = this.content_view_model.content_state;
    this.selected_conversation = ko.observable();

    this.is_team = this.team_repository.is_team;

    this.self_user = ko.pureComputed(() => this.user_repository.self && this.user_repository.self());
    this.selfAvailability = ko.pureComputed(() => this.self_user() && this.self_user().availability());
    this.selfName = ko.pureComputed(() => this.self_user() && this.self_user().name());

    this.connect_requests = this.user_repository.connect_requests;
    this.connect_requests_text = ko.pureComputed(() => {
      const number_of_requests = this.connect_requests().length;
      if (number_of_requests > 1) {
        return z.l10n.text(z.string.conversations_connection_request_many, number_of_requests);
      }
      return z.l10n.text(z.string.conversations_connection_request_one);
    });

    this.conversations_calls = this.conversation_repository.conversations_calls;
    this.conversations_archived = this.conversation_repository.conversations_archived;
    this.conversations_unarchived = this.conversation_repository.conversations_unarchived;

    this.webapp_is_loaded = ko.observable(false);

    this.should_update_scrollbar = ko
      .computed(() => {
        return (
          this.webapp_is_loaded() ||
          this.conversations_unarchived().length ||
          this.connect_requests().length ||
          this.conversations_calls().length
        );
      })
      .extend({notify: 'always', rateLimit: 500});

    this.active_conversation_id = ko.pureComputed(() => {
      if (this.conversation_repository.active_conversation()) {
        return this.conversation_repository.active_conversation().id;
      }
    });

    this.archive_tooltip = ko.pureComputed(() => {
      return z.l10n.text(z.string.tooltip_conversations_archived, this.conversations_archived().length);
    });

    this.start_tooltip = z.l10n.text(
      z.string.tooltip_conversations_start,
      z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.START)
    );

    this.show_connect_requests = ko.pureComputed(() => this.connect_requests().length);

    this.show_badge = ko.observable(false);

    this._init_subscriptions();
  }

  clickOnAvailability(viewModel, event) {
    z.ui.AvailabilityContextMenu.show(event, 'list_header', 'left-list-availability-menu');
  }

  click_on_connect_requests() {
    this.content_view_model.switch_content(z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
  }

  click_on_conversation(conversation_et) {
    if (!this.is_selected_conversation(conversation_et)) {
      this.content_view_model.show_conversation(conversation_et);
    }
  }

  set_show_calls_state(handling_notifications) {
    const updated_show_calls_state = handling_notifications === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.show_calls !== updated_show_calls_state) {
      this.show_calls(updated_show_calls_state);
      this.logger.debug(`Set show calls state to: ${this.show_calls()}`);
    }
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.set_show_calls_state.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.on_webapp_loaded.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.START, this.click_on_people_button.bind(this));
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.SHOW, () => this.show_badge(true));
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.HIDE, () => this.show_badge(false));
  }

  is_selected_conversation(conversation_et) {
    const is_selected_conversation = this.conversation_repository.is_active_conversation(conversation_et);
    const is_selected_state = [
      z.ViewModel.content.CONTENT_STATE.COLLECTION,
      z.ViewModel.content.CONTENT_STATE.COLLECTION_DETAILS,
      z.ViewModel.content.CONTENT_STATE.CONVERSATION,
    ].includes(this.content_state());

    return is_selected_conversation && is_selected_state;
  }

  on_webapp_loaded() {
    this.webapp_is_loaded(true);
  }

  //##############################################################################
  // Footer actions
  //##############################################################################

  click_on_archived_button() {
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.ARCHIVE);
  }

  click_on_preferences_button() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  click_on_people_button() {
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.START_UI);
  }

  //##############################################################################
  // Legacy
  //##############################################################################

  click_on_clear_action() {
    // desktop clients <= 2.13.2742 rely on that function.
    amplify.publish(z.event.WebApp.SHORTCUT.DELETE);
  }
};
