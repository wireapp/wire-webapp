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
window.z.viewModel = z.viewModel || {};
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.ConversationListViewModel = class ConversationListViewModel {
  /**
   * View model for conversation list.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.click_on_conversation = this.click_on_conversation.bind(this);
    this.is_selected_conversation = this.is_selected_conversation.bind(this);

    this.content_view_model = mainViewModel.content;
    this.list_view_model = listViewModel;
    this.calling_repository = repositories.calling;
    this.conversation_repository = repositories.conversation;
    this.team_repository = repositories.team;
    this.user_repository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.list.ConversationListViewModel', z.config.LOGGER.OPTIONS);

    this.show_calls = ko.observable(false);

    this.contentState = this.content_view_model.state;
    this.selected_conversation = ko.observable();

    this.is_team = this.team_repository.isTeam;

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

    this.noConversations = ko.pureComputed(() => {
      const noConversations = !this.conversations_unarchived().length && !this.conversations_calls().length;
      return noConversations && !this.connect_requests().length;
    });

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
    this.content_view_model.switchContent(z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
  }

  click_on_conversation(conversation_et) {
    if (!this.is_selected_conversation(conversation_et)) {
      this.content_view_model.showConversation(conversation_et);
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
      z.viewModel.ContentViewModel.STATE.COLLECTION,
      z.viewModel.ContentViewModel.STATE.COLLECTION_DETAILS,
      z.viewModel.ContentViewModel.STATE.CONVERSATION,
    ].includes(this.contentState());

    return is_selected_conversation && is_selected_state;
  }

  on_webapp_loaded() {
    this.webapp_is_loaded(true);
  }

  //##############################################################################
  // Footer actions
  //##############################################################################

  click_on_archived_button() {
    this.list_view_model.switch_list(z.viewModel.ListViewModel.STATE.ARCHIVE);
  }

  click_on_preferences_button() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  click_on_people_button() {
    this.list_view_model.switch_list(z.viewModel.ListViewModel.STATE.START_UI);
  }

  //##############################################################################
  // Legacy
  //##############################################################################

  click_on_clear_action() {
    // desktop clients <= 2.13.2742 rely on that function.
    amplify.publish(z.event.WebApp.SHORTCUT.DELETE);
  }
};
