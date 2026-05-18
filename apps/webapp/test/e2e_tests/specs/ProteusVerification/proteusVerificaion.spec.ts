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
import {test, expect, withLogin, Team} from 'test/e2e_tests/test.fixtures';

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
});
