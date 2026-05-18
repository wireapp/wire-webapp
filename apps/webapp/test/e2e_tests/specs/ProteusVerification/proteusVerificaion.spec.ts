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
import {test, expect, withLogin, Team, LOGIN_TIMEOUT} from 'test/e2e_tests/test.fixtures';

test.describe('Proteus verification', () => {
  let proteusTeam: Team;
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    proteusTeam = await createTeam('Proteus Team', {
      users: [userB],
      features: {
        mls: {status: 'disabled', defaultProtocol: 'proteus', supportedProtocols: ['proteus']},
      },
    });
    userA = proteusTeam.owner;
  });

  test('Remove remote device from device list', {tag: ['@TC-713', '@regression']}, async ({createPage}) => {
    await createPage(withLogin(userA));

    const {pages, modals, components} = PageManager.from(
      await createPage(withLogin(userA, {confirmNewHistory: true})),
    ).webapp;

    await components.conversationSidebar().clickPreferencesButton();
    await pages.settings().devicesButton.click();
    await pages.devices().activeDevices.getByRole('button', {name: 'Remove Device'}).click();

    await modals.password().passwordInput.fill(userA.password);
    await modals.password().clickAction();
    await expect(pages.devices().activeDevices).toBeHidden();
  });

  test(
    'Login as permanent device after permanent device limit is reached',
    {tag: ['@TC-715', '@regression']},
    async ({createPage}) => {
      await createPage(withLogin(userA));
      // create 6 devices to reach the limit
      await Promise.all(Array.from({length: 6}, () => createPage(withLogin(userA, {confirmNewHistory: true}))));

      const newDevicePage = await createPage();
      const pageManager = PageManager.from(newDevicePage);
      const {pages, components} = pageManager.webapp;

      await pageManager.openLoginPage();
      await pages.login().login(userA);

      // Due to the difference on this page between Proteus and MLS login flows,
      // we need to use the password to remove the existing device
      await newDevicePage.getByTestId('go-remove-device').first().click({timeout: LOGIN_TIMEOUT});
      await newDevicePage.getByRole('textbox', {name: 'Password'}).fill(userA.password);
      await newDevicePage.getByRole('button', {name: 'Remove device'}).click();

      await pages.historyInfo().clickConfirmButton();
      await expect(components.conversationSidebar().sidebar).toBeVisible({
        timeout: LOGIN_TIMEOUT,
      });
    },
  );

  test(
    'Login as temporary device after device limit is reached',
    {tag: ['@TC-716', '@regression']},
    async ({createPage}) => {
      await createPage(withLogin(userA));
      await Promise.all(Array.from({length: 6}, () => createPage(withLogin(userA, {confirmNewHistory: true}))));

      const newDevicePage = await createPage();
      const pageManager = PageManager.from(newDevicePage);
      const {pages, components} = pageManager.webapp;

      await pageManager.openLoginPage();
      await pages.login().login(userA, {publicComputer: true});
      await pages.historyInfo().clickConfirmButton();
      await expect(components.conversationSidebar().sidebar).toBeVisible({
        timeout: LOGIN_TIMEOUT,
      });

      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().devicesButton.click();
      await expect(pages.devices().activeDevices).toHaveCount(7); // Verify that the temporary device is not added to the device list
    },
  );
});
