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
  constructor(team_repository, conversation_repository, user_repository) {
    this.team_repository = team_repository;
    this.conversation_repository = conversation_repository;
    this.user_repository = user_repository;
    this.teams = this.team_repository.teams;
    this.self = this.user_repository.self;

    this.active_team = this.conversation_repository.active_team;
    this.show_badge = ko.observable(false);

    this.click_on_team = this.click_on_team.bind(this);

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.SHOW, () => this.show_badge(true));
    amplify.subscribe(z.event.WebApp.SEARCH.BADGE.HIDE, () => this.show_badge(false));
  }

  click_on_personal() {
    const personal_team_et = new z.team.TeamEntity(); // TODO: use Peronsal team
    this.conversation_repository.set_active_team(personal_team_et);
  }

  click_on_team(team_et) {
    this.conversation_repository.set_active_team(team_et);
  }

  click_on_preferences_button() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

};
