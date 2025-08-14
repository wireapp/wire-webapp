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
import {addCreatedUser, removeCreatedUser} from '../../utils/tearDown.util';
import {loginUser} from '../../utils/userActions';
import {generateSecurePassword} from '../../utils/userDataGenerator';

const user = getUser();

test(
  'Verify sign in error appearance in case of wrong credentials',
  {tag: ['@TC-3465', '@smoke']},
  async ({pageManager}) => {
    const incorrectEmail = 'blablabla@wire.engineering';
    const incorrectPassword = generateSecurePassword();

    const pages = pageManager.webapp.pages;

    await pageManager.openMainPage();
    await pages.singleSignOn().enterEmailOnSSOPage(incorrectEmail);
    await pages.login().inputPassword(incorrectPassword);
    await pages.login().clickSignInButton();

    const errorMessage = await pages.login().getErrorMessage();

    expect(errorMessage).toBe('Please verify your details and try again');
  },
);

test('Verify you can sign in by email', {tag: ['@TC-3461', '@regression']}, async ({pageManager, api}) => {
  const {modals, components} = pageManager.webapp;

  // Create user with random password, email, username, lastName, firstName
  await api.createPersonalUser(user);

  // Adding created user to the list for later cleanup
  addCreatedUser(user);

  await pageManager.openMainPage();
  await loginUser(user, pageManager);
  await modals.dataShareConsent().clickDecline();

  expect(await components.conversationSidebar().getPersonalStatusName()).toBe(`${user.firstName} ${user.lastName}`);
  expect(await components.conversationSidebar().getPersonalUserName()).toContain(user.username);

  await removeCreatedUser(api, user);
});
