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
import {connectWithUser} from 'test/e2e_tests/utils/userActions';

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

  test(
    'My other clients should be notified when I`m login on a new device',
    {tag: ['@TC-717', '@regression']},
    async ({createPage}) => {
      const {pages, components, modals} = PageManager.from(await createPage(withLogin(userA))).webapp;
      // Ensure the initial active session starts as verified
      await expect(components.conversationSidebar().verifiedBadge).toBeVisible();

      // User logins on second unverified device
      await createPage(withLogin(userA, {confirmNewHistory: true}));
      // Verify that the initial session drops its verified status due to the new device
      await expect(components.conversationSidebar().verifiedBadge).toBeHidden();

      await components.conversationSidebar().clickPreferencesButton();
      await expect(modals.accountNewDevices().modalTitle).toContainText('Your account was used on');

      await modals.accountNewDevices().clickAction();
      await pages.settings().devicesButton.click();
      await pages.devices().activeDevices.getByTestId('go-device-details').click();

      // User verifies the new device, which restore the original session's verified status
      await pages.deviceDetails().toggleDeviceVerification();
      await expect(components.conversationSidebar().verifiedBadge).toBeVisible();
    },
  );

  test(
    'I should not be able to remove device with wrong password',
    {tag: ['@TC-718', '@regression']},
    async ({createPage}) => {
      await createPage(withLogin(userA));

      const {pages, modals, components} = PageManager.from(
        await createPage(withLogin(userA, {confirmNewHistory: true})),
      ).webapp;

      await components.conversationSidebar().clickPreferencesButton();
      await pages.settings().devicesButton.click();
      await pages.devices().activeDevices.getByRole('button', {name: 'Remove Device'}).click();

      await modals.password().passwordInput.fill('Wrong123456!');
      await modals.password().clickAction();
      await expect(modals.password().modal).toContainText('Please verify your details and try again');

      await modals.password().passwordInput.clear();
      await modals.password().passwordInput.fill(userA.password);
      await modals.password().clickAction();
      await expect(pages.devices().activeDevices).toBeHidden();
    },
  );

  test('Verify other user`s devices in 1on1 conversation', {tag: ['@TC-719', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
    await connectWithUser(userAPage, userB);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await userAPages.conversationList().getConversation(userB.fullName).open();
    await userBPages.conversationList().getConversation(userA.fullName).open();

    for (const pages of [userAPages, userBPages]) {
      await pages.conversation().clickConversationInfoButton();
      await pages.conversationDetails().devicesButton.click();

      const firstDevice = pages.participantDevices().activeDevices.first();
      await firstDevice.click();

      await pages.participantDeviceDetails().toggleDeviceVerification();
      await expect(pages.participantDevices().getVerifiedBadge(firstDevice)).toBeVisible();
    }

    await expect(
      userBPages.conversation().systemMessages.filter({hasText: 'All fingerprints are verified (Proteus)'}),
    ).toBeVisible();

    await userAPages.conversation().sendMessage('Message');
    await expect(userBPages.conversation().getMessage({sender: userA})).toBeVisible();
  });

  test('You can verify and unverify your devices', {tag: ['@TC-723', '@regression']}, async ({createPage}) => {
    // Setup: Log in User A on two devices and connect with User B
    const [userAPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
    await connectWithUser(userAPage, userB);

    const userA2Device = await createPage(withLogin(userA, {confirmNewHistory: true}));
    const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;

    await test.step('Action: User A verifies both of their active devices', async () => {
      for (const page of [userAPage, userA2Device]) {
        const {pages, components, modals} = PageManager.from(page).webapp;

        await components.conversationSidebar().clickPreferencesButton();
        if (page === userAPage) {
          await modals.accountNewDevices().clickAction();
        }
        await pages.settings().devicesButton.click();
        await pages.devices().activeDevices.getByTestId('go-device-details').click();
        await pages.deviceDetails().toggleDeviceVerification();
      }
    });

    await test.step('Action: User A verifies User B`s device', async () => {
      await userAComponents.conversationSidebar().clickAllConversationsButton();
      await userAPages.conversationList().getConversation(userB.fullName).open();
      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversationDetails().devicesButton.click();

      const firstDevice = userAPages.participantDevices().activeDevices.first();
      await firstDevice.click();
      await userAPages.participantDeviceDetails().toggleDeviceVerification();
      await expect(userAPages.participantDevices().getVerifiedBadge(firstDevice)).toBeVisible();
    });

    await test.step('Verify: Successful verification status and system messages', async () => {
      await expect(
        userAPages.conversation().systemMessages.filter({hasText: 'All fingerprints are verified (Proteus)'}),
      ).toBeVisible();
      await expect(userAPages.conversation().verifiedBadge).toBeVisible();
    });

    await test.step('Action: Unverify User A primary device', async () => {
      await userAComponents.conversationSidebar().clickPreferencesButton();
      await userAPages.settings().devicesButton.click();
      await userAPages.devices().activeDevices.getByTestId('go-device-details').click();
      await userAPages.deviceDetails().toggleDeviceVerification();
    });

    await test.step('Verify: Device unverified status and system message updates', async () => {
      await userAComponents.conversationSidebar().clickAllConversationsButton();
      await userAPages.conversationList().getConversation(userB.fullName).open();
      await expect(
        userAPages.conversation().systemMessages.filter({hasText: 'You unverified one of your device'}),
      ).toBeVisible();
      await expect(userAPages.conversation().verifiedBadge).toBeHidden();
    });
  });
});
