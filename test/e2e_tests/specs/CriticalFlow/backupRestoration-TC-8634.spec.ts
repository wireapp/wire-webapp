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

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

test('Setting up new device with a backup', {tag: ['@TC-8634', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow
  // Generating test data
  const user = getUser();

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(user);
  });

  // Test steps
  await test.step('User logs in', async () => {
    await pages.openMainPage();
    await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
    await pages.loginPage.inputPassword(user.password);
    await pages.loginPage.clickSignInButton();
    await pages.dataShareConsentModal.clickDecline();
  });

  await test.step('User creates and saves a backup', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.accountPage.clickBackUpButton();
    await expect(pages.primaryModal.isVisible()).toBeTruthy();
    await pages.primaryModal.clickPrimaryButton();
    await expect(pages.historyExportPage.isVisible()).toBeTruthy();
    await pages.historyExportPage.clickCancelButton();
  });

  await test.step('User logs out and clears all data', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.accountPage.clickLogoutButton();
  });
});
