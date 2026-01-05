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
import {PageManager} from 'test/e2e_tests/pageManager';
import {checkAnyIndexedDBExists} from 'test/e2e_tests/utils/indexedDB.util';
import {handleAppLockState} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

test.describe('AppLock', () => {
  let owner: User;
  let memberA: User;
  const teamName = 'AppLock';
  const appLockPassCode = '1a3!567N4';

  test.beforeEach(async ({api, createTeam}) => {
    const team = await createTeam(teamName, {withMembers: 1});
    owner = team.owner;
    memberA = team.members[0];

    await api.brig.toggleAppLock(owner.teamId, 'enabled', true);
  });

  test(
    'I want to see app lock setup modal on login after app lock has been enforced for the team',
    {tag: ['@TC-2744', '@TC-2740', '@regression']},
    async ({page, pageManager}) => {
      const {modals} = pageManager.webapp;

      await expect(modals.appLock().appLockModal).toBeVisible();

      await test.step('Web: I should not be able to close app lock setup modal if app lock is enforced', async () => {
        // click outside the modal
        await page.mouse.click(200, 350);
        // check if the modal still there
        await expect(modals.appLock().appLockModal).toBeVisible();
      });
    },
  );

  test(
    'Web: App should not lock if I switch back to webapp tab in time (during inactivity timeout)',
    {tag: ['@TC-2752', '@TC-2753', '@regression']},
    async ({page: webappPageA, pageManager, browser}) => {
      const {modals} = pageManager.webapp;

      await handleAppLockState(pageManager, appLockPassCode);
      const unrelatedPage = await browser.newPage();
      await unrelatedPage.goto('about:blank');
      await unrelatedPage.bringToFront();
      await unrelatedPage.waitForTimeout(2_000); // open be only 2 sec in the other tab
      await page.bringToFront();

      await expect(modals.appLock().appLockModalHeader).not.toBeVisible();

      await test.step('Web: I want the app to lock when I switch back to webapp tab after inactivity timeout expired', async () => {
        await unrelatedPage.goto('about:blank');
        await unrelatedPage.bringToFront();
        await unrelatedPage.waitForTimeout(31_000);
        await page.bringToFront();
        await expect(modals.appLock().appLockModalHeader).toBeVisible();
      });
    },
  );

  test(
    'Web: I want to unlock the app with passphrase after login',
    {tag: ['@TC-2754', '@TC-2755', '@TC-2758', '@TC-2763', '@regression']},
    async ({page, pageManager}) => {
      const {modals, pages} = pageManager.webapp;

      await test.step('Web: I want the app to automatically lock after refreshing the page', async () => {
        await handleAppLockState(pageManager, appLockPassCode);
        await pageManager.refreshPage();

        await expect(modals.appLock().appLockModal).toBeVisible();
      });

      await test.step('Web: I should not be able to unlock the app with wrong passphrase', async () => {
        await handleAppLockState(pageManager, 'wrongCredentials');
        await expect(modals.appLock().errorMessage).toHaveText('Wrong passcode');
      });

      await test.step('Web: I should not be able to wipe database with wrong account password', async () => {
        await modals.appLock().clickForgotPassphrase();
        await modals.appLock().clickWipeDB();
        await modals.appLock().clickReset();
        await modals.appLock().inputUserPassword('wrong password');

        expect(await checkAnyIndexedDBExists(page)).toBeTruthy();
      });

      await test.step('I want to wipe database when I forgot my app lock passphrase', async () => {
        await modals.appLock().inputUserPassword(memberA.password);

        await expect(pages.singleSignOn().ssoCodeEmailInput).toBeVisible();
        expect(await checkAnyIndexedDBExists(page)).toBeFalsy();
      });
    },
  );

  test(
    'I should not be able to switch off app lock if it is enforced for the team',
    {tag: ['@TC-2770', '@TC-2767', '@regression']},
    async ({page, pageManager}) => {
      const {components, pages} = pageManager.webapp;
      await handleAppLockState(pageManager, appLockPassCode);
      await components.conversationSidebar().clickPreferencesButton();

      await expect(pages.account().appLockCheckbox).toBeDisabled();
      // check here string

      await expect(
        page.getByText('Lock Wire after 30 seconds in the background. Unlock with Touch ID or enter your passcode.'),
      ).toHaveCount(1);
    },
  );

  test('I want to switch off app lock', {tag: ['@TC-2771', '@TC-2772', '@regression']}, async ({api, createPage}) => {
    await api.brig.toggleAppLock(owner.teamId, 'enabled', false);

    const page = await createPage(withLogin(memberA));
    const pageManager = PageManager.from(page);
    const {components, pages, modals} = pageManager.webapp;

    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().toggleAppLock();
    await handleAppLockState(pageManager, appLockPassCode);

    await pages.account().toggleAppLock();

    await modals.removeMember().clickConfirm();
    await expect(pages.account().appLockCheckbox).not.toBeChecked();
  });

  test.skip(
    'Web: Verify inactivity timeout can be set if app lock is not enforced on a team level',
    {tag: ['@TC-2772', '@regression']},
    async () => {
      // not implemented
    },
  );
});
