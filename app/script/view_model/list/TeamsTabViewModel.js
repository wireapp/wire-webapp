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
  constructor(team_repository, conversation_repository) {
    this.team_repository = team_repository;
    this.conversation_repository = conversation_repository;
    this.teams = this.team_repository.teams;

    this.click_on_team = this.click_on_team.bind(this);
  }

  click_on_team(team_et) {
    this.conversation_repository.set_active_team(team_et);
  }

};
