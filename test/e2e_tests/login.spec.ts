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

import {test, expect} from '@playwright/test';

import {createPersonalUserViaBackdoor, deleteUser} from './backend/backend';
import {ClientUser} from './backend/clientUser';
import {DataShareConsentModal} from './pages/dataShareConsentModal.page';
import {LoginPage} from './pages/login.page';
import {WelcomePage} from './pages/welcome.page';
import {getCredentials} from './utils/credentialsReader';

const onePasswordItemName = 'BackendConnection staging-with-webapp-master';
const webAppPath = getCredentials(onePasswordItemName, 'webappUrl');
const createdUsers: ClientUser[] = [];

test('Verify sign in error appearance in case of wrong credentials', {tag: ['@TC-3465', '@smoke']}, async ({page}) => {
  const incorrectEmail = 'blablabla@gmail.com';
  const incorrectPassword = 'pass#$12367!';

  const welcomePage = new WelcomePage(page);
  const loginPage = new LoginPage(page);

  await page.goto(webAppPath);
  await welcomePage.clickLogin();
  await loginPage.inputEmail(incorrectEmail);
  await loginPage.inputPassword(incorrectPassword);
  await loginPage.clickSignInButton();

  const errorMessage = await loginPage.getErrorMessage();

  expect(errorMessage).toBe('Please verify your details and try again');
});

test('Verify you can sign in by username', {tag: ['@TC-3461', '@regression']}, async ({page}) => {
  // Create user with random password, email, username, lastName, firstName
  const user = new ClientUser();
  await createPersonalUserViaBackdoor(user);

  // Adding created user to the list for later cleanup
  createdUsers.push(user);

  const welcomePage = new WelcomePage(page);
  const loginPage = new LoginPage(page);
  const dataShareConsentModal = new DataShareConsentModal(page);

  await page.goto(webAppPath);
  await welcomePage.clickLogin();
  await loginPage.inputEmail(user.email);
  await loginPage.inputPassword(user.password);
  await loginPage.clickSignInButton();

  expect(await dataShareConsentModal.isModalPresent());
  await dataShareConsentModal.clickDecline();
});

test.afterAll(async () => {
  for (const user of createdUsers) {
    await deleteUser(user);
  }
});
