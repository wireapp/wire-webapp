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

import {getUser, User} from 'test/e2e_tests/data/user';
import {addCreatedTeam, addCreatedUser, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test} from '../../test.fixtures';

test.describe('f2a for teams', () => {
  const teamName = 'Critical';

  let createdUser: User | undefined = undefined;

  test.beforeAll(async ({api}) => {
    const owner = getUser();
    createdUser = await api.createTeamOwner(owner, teamName);
    addCreatedUser(createdUser);
    addCreatedTeam(createdUser, createdUser.teamId);
  });

  test('2FA Code', {tag: ['@TC-8749', '@regression']}, async ({pageManager}) => {
    // enable f2a for user
    if (createdUser === undefined) {
      return;
    }
    // go to login page
    await pageManager.openMainPage();
    await loginUser(createdUser, pageManager);
    await pageManager.webapp.modals.dataShareConsent().clickDecline();
    // check if pages contain f2a
  });

  test(
    'I want to receive new verification code email after clicking "Resend code" button 0',
    {tag: ['@TC-40', '@regression']},
    async ({pageManager, api}) => {
      //
    },
  );

  test(
    'I want to verify that verification code is not required after login if 2FA has been disabled',
    {tag: ['@TC-8749', '@regression']},
    async ({pageManager}) => {
      //
    },
  );
  test.afterAll(async ({api}) => {
    if (createdUser === undefined) {
      return;
    }
    removeCreatedTeam(api, createdUser);
  });
});
