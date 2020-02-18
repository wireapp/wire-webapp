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

import {getLogger} from 'Util/Logger';

export class TeamService {
  static get URL() {
    return {
      TEAMS: '/teams',
    };
  }

  /**
   * @param {BackendClient} backendClient Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = getLogger('TeamService');
  }

  getTeamConversationRoles(teamId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/conversations/roles`,
    });
  }

  getTeamById(teamId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}`,
    });
  }

  getTeamMember(teamId, userId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/members/${userId}`,
    });
  }

  getLegalHoldState(teamId, userId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/legalhold/${userId}`,
    });
  }

  sendLegalHoldApproval(teamId, userId, password) {
    return this.backendClient.sendJson({
      data: {
        password,
      },
      type: 'PUT',
      url: `${TeamService.URL.TEAMS}/${teamId}/legalhold/${userId}/approve`,
    });
  }

  getTeamMembers(teamId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/members`,
    });
  }

  getTeams(limit = 100, teamIds) {
    return this.backendClient.sendRequest({
      data: {
        size: limit,
        start: teamIds,
      },
      type: 'GET',
      url: TeamService.URL.TEAMS,
    });
  }

  getWhitelistedServices(teamId, size = 100, prefix) {
    return this.backendClient.sendRequest({
      data: {
        prefix,
        size,
      },
      type: 'GET',
      url: `${TeamService.URL.TEAMS}/${teamId}/services/whitelisted`,
    });
  }
}
