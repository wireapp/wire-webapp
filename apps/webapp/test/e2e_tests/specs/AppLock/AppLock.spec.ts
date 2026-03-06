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
import {test, expect, withLogin, PagePlugin, Team} from 'test/e2e_tests/test.fixtures';
import {AppLockModal} from 'test/e2e_tests/pageManager/webapp/modals/appLock.modal';

/** Page plugin specific to this feature to set the app lock code upon the first login */
const withAppLock =
  (code: string): PagePlugin =>
  async page => {
    await new AppLockModal(page).setPasscode(code);
  };

test.describe('AppLock', () => {
  let user: User;
  let team: Team;
  const appLockPassCode = '1a3!567N4';

  test.beforeEach(async ({createTeam}) => {
    team = await createTeam('AppLock Team');
    user = team.owner;
  });

  test.describe('AppLock enforced for team', async () => {
    test.beforeEach(async ({api}) => {
      // Enforce app lock for the whole team
      await api.brig.toggleAppLock(team.teamId, 'enabled', true);
    });

    test(
      'Web: I should not be able to close app lock setup modal if app lock is enforced',
      {tag: ['@TC-2740']},
      async ({createPage}) => {
        const page = await createPage();
        const pageManager = PageManager.from(page);
        const {modals} = pageManager.webapp;

        await pageManager.openLoginPage();
        await pageManager.webapp.pages.login().login(user);
        await expect(modals.appLock().appLockModal).toBeVisible();

        await page.mouse.click(200, 350); // click outside the modal
        await expect(modals.appLock().appLockModal).toBeVisible();
      },
    );

    test(
      'I want to see app lock setup modal on login after app lock has been enforced for the team',
      {tag: ['@TC-2744', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user));
        const {modals} = PageManager.from(page).webapp;

        await expect(modals.appLock().appLockModal).toBeVisible();
      },
    );

    test.fixme(
      'Web: App should not lock if I switch back to webapp tab in time (during inactivity timeout)',
      {tag: ['@TC-2752', '@TC-2753', '@regression']},
      async ({browser, createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const pageManager = PageManager.from(page);
        const {modals} = pageManager.webapp;

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
      'Web: I want the app to automatically lock after refreshing the page',
      {tag: ['@TC-2754', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {modals} = PageManager.from(page).webapp;

        await page.reload();

        await expect(modals.appLock().appLockModal).toBeVisible();
      },
    );

    test(
      'Web: I want to unlock the app with passphrase after login',
      {tag: ['@TC-2755', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {modals} = PageManager.from(page).webapp;

        await page.reload();
        await modals.appLock().unlockAppWithPasscode(appLockPassCode);

        await expect(modals.appLock().appLockModal).not.toBeVisible();
      },
    );

    test(
      'Web: I should not be able to unlock the app with wrong passphrase',
      {tag: ['@TC-2758', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {modals} = PageManager.from(page).webapp;

        await page.reload();
        await modals.appLock().unlockAppWithPasscode('wrongCredentials');

        await expect(modals.appLock().errorMessage).toContainText('Wrong passcode');
      },
    );

    test(
      'I want to wipe database when I forgot my app lock passphrase',
      {tag: ['@TC-2761', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {pages, modals} = PageManager.from(page).webapp;

        await page.reload();
        await modals.appLock().clickForgotPassphrase();
        await modals.appLock().clickWipeDB();
        await modals.appLock().clickReset();
        await modals.appLock().inputUserPassword(user.password);

        // After redirect to login page verify the whole indexDB was cleared
        await expect(pages.singleSignOn().ssoCodeEmailInput).toBeVisible();
        await expect.poll(() => page.evaluate(() => indexedDB.databases())).toHaveLength(0);
      },
    );

    test(
      'Web: I should not be able to wipe database with wrong account password',
      {tag: ['@TC-2763', '@regression']},
      async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {modals} = PageManager.from(page).webapp;

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

    [
      {title: 'Web: Verify inactivity timeout set on a team level applies to team member accounts', tag: '@TC-2767'},
      {title: 'I should not be able to switch off app lock if it is enforced for the team', tag: '@TC-2770'},
    ].forEach(({title, tag}) => {
      test(title, {tag: [tag, '@regression']}, async ({createPage}) => {
        const page = await createPage(withLogin(user), withAppLock(appLockPassCode));
        const {components, pages} = PageManager.from(page).webapp;

        await components.conversationSidebar().clickPreferencesButton();
        await expect(pages.account().privacySection.appLock.checkbox).toBeDisabled();
        await expect(pages.account().privacySection).toContainText(
          'Lock Wire after 30 seconds in the background. Unlock with Touch ID or enter your passcode',
        );
      });
    });
  });

  test('I want to switch off app lock', {tag: ['@TC-2771', '@regression']}, async ({createPage}) => {
    const {components, pages, modals} = PageManager.from(await createPage(withLogin(user))).webapp;

    await test.step('Enable app lock', async () => {
      await components.conversationSidebar().clickPreferencesButton();
      await pages.account().privacySection.appLock.label.click();
      await modals.appLock().setPasscode(appLockPassCode);
    });

    await test.step('Switch off app lock', async () => {
      await pages.account().privacySection.appLock.label.click();
      await modals.confirm().actionButton.click();
    });

    await expect(pages.account().privacySection.appLock.checkbox).not.toBeChecked();
  });

  test.skip(
    'Web: Verify inactivity timeout can be set if app lock is not enforced on a team level',
    {tag: ['@TC-2772', '@regression']},
    async () => {
      // not implemented
    },
  );
});
