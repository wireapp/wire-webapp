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

import {User, getUser} from '../data/user';
import {test, expect} from '../test.fixtures';
import {generateSecurePassword} from '../utils/userDataGenerator';

const createdUsers: User[] = [];

test('Verify sign in error appearance in case of wrong credentials', {tag: ['@TC-3465', '@smoke']}, async ({pages}) => {
  const incorrectEmail = 'blablabla@wire.engineering';
  const incorrectPassword = generateSecurePassword();

  await pages.openMainPage();
  await pages.singleSignOnPage.enterEmailOnSSOPage(incorrectEmail);
  await pages.loginPage.inputPassword(incorrectPassword);
  await pages.loginPage.clickSignInButton();

  const errorMessage = await pages.loginPage.getErrorMessage();

  expect(errorMessage).toBe('Please verify your details and try again');
});

test('Verify you can sign in by username', {tag: ['@TC-3461', '@regression']}, async ({pages, api}) => {
  // Create user with random password, email, username, lastName, firstName
  const user = getUser();
  await api.createPersonalUser(user);

  // Adding created user to the list for later cleanup
  createdUsers.push(user);

  await pages.openMainPage();
  await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
  await pages.loginPage.inputPassword(user.password);
  await pages.loginPage.clickSignInButton();
  await pages.dataShareConsentModal.clickDecline();

  expect(await pages.conversationSidebar.getPersonalStatusName()).toBe(`${user.firstName} ${user.lastName}`);
  expect(await pages.conversationSidebar.getPersonalUserName()).toContain(user.username);
});

test.afterAll(async ({api}) => {
  for (const user of createdUsers) {
    if (!user.token) {
      throw new Error(`User ${user.username} has no token and can't be deleted`);
    }
    await api.user.deleteUser(user.password, user.token);
  }
});
