/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import type {Page} from '@playwright/test';

import type {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {LOGIN_TIMEOUT, type Team} from 'test/e2e_tests/test.fixtures';

export const loginWithMeetingsEnabled = (user: Pick<User, 'email' | 'password'>) => async (page: Page) => {
  const pageManager = PageManager.from(page);
  const {pages, components} = pageManager.webapp;
  await pageManager.openLoginPage();
  await pages.login().login(user);
  await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
};

export const createMeetingsTeam = async (
  createUser: () => Promise<User>,
  createTeam: (name: string, options: {users: User[]; features: {meetings: true; mls: true}}) => Promise<Team>,
  memberCount: number,
) => {
  const members = await Promise.all(Array.from({length: memberCount}, () => createUser()));
  const team = await createTeam('Meetings', {users: members, features: {meetings: true, mls: true}});

  return {team, members, owner: team.owner};
};

export const loginMeetingsUsers = async (
  createPage: (setup: ReturnType<typeof loginWithMeetingsEnabled>) => Promise<import('@playwright/test').Page>,
  users: Pick<User, 'email' | 'password'>[],
) => Promise.all(users.map(user => createPage(loginWithMeetingsEnabled(user))));
