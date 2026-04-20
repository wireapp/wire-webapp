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
import {mockAudioAndVideoDevices} from './utils/mockVideoDevice.util';
import {Role} from '@wireapp/api-client/lib/team';
import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';

export type PagePlugin = (page: Page) => void | Promise<void>;

// Define custom test type with axios fixture
type Fixtures = {
  _beforeEach: void;
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
   * @returns an object containing the teams owner and an array of members. The size of the members array matches the number or array length passed to `withMembers`
   */
  createTeam: (
    teamName: string,
    options?: {
      users: (User | {user: User; role?: keyof typeof Role})[];
      features?: {conferenceCalling?: boolean; channels?: boolean; mls?: boolean; cells?: boolean};
    },
  ) => Promise<Team>;
};

export type Team = {
  teamId: string;
  owner: User;
  /** Add a new member to the team after its initial creation */
  addTeamMember: (member: User, options?: {role?: keyof typeof Role}) => Promise<void>;
};

export {expect} from '@playwright/test';

export const test = baseTest.extend<Fixtures>({
  // Temporary workaround to add the test id as annotation instead of tag so Testiny can pick it up
  // The following test suites need to be updated to be individual tests: AppLock, Connections, RegisterSpecs
  _beforeEach: [
    async ({}, use, testInfo) => {
      const testid = testInfo.tags.find(tag => tag.startsWith('@TC'));
      if (testid && !testInfo.annotations.some(annotation => annotation.type === 'testid')) {
        testInfo.annotations.push({type: 'testid', description: testid.slice(1)});
      }

      await use();
    },
    {auto: true},
  ],
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
        // The type assertion is necessary because the type check is done using `strict: false` which will not narrow the type correctly
        setupFns = !!firstParam ? [firstParam as PagePlugin, ...plugins] : plugins;
      } else {
        // Otherwise reuse existing context if provided
        context = firstParam;
        setupFns = plugins;
      }

      // Add mocked Audio and Video devices (Hardware is treated as part of the test setup)
      await context.addInitScript(mockAudioAndVideoDevices);

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

    await use(async (teamName, options) => {
      const owner = await createUser(api);

      const {teamId} = await api.auth.upgradeUserToTeamOwner(owner, teamName);
      owner.teamId = teamId;

      teamOwners.push(owner);

      const addTeamMember: Team['addTeamMember'] = async (member, options) => {
        const invitationId = await api.team.inviteUserToTeam(member.email, owner, Role[options?.role ?? 'MEMBER']);
        const invitationCode = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationId);
        await api.team.acceptTeamInvitation(invitationCode, member);
      };

      if (options?.users) {
        await Promise.all(
          options.users.map(user => {
            if ('user' in user) {
              return addTeamMember(user.user, {role: user.role});
            } else {
              return addTeamMember(user);
            }
          }),
        );
      }

      if (options?.features && Object.values(options.features).every(Boolean)) {
        // The team will be reset right after initialization, so we need to wait a short time for it to finish
        // before changing feature configs since they would otherwise be overwritten (See WPB-23698)
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (options.features.conferenceCalling) {
          await api.enableConferenceCallingFeature(teamId);
          await api.waitForFeatureToBeEnabled(FEATURE_KEY.CONFERENCE_CALLING, teamId, owner.token);
        }

        // Creating channels depends on MLS to be enabled
        if (options.features.mls || options.features.channels) {
          await api.brig.enableMLSFeature(owner.teamId);
          await api.waitForFeatureToBeEnabled(FEATURE_KEY.MLS, teamId, owner.token);
        }

        if (options.features.channels) {
          await api.brig.unlockChannelFeature(teamId);
          await api.brig.enableChannelsFeature(teamId);
          await api.waitForFeatureToBeEnabled(FEATURE_KEY.CHANNELS, teamId, owner.token);
        }

        if (options.features.cells) {
          await api.brig.unlockCellsFeature(teamId);
          await api.brig.enableCells(teamId);
          await api.waitForFeatureToBeEnabled(FEATURE_KEY.CELLS, teamId, owner.token);
        }
      }

      return {teamId, owner, addTeamMember};
    });

    // Deletes each created team and the owner / members associated with it
    await Promise.all(teamOwners.map(owner => api.team.deleteTeam(owner, owner.teamId)));
  },
});

/** Max time the login is allowed to take before the application needs to be useable */
export const LOGIN_TIMEOUT = 40_000;

/** PagePlugin to log in as the given user */
export const withLogin =
  (user: User | Promise<User>, options?: {confirmNewHistory?: boolean}): PagePlugin =>
  async page => {
    const pageManager = PageManager.from(page);
    await pageManager.openLoginPage();
    await pageManager.webapp.pages.login().login(await user);

    if (options?.confirmNewHistory) {
      await pageManager.webapp.pages.historyInfo().clickConfirmButton();
    }

    /**
     * Since the login may take up to 40s we manually wait for it to finish here instead of increasing the timeout on all actions / assertions after this util
     * This is an exception to the general best practice of using playwrights web assertions. (See: https://playwright.dev/docs/best-practices#use-web-first-assertions)
     */
    await pageManager.webapp.components
      .conversationSidebar()
      .sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
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

/** PagePlugin to open a guest user link and join the group chat as temporary member */
export const withGuestUser =
  (link: string, guestName: string): PagePlugin =>
  async page => {
    await page.goto(link);
    await page.getByRole('link', {name: 'Join in Browser'}).click();
    const pageManager = PageManager.from(page);
    await pageManager.webapp.pages.conversationJoin().joinAsGuest(guestName);

    /**
     * Since the login may take up to 40s we manually wait for it to finish here instead of increasing the timeout on all actions / assertions after this util
     * This is an exception to the general best practice of using playwrights web assertions. (See: https://playwright.dev/docs/best-practices#use-web-first-assertions)
     */
    await pageManager.webapp.pages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
  };

const createUser = async (
  api: ApiManagerE2E,
  options?: {disableTelemetry?: boolean} & Parameters<typeof getUser>[0],
) => {
  const {disableTelemetry = true} = options ?? {};

  const user = getUser(options);
  await api.createPersonalUser(user);

  // Optionally decline to send telemetry via the api. This avoids the user being prompted for it in the UI upon first login
  if (disableTelemetry) {
    await api.properties.putProperty({settings: {privacy: {telemetry_data_sharing: false}}}, user.token);
  }

  return user;
};
