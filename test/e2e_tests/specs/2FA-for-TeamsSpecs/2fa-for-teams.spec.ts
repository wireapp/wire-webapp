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
import {addCreatedTeam, addCreatedUser, tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('f2a for teams', () => {
  test.slow();
  const teamName = 'Critical';
  let owner: User = getUser();
  const member1 = getUser();

  test.beforeAll(async ({api}) => {
    const user = await api.createTeamOwner(owner, teamName);
    if (!owner.token) {
      throw new Error(`Owner ${owner.username} has no token and can't be used for team creation`);
    }
    owner = {...owner, ...user};
    addCreatedTeam(owner, owner.teamId!);
    const invitationIdForMember1 = await api.team.inviteUserToTeam(member1.email, owner);
    const invitationCodeForMember1 = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationIdForMember1);

    await api.createPersonalUser(member1, invitationCodeForMember1);
    addCreatedUser(member1);
    await api.brig.unlockSndFactorPasswordChallenge(owner.teamId);
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, owner.teamId, 'enabled');
  });

  test('2FA Code', {tag: ['@TC-8749', '@regression']}, async ({pageManager, api}) => {
    if (owner === undefined) {
      return;
    }
    await pageManager.openMainPage();
    await loginUser(owner, pageManager);

    const page = await pageManager.webapp.pages.emailVerification();
    const isVisible = await page.isEmailVerificationPageVisible();

    await expect(isVisible).toBeTruthy();
    // wait for mail
    const currentPage = await pageManager.getPage();
    await currentPage.waitForTimeout(500);
    const correctCode = await api.inbucket.getVerificationCode(owner.email);

    //case: enter an incorrect code
    await currentPage.waitForTimeout(500);
    await page.enterVerificationCode('123456');

    await expect(page.errorLabel).toBeVisible();
    const errorText = await page.errorLabel.innerText();
    expect(errorText).toContain('Please retry, or request another code.');

    await page.clearCode();
    await page.enterVerificationCode(correctCode);
    // enter don't work
    await page.pressSubmit();

    // main screen loads over 45 secs
    await pageManager.webapp.components
      .conversationSidebar()
      .personalUserName.waitFor({state: 'visible', timeout: 60_000});

    await pageManager.webapp.modals.dataShareConsent().clickDecline();
    await expect(pageManager.webapp.components.conversationSidebar().personalUserName).toBeVisible();
  });

  test(
    'I want to receive new verification code email after clicking "Resend code" button',
    {tag: ['@TC-40', '@regression']},
    async ({pageManager, api}) => {
      const oneMinTimeout = 62_000;
      test.setTimeout(310_000);
      await pageManager.openMainPage();
      await loginUser(owner, pageManager);

      const emailPage = await pageManager.webapp.pages.emailVerification();
      const isVisible = await emailPage.isEmailVerificationPageVisible();
      await expect(isVisible).toBeTruthy();

      const page = await pageManager.getPage();
      // wait for mail
      await page.waitForTimeout(2000);
      const oldCode = await api.inbucket.getVerificationCode(owner.email);

      expect(oldCode.length).toBe(6);
      expect(Number.isInteger(parseInt(oldCode))).toBeTruthy();

      const sendRequest = page.waitForRequest('*/**/verification-code/send', {timeout: oneMinTimeout});
      await page.waitForTimeout(61_000);
      await emailPage.resendButton.click();
      await sendRequest;

      await page.waitForTimeout(3000);
      const newCode = await api.inbucket.getVerificationCode(owner.email);

      expect(oldCode).not.toBe(newCode);
      expect(Number.isInteger(parseInt(newCode))).toBeTruthy();
      expect(newCode.length).toBe(6);
    },
  );

  test(
    'I want to verify that verification code is not required after login if 2FA has been disabled',
    {tag: ['@TC-8749', '@regression']},
    async ({pageManager, api}) => {
      await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, owner.teamId, 'disabled');

      await pageManager.openMainPage();
      await loginUser(owner, pageManager);

      await pageManager.webapp.components
        .conversationSidebar()
        .personalUserName.waitFor({state: 'visible', timeout: 60_000});

      await expect(pageManager.webapp.components.conversationSidebar().personalUserName).toBeVisible();
    },
  );
  test.afterAll(async ({api}) => {
    if (owner === undefined) {
    }
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, owner.teamId, 'disabled');
    await tearDownAll(api);
  });
});
