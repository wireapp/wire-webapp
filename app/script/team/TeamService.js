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
window.z.team = z.team || {};

z.team.TeamService = class TeamService {
  static get URL() {
    return {
      TEAMS: '/teams',
    };
  }

  /**
   * Construct a new Team Service.
   * @class z.user.TeamService
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.team.TeamService', z.config.LOGGER.OPTIONS);
  }

  delete_member(team_id, user_id) {
    return this.client.send_json({
      data: {
        todo: 'Change this to normal request!',
      },
      type: 'DELETE',
      url: this.client.create_url(`${TeamService.URL.TEAMS}/${team_id}/members/${user_id}`),
    });
  }

  delete_team() {
    return this.client.send_json({
      data: {
        todo: 'Change this to normal request!',
      },
      type: 'DELETE',
      url: this.client.create_url(TeamService.URL.TEAMS),
    });
  }

  get_members(team_id) {
    return this.client.send_request({
      data: {
        todo: 'Change this to normal request!',
      },
      type: 'GET',
      url: this.client.create_url(`${TeamService.URL.TEAMS}/${team_id}/members`),
    });
  }

  get_teams(limit = 100, team_ids) {
    return this.client.send_request({
      data: {
        size: limit,
        start: team_ids,
      },
      type: 'GET',
      url: this.client.create_url(TeamService.URL.TEAMS),
    });
  }

  post_members(team_id, members) {
    return this.client.send_json({
      data: {
        members: members,
      },
      type: 'POST',
      url: this.client.create_url(`${TeamService.URL.TEAMS}/${team_id}/members`),
    });
  }

  post_team(name, members, icon, icon_key = null) {
    return this.client.send_json({
      data: {
        icon: icon,
        icon_key: icon_key,
        members: members,
        name: name,
      },
      type: 'POST',
      url: this.client.create_url(TeamService.URL.TEAMS),
    });
  }

  put_team(team_id, name, icon, icon_key = null) {
    return this.client.send_json({
      data: {
        icon: icon,
        icon_key: icon_key,
        name: name,
      },
      type: 'PUT',
      url: this.client.create_url(`${TeamService.URL.TEAMS}/${team_id}`),
    });
  }
};
