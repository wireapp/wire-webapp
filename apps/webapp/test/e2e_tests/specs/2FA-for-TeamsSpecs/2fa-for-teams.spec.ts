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

import {User} from 'test/e2e_tests/data/user';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect, LOGIN_TIMEOUT, Team} from '../../test.fixtures';
import {PageManager} from 'test/e2e_tests/pageManager';

test.describe('2FA for teams', () => {
  let team: Team;
  let owner: User;

  test.beforeEach(async ({api, createTeam}) => {
    team = await createTeam('Test Team');
    owner = team.owner;

    await api.brig.unlockSndFactorPasswordChallenge(team.teamId);
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, team.teamId, 'enabled');
  });

  // The 2FA needs to be disabled again so the createTeam fixture can clean up the created team
  test.afterEach(async ({api}) => {
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, team.teamId, 'disabled');
  });

  test('2FA Code', {tag: ['@TC-8749', '@regression']}, async ({api, createPage}) => {
    const pageManager = PageManager.from(await createPage());
    const {pages, components} = pageManager.webapp;

    await pageManager.openLoginPage();
    await pages.login().login(owner);
    await expect(pages.emailVerification().verificationCodeInputLabel).toBeVisible();

    await test.step('With incorrect code', async () => {
      await pages.emailVerification().enterVerificationCode('123456');
      await expect(pages.emailVerification().errorLabel).toBeVisible();
      await expect(pages.emailVerification().errorLabel).toHaveText('Please retry, or request another code.');
    });

    await test.step('With correct code', async () => {
      const correctCode = await api.inbucket.getVerificationCode(owner.email);

      await pages.emailVerification().clearCode();
      await pages.emailVerification().enterVerificationCode(correctCode);
      await pages.emailVerification().pressSubmit(); // enter don't work

      await expect(components.conversationSidebar().personalUserName).toBeVisible({timeout: LOGIN_TIMEOUT});
    });
  });

  test(
    'I want to receive new verification code email after clicking "Resend code" button',
    {tag: ['@TC-40', '@regression']},
    async ({createPage, api}) => {
      const pageManager = PageManager.from(await createPage());
      const {pages} = pageManager.webapp;

      await pageManager.openLoginPage();
      await pages.login().login(owner);
      await expect(pages.emailVerification().verificationCodeInputLabel).toBeVisible();

      const oldCode = await api.inbucket.getVerificationCode(owner.email);

      await pageManager.waitForTimeout(61_000); // Wait 61s before requesting a new code
      await pages.emailVerification().resendButton.click();

      await expect
        .poll(async () => await api.inbucket.getVerificationCode(owner.email), {timeout: 30_000, intervals: [3_000]})
        .not.toEqual(oldCode);
    },
  );

  test(
    'I want to verify that verification code is not required after login if 2FA has been disabled',
    {tag: ['@TC-44', '@regression']},
    async ({createPage, api}) => {
      // Disable 2FA again
      await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, team.teamId, 'disabled');

      const pageManager = PageManager.from(await createPage());
      const {components} = pageManager.webapp;

      await pageManager.openMainPage();
      await loginUser(owner, pageManager);

      await expect(components.conversationSidebar().personalUserName).toBeVisible({timeout: LOGIN_TIMEOUT});
    },
  );
});
