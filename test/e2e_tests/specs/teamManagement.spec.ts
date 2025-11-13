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

import {getUser} from '../data/user';
import {test, expect} from '../test.fixtures';
import {addCreatedTeam, removeCreatedTeam} from '../utils/tearDown.util';
import {generateSecurePassword} from '../utils/userDataGenerator';

// Creating test data
const teamOwner = getUser();
const teamName = 'Startup';
const invalidPassword = generateSecurePassword(10);
const errorMessage = 'Please verify your details and try again.';

test(
  'Verify I can log in to admin panel only with valid hidden or shown password',
  {tag: ['@crit-flow-tm', '@TC-2157', '@TC-2158', '@TC-2159', '@TC-2156', '@TC-2155', '@teamManagement-regression']},
  async ({api, pageManager}) => {
    const pages = pageManager.tm.pages;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      await api.createTeamOwner(teamOwner, teamName);
      addCreatedTeam(teamOwner, teamOwner.teamId!);
    });

    await test.step('Team owner opens team management page', async () => {
      await pageManager.openTeamManagementPage();
      await pages.teamLogin().inputEmail(teamOwner.email);
    });

    await test.step('Team owner should not be able to login to team management with invalid hidden password', async () => {
      await pages.teamLogin().inputPassword(invalidPassword);
      await pages.teamLogin().clickLoginButton();
      expect(await pages.teamLogin().getErrorMessage()).toBe(errorMessage);
    });

    await test.step('Team owner should not be able to login to team management with invalid shown password', async () => {
      await pages.teamLogin().toggleShowPassword();
      expect(await pages.teamLogin().isPasswordHidden()).toBe(false);

      await pages.teamLogin().clickLoginButton();
      expect(await pages.teamLogin().getErrorMessage()).toBe(errorMessage);
    });

    await test.step('Team owner logs in to team management with the correct hidden password', async () => {
      await pages.teamLogin().toggleHidePassword();
      await pages.teamLogin().inputPassword(teamOwner.password);
      await pages.teamLogin().clickLoginButton();
      expect(await pages.teams().isProfileIconVisible());
    });
  },
);

test(
  'I want to create a new team and invite a user',
  {
    tag: ['@crit-flow-tm', '@TC-2166', '@TC-2173', '@TC-2176', '@TC-2177', '@teamManagement-regression'],
  },
  async ({api, pageManager}) => {
    const {pages, modals} = pageManager.tm;

    // Creating test data
    const teamOwner = getUser();
    const member = getUser();
    const teamName = 'Kickers';

    await test.step('Team owner opens team settings page', async () => {
      await pageManager.openTeamManagementPage();
    });

    await test.step('Team owner opens team sign up page', async () => {
      await pages.teamLogin().clickTeamCreateButton();
    });

    await test.step('Team owner provides team info, credentials, and accept the terms on the team sign up page', async () => {
      await pages.teamSignUp().inputEmail(teamOwner.email);
      await pages.teamSignUp().inputProfileName(teamOwner.fullName);
      await pages.teamSignUp().inputTeamName(teamName);
      await pages.teamSignUp().inputPassword(teamOwner.password);
      await pages.teamSignUp().inputConfirmPassword(teamOwner.password);
      await pages.teamSignUp().selectCompanySize('51 - 100');
      await pages.teamSignUp().toggleTermsCheckbox();
      await pages.teamSignUp().togglePrivacyPolicyCheckbox();
      await pages.teamSignUp().clickContinueButton();
    });

    await test.step('Team owner completes email verification step of the team sign up process', async () => {
      const code = await api.inbucket.getVerificationCode(teamOwner.email);
      await pageManager.webapp.pages.emailVerification().enterVerificationCode(code);
    });

    await test.step('Team owner adds team members on the team sign up page', async () => {
      expect(await pages.teamSignUp().isContinueButtonEnabled()).toBeFalsy();

      await pages.teamSignUp().inputInviteEmail(member.email);
      await pages.teamSignUp().clickContinueButton();
    });

    await test.step('Invited user receives team invitation email', async () => {
      expect(await api.inbucket.isTeamInvitationEmailReceived(member.email, teamOwner.email));
    });

    await test.step('TC-2176 - Team owner sees congratulations step after successful sign up', async () => {
      expect(await pageManager.webapp.pages.registerSuccess().isTeamSignUpSuccessMessageVisible());
    });

    await test.step('TC-2177 - Team owner can go to team settings on congratulations step of sign up form', async () => {
      await pageManager.webapp.pages.registerSuccess().clickManageTeamButton();
      await modals.dataShareConsent().clickAgree();
      await pageManager.webapp.modals.marketingConsent().clickConfirmButton();
      expect(await pages.teams().isProfileIconVisible());
    });

    await test.step('Team owner can see team info in team management', async () => {
      await pages.teams().clickPeopleButton();
      expect(await pages.teams().isUserVisibleAsSelf(teamOwner.fullName));
      expect(await pages.teams().getUserRole(teamOwner.fullName)).toContain('Owner');
    });
  },
);

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, teamOwner);
});
