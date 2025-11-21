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

import {test as baseTest, type BrowserContext, type Page} from '@playwright/test';

import {ApiManagerE2E} from './backend/apiManager.e2e';
import {getUser, User} from './data/user';
import {PageManager} from './pageManager';
import {connectWithUser} from './utils/userActions';

type PagePlugin = (page: Page) => void | Promise<void>;

// Define custom test type with axios fixture
type Fixtures = {
  api: ApiManagerE2E;
  pageManager: PageManager;
  /**
   * Create a new page within a new browser context - The context and it's pages will be removed after the test automatically
   * @param setup Array of PagePlugins, effectively functions which will be applied to the page in the given order
   */
  createPage: (...setup: PagePlugin[]) => Promise<Page>;
  createUser: (options?: Parameters<typeof createUser>[1]) => Promise<User>;
  createTeamOwner: (
    teamName: string,
    options?: Parameters<typeof createUser>[1] & {addMembers?: User[]},
  ) => Promise<User>;
};

export {expect} from '@playwright/test';

export const test = baseTest.extend<Fixtures>({
  api: async ({}, use) => {
    // Create a new instance of ApiManager for each test
    await use(new ApiManagerE2E());
  },
  pageManager: async ({page}, use) => {
    // Create a new instance of PageManager for each test
    await use(new PageManager(page));
  },
  createPage: async ({browser}, use) => {
    const contexts: BrowserContext[] = [];

    await use(async (...setup) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);

      for (const setupFn of setup) {
        await setupFn(page);
      }

      return page;
    });

    // Close all contexts created throughout the tests (will automatically close all pages associated with each context)
    await Promise.all(contexts.map(ctx => ctx.close()));
  },
  createUser: async ({api}, use) => {
    const users: User[] = [];

    await use(async options => {
      const user = await createUser(api, options);
      users.push(user);
      return user;
    });

    await Promise.all(users.map(user => api.deletePersonalUser(user)));
  },
  createTeamOwner: async ({api}, use) => {
    const teamOwners: User[] = [];

    await use(async (teamName, {addMembers, ...options} = {}) => {
      const user = await createUser(api, options);
      const {teamId} = await api.auth.upgradeUserToTeamOwner(user, teamName);

      user.teamId = teamId;
      teamOwners.push(user);

      if (addMembers?.length) {
        await Promise.all(
          addMembers.map(async member => {
            const invitationId = await api.team.inviteUserToTeam(member.email, user);
            const invitationCode = await api.brig.getTeamInvitationCodeForEmail(user.teamId, invitationId);
            await api.team.acceptTeamInvitation(invitationCode, member);
          }),
        );
      }

      return user;
    });

    await Promise.all(teamOwners.map(owner => api.team.deleteTeam(owner, owner.teamId)));
  },
});

/** PagePlugin to log in as the given user */
export const withLogin =
  (user: User | Promise<User>): PagePlugin =>
  async page => {
    const pageManager = PageManager.from(page);
    await pageManager.openLoginPage();
    await pageManager.webapp.pages.login().login(await user);
  };

/**
 * PagePlugin to connect with the given user
 * Note: This plugin only works if the users are in the same team
 */
export const withConnectedUser =
  (user: User | Promise<User>): PagePlugin =>
  async page => {
    const pageManager = PageManager.from(page);
    await connectWithUser(pageManager, await user);
  };

/** PagePlugin to open a conversation with the given user */
export const withConversation =
  (user: Pick<User, 'fullName'>): PagePlugin =>
  async page => {
    await PageManager.from(page).webapp.pages.conversationList().openConversation(user.fullName);
  };

const createUser = async (api: ApiManagerE2E, options?: {disableTelemetry?: boolean}) => {
  const {disableTelemetry = true} = options ?? {};

  const user = getUser();
  await api.createPersonalUser(user);

  if (disableTelemetry) {
    await api.properties.putProperty({settings: {privacy: {telemetry_data_sharing: false}}}, user.token);
  }

  return user;
};
