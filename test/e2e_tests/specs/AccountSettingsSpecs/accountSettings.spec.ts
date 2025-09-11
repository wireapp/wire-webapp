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

import {getUser} from 'test/e2e_tests/data/user';
import {addCreatedUser, tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('account settings', () => {
  test.slow();

  const member1 = getUser();
  test.beforeAll(async ({api}) => {
    await api.createPersonalUser(member1);
    addCreatedUser(member1);
  });

  test('2FA Code', {tag: ['@TC-8749', '@regression']}, async ({pageManager, api}) => {
    await pageManager.openMainPage();
    await loginUser(member1, pageManager);
    await pageManager.webapp.components
      .conversationSidebar()
      .personalUserName.waitFor({state: 'visible', timeout: 60_000});

    await pageManager.webapp.modals.dataShareConsent().clickDecline();
    //  Open Settings -> Account (default screen)
    await pageManager.webapp.components.conversationSidebar().clickPreferencesButton();
    // Can see profile information
    await expect(await pageManager.webapp.pages.account().emailDisplay).toHaveText(member1.email);
    await expect(await pageManager.webapp.pages.account().displayNameDisplay).toHaveText(member1.fullName);
    // Can see domain name

    // Can see user handle info

    // Change name

    // Name change should be reflected in webapp

    // Change profile color

    // Profile color change should be reflected in webapp

    //Change profile picture

    // Profile picture should be updated in webapp
  });

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
