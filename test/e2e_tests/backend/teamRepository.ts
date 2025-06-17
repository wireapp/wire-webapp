/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {BackendClient} from './backendClient';

import {User} from '../data/user';

export class TeamRepository extends BackendClient {
  async getTeamIdForUser(user: User): Promise<string> {
    const response = await this.axiosInstance.get('teams', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    if (response.data && response.data.teams && response.data.teams.length > 0) {
      // Pick the first team for the user
      return (user.teamId = response.data.teams[0].id);
    }
    throw new Error('No teams found for the user');
  }

  async inviteUserToTeam(teamId: string, emailOfInvitee: string, inviterName: string, token: string): Promise<string> {
    const response = this.axiosInstance.post(
      `teams/${teamId}/invitations`,
      {
        inviterName: inviterName,
        role: 'member',
        email: emailOfInvitee,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return (await response).data.id;
  }

  async deleteTeam(user: User, teamId: string) {
    await this.axiosInstance.request({
      url: `teams/${teamId}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      data: {
        password: user.password,
      },
    });
  }
}
