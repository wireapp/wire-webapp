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

export interface createGroupConversationDataParams {
  name: string;
  protocol: 'proteus' | 'mls';
  qualifiedUsers: Array<{
    domain: string;
    id: string;
  }>;
  team: {
    teamid: string;
  };
}
export const createGroupConversationData = (data: createGroupConversationDataParams) => ({
  access: ['invite', 'code'],
  add_permission: 'admins',
  access_role_v2: ['team_member', 'non_team_member', 'guest', 'service'],
  conversation_role: 'wire_member',
  name: data.name,
  protocol: data.protocol,
  qualified_users: data.qualifiedUsers,
  users: data.qualifiedUsers.map(user => user.id),
  team: {
    managed: false,
    teamid: data.team.teamid,
  },
});
