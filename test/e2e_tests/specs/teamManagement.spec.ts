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
  {tag: ['@crit-flow-tm', '@TC-2157', '@TC-2158', '@TC-2159', '@TC-2156', '@TC-2155', '@teamManagement-regression']},
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

test(
  'I want to create a new team and invite a user',
  {
    tag: ['@crit-flow-tm', '@TC-2166', '@TC-2173', '@TC-2176', '@TC-2177', '@teamManagement-regression'],
  },
  async ({api, pages}) => {
    // Creating test data
    const teamOwner = getUser();
    const member = getUser();
    const teamName = 'Kickers';

    await test.step('Team owner opens team settings page', async () => {
      await pages.openTeamManagementPage();
    });

    await test.step('Team owner opens team sign up page', async () => {
      await pages.teamLoginPage.clickTeamCreateButton();
    });

    await test.step('Team owner provides team info, credentials, and accept the terms on the team sign up page', async () => {
      await pages.teamSignUpPage.inputEmail(teamOwner.email);
      await pages.teamSignUpPage.inputProfileName(teamOwner.fullName);
      await pages.teamSignUpPage.inputTeamName(teamName);
      await pages.teamSignUpPage.inputPassword(teamOwner.password);
      await pages.teamSignUpPage.inputConfirmPassword(teamOwner.password);
      await pages.teamSignUpPage.selectCompanySize('51 - 100');
      await pages.teamSignUpPage.toggleTermsCheckbox();
      await pages.teamSignUpPage.togglePrivacyPolicyCheckbox();
      await pages.teamSignUpPage.clickContinueButton();
    });

    await test.step('Team owner completes email verification step of the team sign up process', async () => {
      const code = await api.inbucket.getVerificationCode(teamOwner.email);
      await pages.emailVerificationPage.enterVerificationCode(code);
    });

    await test.step('Team owner adds team members on the team sign up page', async () => {
      expect(await pages.teamSignUpPage.isContinueButtonEnabled()).toBeFalsy();

      await pages.teamSignUpPage.inputInviteEmail(member.email);
      await pages.teamSignUpPage.clickContinueButton();
    });

    await test.step('Invited user receives team invitation email', async () => {
      expect(await api.inbucket.isTeamInvitationEmailReceived(member.email, teamOwner.email));
    });

    await test.step('TC-2176 - Team owner sees congratulations step after successful sign up', async () => {
      expect(await pages.registerSuccessPage.isTeamSignUpSuccessMessageVisible());
    });

    await test.step('TC-2177 - Team owner can go to team settings on congratulations step of sign up form', async () => {
      await pages.registerSuccessPage.clickManageTeamButton();
      await pages.teamDataShareConsentModal.clickAgree();
      await pages.marketingConsentModal.clickConfirmButton();
      expect(await pages.teamsPage.isProfileIconVisible());
    });

    await test.step('Team owner can see team info in team management', async () => {
      await pages.teamsPage.clickPeopleButton();
      expect(await pages.teamsPage.isUserVisibleAsSelf(teamOwner.fullName));
      expect(await pages.teamsPage.getUserRole(teamOwner.fullName)).toContain('Owner');
    });
  },
);

test.afterAll(async ({api}) => {
  for (const [user, teamId] of createdTeams.entries()) {
    await api.team.deleteTeam(user, teamId);
  }
});
