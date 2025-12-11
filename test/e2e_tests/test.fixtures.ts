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
import {connectWithUser, sendConnectionRequest} from './utils/userActions';

type PagePlugin = (page: Page) => void | Promise<void>;

// Define custom test type with axios fixture
type Fixtures = {
  api: ApiManagerE2E;
  pageManager: PageManager;
  /**
   * Create a new page within a new browser context - The context and it's pages will be removed after the test automatically
   * @param ctx BrowserContext - optional browser context to reuse, if not provided, a new one will be created
   * @param setup Array of PagePlugins, effectively functions which will be applied to the page in the given order
   */
  createPage: {(...setup: PagePlugin[]): Promise<Page>; (ctx: BrowserContext, ...setup: PagePlugin[]): Promise<Page>};
  /**
   * Create a new user
   * Note: The created user will be deleted automatically once the test is finished
   * @param options Options to set on the new user e.g. declining telemetry
   */
  createUser: (options?: Parameters<typeof createUser>[1]) => Promise<User>;
  /**
   * Creates a team and the associated owner, optionally adding members to it
   * Note: The team and owner are automatically deleted when the test completes.
   * @param options.withMembers Can either be the number of team members to create or an array of existing members to add to the team
   * @param options.enablePaidFeatures If true, sets owner name to 'integrationtest' to enable paid features via backoffice workaround
   * @returns an object containing the teams owner and an array of members. The size of the members array matches the number or array length passed to `withMembers`
   */
  createTeam: (
    teamName: string,
    options?: Parameters<typeof createUser>[1] & {withMembers?: number | User[]; enablePaidFeatures?: boolean},
  ) => Promise<{owner: User; members: User[]}>;
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

    // Due to the function overload firstParam can be either a PagePlugin or a BrowserContext to reuse
    await use(async (firstParam, ...plugins) => {
      let context: BrowserContext;
      let setupFns: PagePlugin[];

      // Check if firstParam is a browser context or PagePlugin
      if (typeof firstParam === 'function' || firstParam === undefined) {
        // Create a new context, add it to the created contexts and treat firstParam as page plugin
        context = await browser.newContext();
        contexts.push(context);
        setupFns = firstParam ? [firstParam, ...plugins] : plugins;
      } else {
        // Otherwise reuse existing context if provided
        context = firstParam;
        setupFns = plugins;
      }

      const page = await context.newPage();
      for (const setupFn of setupFns) {
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
  createTeam: async ({api}, use) => {
    const teamOwners: User[] = [];

    await use(async (teamName, {withMembers, enablePaidFeatures = false, ...options} = {}) => {
      // Workaround for backoffice to enable paid features (opt-in)
      const owner = await createUser(api, {
        ...options,
        ...(enablePaidFeatures && {
          firstName: 'integrationtest',
          lastName: 'integrationtest',
          fullName: 'integrationtest',
        }),
      });

      const {teamId} = await api.auth.upgradeUserToTeamOwner(owner, teamName);
      owner.teamId = teamId;

      teamOwners.push(owner);

      let members: User[] = [];
      if (withMembers !== undefined) {
        // Depending on the type of withMembers, either create the number of users or use the given array of users
        members =
          typeof withMembers === 'number'
            ? await Promise.all(Array.from({length: withMembers}, () => createUser(api, options)))
            : withMembers;

        await Promise.all(
          members.map(async member => {
            const invitationId = await api.team.inviteUserToTeam(member.email, owner);
            const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationId);
            await api.team.acceptTeamInvitation(invitationCode, member);
          }),
        );
      }

      return {owner, members};
    });

    // Deletes each created team and the owner / members associated with it
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
    // Wait for the sidebar to be visible after login to ensure the app is fully loaded
    await pageManager.webapp.components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: 80_000});
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

/**
 * PagePlugin to connect with the given user
 * Note: This plugin only works if the users are NOT in the same team
 */
export const withConnectionRequest =
  (user: User | Promise<User>): PagePlugin =>
  async page => {
    const pageManager = PageManager.from(page);
    await sendConnectionRequest(pageManager, await user);
  };

const createUser = async (
  api: ApiManagerE2E,
  options?: {disableTelemetry?: boolean; firstName?: string; lastName?: string; fullName?: string},
) => {
  const {disableTelemetry = true, firstName, lastName, fullName} = options ?? {};

  const user = getUser({firstName, lastName, fullName});
  await api.createPersonalUser(user);

  // Optionally decline to send telemetry via the api. This avoids the user being prompted for it in the UI upon first login
  if (disableTelemetry) {
    await api.properties.putProperty({settings: {privacy: {telemetry_data_sharing: false}}}, user.token);
  }

  return user;
};
