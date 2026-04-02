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
import {handleAppLockState} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

test.describe('AppLock', () => {

    let owner: User;
    let memberA: User;
    const teamName = 'AppLock';
    const appLockPassCode = '1a3!567N4';

    test.describe('AppLock enabled', () => {
      test.beforeEach(async ({api, createTeam, createUser}) => {
        memberA = await createUser();
        const team = await createTeam(teamName, {users: [memberA]});
        owner = team.owner;

        await api.brig.toggleAppLock(owner.teamId, 'enabled', true);
      });

      test(
        'I want to see app lock setup modal on login after app lock has been enforced for the team',
        {tag: ['@TC-2744', '@TC-2740', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const {modals} = PageManager.from(page).webapp;

          await expect(modals.appLock().appLockModal).toBeVisible();

          await test.step('Web: I should not be able to close app lock setup modal if app lock is enforced', async () => {
            // click outside the modal
            await page.mouse.click(200, 350);
            // check if the modal still there
            await expect(modals.appLock().appLockModal).toBeVisible();
          });
        },
      );

      (
        [
          {
            title: 'Web: I want the app to lock when I switch back to webapp tab after inactivity timeout expired',
            tag: '@TC-2752',
          },
          {
            title: 'Web: App should not lock if I switch back to webapp tab in time (during inactivity timeout)',
            tag: '@TC-2753',
          },
        ] as const
      ).forEach(({title, tag}) => {
        const shouldLock = tag === '@TC-2752';

        test(title, {tag: [tag, '@regression']}, async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          await handleAppLockState(pageManager, appLockPassCode);

          const {modals} = pageManager.webapp;
          await page.dispatchEvent('body', 'blur');
          await page.waitForTimeout(shouldLock ? 61_000 : 3_000);
          await page.dispatchEvent('body', 'focus');

          if (shouldLock) {
            await expect(modals.appLock().appLockModalHeader).toBeVisible();
          } else {
            await expect(modals.appLock().appLockModalHeader).not.toBeVisible();
          }
        });
      });

      test(
        'Web: I want the app to automatically lock after refreshing the page',
        {tag: ['@TC-2754', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {modals} = PageManager.from(page).webapp;

          await handleAppLockState(pageManager, appLockPassCode);

          await page.reload();

          await expect(modals.appLock().appLockModal).toBeVisible();
        },
      );

      test(
        'Web: I want to unlock the app with passphrase after login',
        {tag: ['@TC-2755', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {modals} = PageManager.from(page).webapp;

          await handleAppLockState(pageManager, appLockPassCode);

          await page.reload();
          await modals.appLock().unlockAppWithPasscode(appLockPassCode);

          await expect(modals.appLock().appLockModal).not.toBeVisible();
        },
      );

      test(
        'Web: I should not be able to unlock the app with wrong passphrase',
        {tag: ['@TC-2758', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {modals} = PageManager.from(page).webapp;

          await handleAppLockState(pageManager, appLockPassCode);

          await page.reload();
          await modals.appLock().unlockAppWithPasscode('wrongCredentials');

          await expect(modals.appLock().errorMessage).toContainText('Wrong passcode');
        },
      );

      test(
        'I want to wipe database when I forgot my app lock passphrase',
        {tag: ['@TC-2761', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {pages, modals} = pageManager.webapp;
          await handleAppLockState(pageManager, appLockPassCode);

          await page.reload();
          await modals.appLock().clickForgotPassphrase();
          await modals.appLock().clickWipeDB();
          await modals.appLock().clickReset();
          await modals.appLock().inputUserPassword(memberA.password);

          // After redirect to login page verify the whole indexDB was cleared
          await expect(pages.singleSignOn().ssoCodeEmailInput).toBeVisible();
          await expect.poll(() => page.evaluate(() => indexedDB.databases())).toHaveLength(0);
        },
      );

      test(
        'Web: I should not be able to wipe database with wrong account password',
        {tag: ['@TC-2763', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {modals} = PageManager.from(page).webapp;

          await handleAppLockState(pageManager, appLockPassCode);

          await page.reload();
          await modals.appLock().clickForgotPassphrase();
          await modals.appLock().clickWipeDB();
          await modals.appLock().clickReset();
          await modals.appLock().inputUserPassword('invalid');

          // The modal should show an error for the invalid password and not wipe indexDB
          await expect(modals.appLock().errorMessage).toContainText('Wrong password');
          await expect.poll(() => page.evaluate(() => indexedDB.databases())).not.toHaveLength(0);
        },
      );

      test(
        'I should not be able to switch off app lock if it is enforced for the team',
        {tag: ['@TC-2770', '@TC-2767', '@regression']},
        async ({createPage}) => {
          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {components, pages} = pageManager.webapp;
          await handleAppLockState(pageManager, appLockPassCode);
          await components.conversationSidebar().clickPreferencesButton();

          await expect(pages.account().appLockCheckbox).toBeDisabled();
          // check here string

          await expect(
            page.getByText(
              'Lock Wire after 30 seconds in the background. Unlock with Touch ID or enter your passcode.',
            ),
          ).toHaveCount(1);
        },
      );

      test(
        'I want to switch off app lock',
        {tag: ['@TC-2771', '@TC-2772', '@regression']},
        async ({api, createPage}) => {
          await api.brig.toggleAppLock(owner.teamId, 'enabled', false);

          const page = await createPage(withLogin(memberA));
          const pageManager = PageManager.from(page);
          const {components, pages, modals} = pageManager.webapp;

          await components.conversationSidebar().clickPreferencesButton();
          await pages.account().appLockCheckboxLabel.click();
          await handleAppLockState(pageManager, appLockPassCode);

          await pages.account().appLockCheckboxLabel.click();

          await modals.confirm().actionButton.click();
          await expect(pages.account().appLockCheckbox).not.toBeChecked();
        },
      );
    });

  test.describe('AppLock disabled', () => {

    test.beforeEach(async ({createTeam, createUser}) => {
      memberA = await createUser();
      const team = await createTeam(teamName, {users: [memberA]});
      owner = team.owner;
    });

    test(
      'Web: Verify inactivity timeout can be set if app lock is not enforced on a team level',
      {tag: ['@TC-2772', '@regression']},
      async ({createPage}) => {
        const {components, pages, modals} = PageManager.from(await createPage(withLogin(memberA))).webapp;

        await components.conversationSidebar().clickPreferencesButton();
        await pages.account().privacySection.appLock.label.click();
        await modals.appLock().setPasscode(appLockPassCode);

        await expect(pages.account().privacySection.appLock.checkbox).toBeChecked();
      },
    );
  })
});
