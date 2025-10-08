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
import {completeLogin, setupBasicTestScenario} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser, setupAppLock} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('AppLock', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA] = members;
  const teamName = 'AppLock';
  const appLockPassCode = '1a3!567N4';
  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
    await api.brig.enableAppLock(owner.teamId);
  });

  test(
    'I want to see app lock setup modal on login after app lock has been enforced for the team',
    {tag: ['@TC-2744', '@TC-2740', '@regression']},
    async ({pageManager}) => {
      const {modals} = pageManager.webapp;

      await completeLogin(pageManager, memberA);
      await expect(modals.appLock().isVisible()).toBeTruthy();

      await test.step('Web: I should not be able to close app lock setup modal if app lock is enforced', async () => {
        // click outside the modal
        const page = await pageManager.getPage();
        await page.mouse.click(200, 350);
        // check if the modal still there
        expect(await modals.appLock().isVisible()).toBeTruthy();
      });
    },
  );

  test(
    'Web: I want the app to lock when I switch back to webapp tab after inactivity timeout expired',
    {tag: ['@TC-2752', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();

      await loginUser(memberA, pageManager);

      // open new tab and wait
      // boost the browser time?
      // open back the correct tab
      // unlock the app
    },
  );

  test(
    'Web: App should not lock if I switch back to webapp tab in time (during inactivity timeout)',
    {tag: ['@TC-2753', '@regression']},
    async ({pageManager}) => {
      await completeLogin(pageManager, memberA);
      // open new tab and wait
      // boost the browser time?
      // open back the correct tab
    },
  );

  test(
    'Web: I want to unlock the app with passphrase after login',
    {tag: ['@TC-2754', '@TC-2755', '@TC-2758', '@TC-2763', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();
      const {modals} = pageManager.webapp;

      await pageManager.openMainPage();
      await completeLogin(pageManager, memberA);

      // wait for data share consent

      await test.step('Web: I want the app to automatically lock after refreshing the page', async () => {
        await setupAppLock(pageManager, appLockPassCode);
        await pageManager.refreshPage();

        expect(await modals.appLock().isVisible()).toBeTruthy();
      });

      await test.step('Web: I should not be able to unlock the app with wrong passphrase', async () => {
        await setupAppLock(pageManager, 'wrongCredentials');
        await expect(modals.appLock().errorMessage).toHaveText('Wrong passcode');
      });

      await test.step('Web: I should not be able to wipe database with wrong account password', async () => {
        await modals.appLock().clickForgotPassphrase();
        await pageManager.waitForTimeout(1000);
        await modals.appLock().clickWipeDB();
        await modals.appLock().clickReset();

        await pageManager.waitForTimeout(20_000);
        // task: check if on start page
        await expect(modals.appLock().errorMessage).toHaveText('Wrong passcode');
      });

      await test.step('I want to wipe database when I forgot my app lock passphrase', async () => {
        await modals.appLock().inputUserPassword(memberA.password);
        await pageManager.waitForTimeout(50_000);
      });
    },
  );

  test(
    'Web: I should not be able to wipe database with wrong account password',
    {tag: ['@TC-2763', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();

      await loginUser(memberA, pageManager);

      // reload the app
      // check lock modal
      // click forget password in the modal?
      // check if in browser the db is cleared?
    },
  );

  test(
    'Web: Verify inactivity timeout set on a team level applies to team member accounts',
    {tag: ['@TC-2767', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();

      await loginUser(memberA, pageManager);

      // reload the app
      // check lock modal
      // click forget password in the modal?
      // check if in browser the db is cleared?
    },
  );

  test(
    'I should not be able to switch off app lock if it is enforced for the team 0',
    {tag: ['@TC-2770', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();

      await loginUser(memberA, pageManager);

      // reload the app
      // go to settings try to disable the app lock
    },
  );

  test('I want to switch off app lock 0', {tag: ['@TC-2771', '@regression']}, async ({pageManager}) => {
    await pageManager.openMainPage();

    await loginUser(memberA, pageManager);

    // reload the app
    // check lock modal
    // click forget password in the modal?
    // check if in browser the db is cleared?
  });

  test(
    'Web: Verify inactivity timeout can be set if app lock is not enforced on a team level',
    {tag: ['@TC-2772', '@regression']},
    async ({pageManager}) => {
      await pageManager.openMainPage();

      await loginUser(memberA, pageManager);

      // reload the app
      // check lock modal
      // click forget password in the modal?
      // check if in browser the db is cleared?
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
