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
import {bootstrapTeamForTesting} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('f2a for teams', () => {
  test.slow();
  const teamName = 'Critical';
  let owner: User = getUser();
  const member1 = getUser();

  test.beforeAll(async ({api}) => {
    const user = await bootstrapTeamForTesting(api, [member1], owner, teamName);
    owner = {...owner, ...user};

    await api.brig.unlockSndFactorPasswordChallenge(owner.teamId);
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, owner.teamId, 'enabled');
  });

  test('2FA Code', {tag: ['@TC-8749', '@regression']}, async ({pageManager, api}) => {
    if (owner === undefined) {
      return;
    }
    await pageManager.openMainPage();
    await loginUser(owner, pageManager);

    const {pages, components, modals} = await pageManager.webapp;
    const isVisible = await pages.emailVerification().isEmailVerificationPageVisible();

    await expect(isVisible).toBeTruthy();
    // wait for mail
    await pageManager.waitForTimeout(800);
    const correctCode = await api.inbucket.getVerificationCode(owner.email);

    //case: enter an incorrect code
    await pageManager.waitForTimeout(500);
    await pages.emailVerification().enterVerificationCode('123456');

    await expect(pages.emailVerification().errorLabel).toBeVisible();
    await expect(pages.emailVerification().errorLabel).toHaveText('Please retry, or request another code.');

    await pages.emailVerification().clearCode();
    await pages.emailVerification().enterVerificationCode(correctCode);
    // enter don't work
    await pages.emailVerification().pressSubmit();

    // main screen loads over 45 secs
    await components.conversationSidebar().personalUserName.waitFor({state: 'visible', timeout: 60_000});

    await modals.dataShareConsent().clickDecline();
    await expect(components.conversationSidebar().personalUserName).toBeVisible();
  });

  test(
    'I want to receive new verification code email after clicking "Resend code" button',
    {tag: ['@TC-40', '@regression']},
    async ({pageManager, api}) => {
      test.setTimeout(310_000);
      await pageManager.openMainPage();
      await loginUser(owner, pageManager);

      const {pages} = await pageManager.webapp;
      const isVisible = await pages.emailVerification().isEmailVerificationPageVisible();
      await expect(isVisible).toBeTruthy();

      // wait for mail
      await pageManager.waitForTimeout(800);
      const oldCode = await api.inbucket.getVerificationCode(owner.email);

      expect(oldCode.length).toBe(6);
      expect(Number.isInteger(parseInt(oldCode))).toBeTruthy();

      await pageManager.waitForTimeout(61_000); // wait 1 min to prevent 429 on request
      await pages.emailVerification().resendButton.click();

      await pageManager.waitForTimeout(3000);
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
      const {components, pages} = pageManager.webapp;
      await pages.historyInfo().clickConfirmButton();
      await components.conversationSidebar().personalUserName.waitFor({state: 'visible', timeout: 60_000});

      await expect(components.conversationSidebar().personalUserName).toBeVisible();
    },
  );
  test.afterAll(async ({api}) => {
    if (owner === undefined) {
    }
    await api.featureConfig.changeStateSndFactorPasswordChallenge(owner, owner.teamId, 'disabled');
    await tearDownAll(api);
  });
});
