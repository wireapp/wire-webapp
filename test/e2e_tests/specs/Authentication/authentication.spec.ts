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

import {IncomingMessage} from 'node:http';
import https from 'node:https';
import {SecureVersion} from 'node:tls';

import {PageManager, webAppPath} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {connectWithUser} from 'test/e2e_tests/utils/userActions';

test.describe('Authentication', () => {
  test(
    'Verify sign in button is disabled in case of empty credentials',
    {tag: ['@TC-3457', '@regression']},
    async ({pageManager}) => {
      const {pages} = pageManager.webapp;
      const {emailInput, passwordInput, signInButton} = pages.login();
      await pageManager.openLoginPage();

      await expect(signInButton).toBeDisabled();

      await emailInput.fill('invalid@email');
      await passwordInput.fill('invalidPassword');
      await expect(signInButton).not.toBeDisabled();

      await passwordInput.clear();
      await expect(signInButton).toBeDisabled();
    },
  );

  test(
    'I want to be asked to share telemetry data when I log in',
    {tag: ['@TC-8780', '@regression']},
    async ({pageManager, createUser}) => {
      const {pages, modals} = pageManager.webapp;
      const user = await createUser({disableTelemetry: false});

      await pageManager.openLoginPage();
      await pages.login().login(user);

      await expect(modals.dataShareConsent().modalTitle).toBeVisible();
    },
  );

  test(
    'Verify sign in error appearance in case of suspended team account',
    {tag: ['@TC-3468', '@regression']},
    async ({pageManager}) => {
      const {pages} = pageManager.webapp;
      await pageManager.openLoginPage();

      const userOfSuspendedTeam = {email: 'sven+team6@wire.com', password: '12345678'};
      await pages.login().login(userOfSuspendedTeam);

      await expect(pages.login().loginErrorText).toHaveText('This account is no longer authorized to log in');
    },
  );

  test(
    'Verify current browser is set as temporary device',
    {tag: ['@TC-3460', '@regression']},
    async ({pageManager, createUser}) => {
      const user = await createUser();
      const {pages, components} = pageManager.webapp;

      await test.step('Log in with public computer checked', async () => {
        await pageManager.openLoginPage();
        await pages.login().publicComputerCheckbox.click();
        await pages.login().login(user);
        await pages.historyInfo().clickConfirmButton();
      });

      let proteusId: string;
      await test.step('Open device settings and get current proteus id', async () => {
        await components.conversationSidebar().clickPreferencesButton();
        await pages.settings().devicesButton.click();

        proteusId = (await pages.devices().proteusId.textContent()) ?? '';
        expect(proteusId).toBeTruthy();
      });

      await test.step('Log out of public computer', async () => {
        await pages.settings().accountButton.click();
        await pages.account().clickLogoutButton();
      });

      await test.step('Log in again on non public computer', async () => {
        await pageManager.openLoginPage();
        await pages.login().login(user);
      });

      await test.step("Open device settings and ensure the public computer isn't active and the ID was re-generated", async () => {
        await components.conversationSidebar().clickPreferencesButton();
        await pages.settings().devicesButton.click();

        await expect(pages.devices().activeDevices).toHaveCount(0);
        await expect(pages.devices().proteusId).not.toContainText(proteusId);
      });
    },
  );

  test(
    'Verify sign in error appearance in case of wrong credentials',
    {tag: ['@TC-3465', '@regression']},
    async ({pageManager}) => {
      const {pages} = pageManager.webapp;
      await pageManager.openLoginPage();

      await pages.login().login({email: 'invalid@wire.com', password: 'invalid'});

      await expect(pages.login().loginErrorText).toHaveText('Please verify your details and try again');
    },
  );

  [
    {tag: '@TC-3472', deviceType: 'permanent'},
    {tag: '@TC-3473', deviceType: 'temporary'},
  ].forEach(({deviceType, tag}) => {
    test(
      `I want to keep my history after refreshing the page on ${deviceType} device`,
      {tag: [tag, '@regression']},
      async ({pageManager, createTeam}) => {
        const {pages} = pageManager.webapp;
        const team = await createTeam('Test Team', {withMembers: 1});
        const userA = team.owner;
        const userB = team.members[0];

        await test.step('Log in and connect with user B', async () => {
          await pageManager.openLoginPage();

          if (deviceType === 'temporary') {
            await pages.login().publicComputerCheckbox.click();
            await pages.login().login(userA);
            await pages.historyInfo().clickConfirmButton();
          } else {
            await pages.login().login(userA);
          }

          await connectWithUser(pageManager, userB);
        });

        await test.step('Send a message', async () => {
          await pages.conversationList().openConversation(userB.fullName);
          await pages.conversation().sendMessage('Before refresh');
        });

        await test.step('Ensure message is still visible after page refresh', async () => {
          const message = pages.conversation().getMessage({content: 'Before refresh'});
          await expect(message).toBeVisible();

          await pageManager.refreshPage();

          await pages.conversationList().openConversation(userB.fullName);
          await expect(message).toBeVisible();
        });
      },
    );
  });

  // Bug: Connecting using TLSv1.2 should not be allowed but succeeds
  test.skip(
    'I want to make sure i connect to webapp only through TLS >= 1.3 connection',
    {tag: ['@TC-3480', '@regression']},
    async () => {
      const requestWithTlsVersion = (versions: {min?: SecureVersion; max?: SecureVersion}) =>
        new Promise<IncomingMessage>((res, rej) => {
          https.get(webAppPath, {minVersion: versions.min, maxVersion: versions.max}, res).on('error', rej);
        });

      await expect(requestWithTlsVersion({max: 'TLSv1.2'})).rejects.toBeDefined();
      await expect(requestWithTlsVersion({min: 'TLSv1.3'})).resolves.toBeDefined();
    },
  );

  test(
    'Verify session expired info is visible on login page',
    {tag: ['@TC-1311', '@regression']},
    async ({createPage, createUser}) => {
      const user = await createUser();
      const device1Pages = PageManager.from(await createPage(withLogin(user))).webapp.pages;

      const {
        pages: device2Pages,
        modals: device2Modals,
        components: device2Components,
      } = PageManager.from(await createPage(withLogin(user))).webapp;
      await device2Pages.historyInfo().clickConfirmButton();

      await device2Components.conversationSidebar().clickPreferencesButton();
      await device2Pages.settings().devicesButton.click();
      await device2Pages.devices().activeDevices.getByRole('button', {name: 'Remove Device'}).click();

      await device2Modals.password().passwordInput.fill(user.password);
      await device2Modals.password().clickAction();

      await expect(
        device1Pages.singleSignOn().page.getByText('You were signed out because your device was deleted'),
      ).toBeVisible();
    },
  );
});
