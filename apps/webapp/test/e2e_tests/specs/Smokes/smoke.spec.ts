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

import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {inviteMembers, loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';

// Generating test data
let userA = getUser();
const userB = getUser();
const teamName = 'Smoke Team';

test('Login and search smoke', {tag: ['@smoke']}, async ({pageManager, api, browser}) => {
  const {pages, modals, components} = pageManager.webapp;

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    const user = await api.createTeamOwner(userA, teamName);
    userA = {...userA, ...user};
    addCreatedTeam(userA, userA.teamId);
    await inviteMembers([userB], userA, api);
  });

  await test.step('User signs into the app', async () => {
    await pageManager.openMainPage();
    await loginUser(userA, pageManager);
    await modals.dataShareConsent().clickDecline();
  });

  await test.step('User can search', async () => {
    await components.conversationSidebar().clickConnectButton();
    await pages.startUI().selectUsers(userB.username);
    expect(await modals.userProfile().isVisible());
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, userA);
});
