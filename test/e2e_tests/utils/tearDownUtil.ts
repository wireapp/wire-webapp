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

import {User} from '../data/user';

const createdUsers: Map<User['id'], User> = new Map();
const createdTeams: Map<User, string> = new Map();

// Utility functions to manage created personal users for cleanup
export const addCreatedUser = (user: User) => {
  if (!user.id) {
    throw new Error('User must have an ID to be added to createdUsers');
  }
  createdUsers.set(user.id, user);
};

// Utility functions to manage created teams for cleanup (no need to pass user, as teams are associated with users)
export const addCreatedTeam = (user: User, teamId: string) => {
  if (!user.id) {
    throw new Error('User must have an ID to be added to createdTeams');
  }
  createdTeams.set(user, teamId);
};

export const removeCreatedTeam = async (api: ApiManagerE2E, user: User) => {
  if (!user.id) {
    throw new Error('User must have an ID to be removed from createdTeams');
  }
  const teamId = createdTeams.get(user);
  if (!teamId) {
    throw new Error(`No team found for user ${user.id}`);
  }
  await api.team.deleteTeam(user, teamId);
  createdTeams.delete(user);
};

export const removeCreatedUser = async (api: ApiManagerE2E, user: User) => {
  if (!user.id) {
    throw new Error('User must have an ID to be removed from createdUsers');
  }
  const token = user.token ?? (await api.auth.loginUser(user)).data.access_token;
  if (!token) {
    throw new Error(`Couldn't fetch token for ${user.username}`);
  }
  await api.user.deleteUser(user.password, token);
  createdUsers.delete(user.id);
};

// Function to tear down created users and teams
// This function should be called after tests to clean up the created data
export const tearDownAll = async (api: ApiManagerE2E) => {
  for (const [user] of createdTeams.entries()) {
    await removeCreatedTeam(api, user);
  }
  createdTeams.clear();

  for (const [, user] of createdUsers.entries()) {
    await removeCreatedUser(api, user);
  }
  createdUsers.clear();
};
