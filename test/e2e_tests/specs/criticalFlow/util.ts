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

import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';

import {User} from '../../data/user';

const createdUsers: User[] = [];
const createdTeams: Map<User, string> = new Map();

export const getCreatedUsers = () => createdUsers;
export const getCreatedTeams = () => createdTeams;

export const addCreatedUser = (user: User) => {
  createdUsers.push(user);
};

export const addCreatedTeam = (user: User, teamId: string) => {
  createdTeams.set(user, teamId);
};

export const tearDown = async (api: ApiManagerE2E) => {
  for (const [user, teamId] of createdTeams.entries()) {
    await api.team.deleteTeam(user, teamId);
  }
  createdTeams.clear();

  for (const user of createdUsers) {
    const token = user.token ?? (await api.auth.loginUser(user)).data.access_token;
    if (!token) {
      throw new Error(`Couldn't fetch token for ${user.username}`);
    }
    await api.user.deleteUser(user.password, token);
  }
  createdUsers.length = 0;
};
