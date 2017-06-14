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

z.ViewModel.list.TeamsTabViewModel = class TeamsTabViewModel {
  constructor(list_view_model, conversation_repository, team_repository, user_repository) {
    this.list_view_model = list_view_model;

    this.conversation_repository = conversation_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;

    this.personal_space = this.team_repository.personal_space;
    this.self = this.user_repository.self;
    this.teams = ko.pureComputed(() =>
      this.team_repository.teams().sort((team_a, team_b) => team_a.name() > team_b.name())
    );

    this.active_team = this.team_repository.active_team;
    this.active_team_id = ko.pureComputed(() => {
      if (this.list_view_model.list_state() !== z.ViewModel.list.LIST_STATE.PREFERENCES) {
        return this.active_team().id || null;
      }
    });

    this.accent_color = ko.pureComputed(() => {
      const self_user_et = this.user_repository.self();
      if (self_user_et) {
        return `accent-color-${self_user_et.accent_id()}`;
      }
      return '';
    });

    this.show_badge = ko.observable(false);

    this.click_on_team = this.click_on_team.bind(this);

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.SHOW, () => this.show_badge(true));
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.HIDE, () => this.show_badge(false));
  }

  click_on_personal() {
    this.conversation_repository.set_active_team(this.personal_space);
    this._show_last_conversation(this.personal_space);
  }

  click_on_team(team_et) {
    this.conversation_repository.set_active_team(team_et);
    this._show_last_conversation(team_et);
  }

  click_on_preferences_button() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  _show_last_conversation(team_et) {
    const preferences_state = this.list_view_model.list_state() === z.ViewModel.list.LIST_STATE.PREFERENCES;
    if (preferences_state) {
      this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS, false);
    }

    const start_ui_state = this.list_view_model.list_state() === z.ViewModel.list.LIST_STATE.START_UI;
    if (!start_ui_state) {
      const last_conversation = team_et.last_active_conversation;
      const conversation_et = last_conversation
        ? last_conversation
        : this.conversation_repository.get_most_recent_conversation();
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
    }
  }
};
