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

import {loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {removeCreatedUser} from '../../utils/tearDownUtil';

// Generating test data
const user = getUser();
let fileName: string;

test('Setting up new device with a backup', {tag: ['@TC-8634', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Creating preconditions for the test via API
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createPersonalUser(user);
  });

  // Test steps
  await test.step('User logs in', async () => {
    await loginUser(user, pages);
  });

  await test.step('User generates data', async () => {});

  await test.step('User creates and saves a backup', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.accountPage.clickBackUpButton();
    expect(pages.primaryModal.isTitleVisible()).toBeTruthy();
    await pages.primaryModal.clickPrimaryButton();
    expect(pages.primaryModal.isTitleHidden()).toBeTruthy();
    expect(pages.historyExportPage.isVisible()).toBeTruthy();
    const [download] = await Promise.all([
      pages.historyExportPage.page.waitForEvent('download'),
      pages.historyExportPage.clickSaveFileButton(),
    ]);
    fileName = `./test-results/downloads/${download.suggestedFilename()}`;
    await download.saveAs(fileName);
  });

  await test.step('User logs out and clears all data', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.accountPage.clickLogoutButton();
    expect(pages.primaryModal.isTitleVisible()).toBeTruthy();
    await pages.primaryModal.toggleCheckbox();
    expect(pages.primaryModal.checkbox.isChecked()).toBeTruthy();
    await pages.primaryModal.clickPrimaryButton();
  });

  await test.step('User logs back in', async () => {
    expect(pages.singleSignOnPage.isVisible()).toBeTruthy();
    await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
    await pages.loginPage.inputPassword(user.password);
    await pages.loginPage.clickSignInButton();
    await pages.historyInfoPage.clickConfirmButton();
  });

  await test.step('User restores the previously created backup', async () => {
    await pages.conversationSidebar.clickPreferencesButton();
    await pages.accountPage.backupFileInput.setInputFiles(fileName);
    expect(pages.historyImportPage.importSuccessHeadline.isVisible()).toBeTruthy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedUser(api, user);
});
