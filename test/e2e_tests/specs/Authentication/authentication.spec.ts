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

import {test, expect} from 'test/e2e_tests/test.fixtures';

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
});
