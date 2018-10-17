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

  getTeamById(teamId) {
    return this.client.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}`,
    });
  }

  getTeamMember(teamId, userId) {
    return this.client.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/members/${userId}`,
    });
  }

  getTeamMembers(teamId) {
    return this.client.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/members`,
    });
  }

  getTeams(limit = 100, teamIds) {
    return this.client.sendRequest({
      data: {
        size: limit,
        start: teamIds,
      },
      type: 'GET',
      url: TeamService.URL.TEAMS,
    });
  }

  getWhitelistedServices(teamId, size = 100, prefix) {
    return this.client.sendRequest({
      data: {
        prefix,
        size,
      },
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/services/whitelisted`,
    });
  }
};
