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

import {getUser, User} from '../data/user';
import {test, expect} from '../test.fixtures';
import {generateSecurePassword} from '../utils/userDataGenerator';

const createdTeams: Map<User, string> = new Map();

test(
  'Verify I can log in to admin panel only with valid hidden or shown password',
  {tag: ['@flow-tm', '@TC-2157', '@TC-2158', '@TC-2159', '@TC-2156', '@TC-2155', '@teamManagement-regression']},
  async ({api, pages}) => {
    // Creating test data
    const teamOwner = getUser();
    const teamName = 'Startup';
    const invalidPassword = generateSecurePassword(10);
    const errorMessage = 'Please verify your details and try again.';

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      await api.createTeamOwner(teamOwner, teamName);
      createdTeams.set(teamOwner, teamOwner.teamId!);
    });

    await test.step('Team owner opens team management page', async () => {
      await pages.openTeamManagementPage();
      await pages.teamLoginPage.inputEmail(teamOwner.email);
    });

    await test.step('Team owner should not be able to login to team management with invalid hidden password', async () => {
      await pages.teamLoginPage.inputPassword(invalidPassword);
      await pages.teamLoginPage.clickLoginButton();
      expect(await pages.teamLoginPage.getErrorMessage()).toBe(errorMessage);
    });

    await test.step('Team owner should not be able to login to team management with invalid shown password', async () => {
      await pages.teamLoginPage.toggleShowPassword();
      expect(await pages.teamLoginPage.isPasswordHidden()).toBe(false);

      await pages.teamLoginPage.clickLoginButton();
      expect(await pages.teamLoginPage.getErrorMessage()).toBe(errorMessage);
    });

    await test.step('Team owner logs in to team management with the correct hidden password', async () => {
      await pages.teamLoginPage.toggleHidePassword();
      await pages.teamLoginPage.inputPassword(teamOwner.password);
      await pages.teamLoginPage.clickLoginButton();
      expect(await pages.teamsPage.isProfileIconVisible());
    });
  },
);

test.afterAll(async ({api}) => {
  for (const [user, teamId] of createdTeams.entries()) {
    await api.team.deleteTeam(user, teamId);
  }
});
