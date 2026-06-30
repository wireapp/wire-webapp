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
import {connectWithUser, createGroup, sendConnectionRequest} from 'test/e2e_tests/utils/userActions';

const verifyCrossDeviceTrust = async (
  userAPages: PageManager['webapp']['pages'],
  userBPages: PageManager['webapp']['pages'],
) => {
  for (const userPages of [userAPages, userBPages]) {
    await userPages.conversation().clickConversationInfoButton();
    await userPages.conversationDetails().devicesButton.click();
    await expect(userPages.participantDevices().activeDevices).toHaveCount(1);

    const firstDevice = userPages.participantDevices().activeDevices.first();
    await firstDevice.click();

    await userPages.participantDeviceDetails().toggleDeviceVerification();
    await expect(userPages.participantDevices().getVerifiedBadge(firstDevice)).toBeVisible();
  }

  await expect(
    userBPages.conversation().systemMessages.filter({hasText: 'All fingerprints are verified (Proteus)'}),
  ).toBeVisible();
};

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
    await expect(pages.devices().activeDevices).toHaveCount(1);

    const firstDevice = pages.devices().activeDevices.first();
    await pages.devices().enhanceDeviceLocator(firstDevice).removeButton.click();

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
    "My other clients should be notified when I'm login on a new device",
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
      await expect(modals.newDevice().modalTitle).toContainText('Your account was used on');

      await modals.newDevice().clickAction();
      await pages.settings().devicesButton.click();
      await expect(pages.devices().activeDevices).toHaveCount(1);
      await pages.devices().activeDevices.first().click();

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
      await expect(pages.devices().activeDevices).toHaveCount(1);

      const firstDevice = pages.devices().activeDevices.first();
      await pages.devices().enhanceDeviceLocator(firstDevice).removeButton.click();

      await modals.password().passwordInput.fill('Wrong123456!');
      await modals.password().clickAction();
      await expect(modals.password().modal).toContainText('Please verify your details and try again');

      await modals.password().passwordInput.clear();
      await modals.password().passwordInput.fill(userA.password);
      await modals.password().clickAction();
      await expect(pages.devices().activeDevices).toBeHidden();
    },
  );

  test('Verify other users devices in 1on1 conversation', {tag: ['@TC-719', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
    await connectWithUser(userAPage, userB);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await userAPages.conversationList().getConversation(userB.fullName).open();
    await userBPages.conversationList().getConversation(userA.fullName).open();

    await verifyCrossDeviceTrust(userAPages, userBPages);

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
          await modals.newDevice().clickAction();
        }
        await pages.settings().devicesButton.click();
        await expect(pages.devices().activeDevices).toHaveCount(1);

        await pages.devices().activeDevices.first().click();
        await pages.deviceDetails().toggleDeviceVerification();
      }
    });

    await test.step('Action: User A verifies User Bs device', async () => {
      await userAComponents.conversationSidebar().clickAllConversationsButton();
      await userAPages.conversationList().getConversation(userB.fullName).open();
      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversationDetails().devicesButton.click();
      await expect(userAPages.participantDevices().activeDevices).toHaveCount(1);

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
      await expect(userAPages.devices().activeDevices).toHaveCount(1);

      await userAPages.devices().activeDevices.first().click();
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

  test(
    'Verify conversation degrades on incoming message from non-verified device',
    {tag: ['@TC-724', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const {pages: userAPages, modals: userAModals} = PageManager.from(userAPage).webapp;
      const {pages: userBPages} = PageManager.from(userBPage).webapp;

      await test.step('Prerequisite: All devices from both participants are verified', async () => {
        await userAPages.conversationList().getConversation(userB.fullName).open();
        await userBPages.conversationList().getConversation(userA.fullName).open();
        await verifyCrossDeviceTrust(userAPages, userBPages);
      });

      const userB2Device = await test.step('Action: User B adds a new device', async () => {
        return await createPage(withLogin(userB, {confirmNewHistory: true}));
      });

      await test.step('Action: User A sends a message into the conversation with User B', async () => {
        await userAPages.conversation().sendMessage('Message from User A');

        await expect(userAModals.confirm().modalTitle).toContainText(`${userB.fullName} started using a new device`);
        await userAModals.confirm().clickAction();
      });

      await test.step('Action: User B sends a message to User A from the second device', async () => {
        const userB2Pages = PageManager.from(userB2Device).webapp.pages;
        await userB2Pages.conversationList().getConversation(userA.fullName).open();
        await userB2Pages.conversation().sendMessage('Message from User B');
        await expect(userB2Pages.conversation().getMessage({sender: userB})).toBeVisible();
      });

      await test.step('Verify: User A sees a system message in conversation ', async () => {
        const systemMessage = userAPages
          .conversation()
          .systemMessages.filter({hasText: `${userB.fullName} started using a new device`});
        await expect(systemMessage).toBeVisible();
        await expect(systemMessage.getByTestId('user-device-not-verified')).toBeVisible();
      });
    },
  );

  test(
    'Verify conversation degrades when you add participant to verified group',
    {tag: ['@TC-726', '@regression']},
    async ({createPage, createUser}) => {
      const userC = await createUser();
      const [userAPage, userBPage, userCPage] = await Promise.all([
        createPage(withLogin(userA)),
        createPage(withLogin(userB)),
        createPage(withLogin(userC)),
      ]);
      await connectWithUser(userAPage, userB);
      await sendConnectionRequest(userAPage, userC);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;
      const userCPages = PageManager.from(userCPage).webapp.pages;

      await userCPages.conversationList().openPendingConnectionRequest();
      await userCPages.connectRequest().clickConnectButton();

      await test.step('Prerequisite: Devices of User A and User B are verified in group conversation', async () => {
        const groupName = 'Test Group';
        await createGroup(userAPages, groupName, [userB]);
        await userAPages.conversationList().getConversation(groupName).open();
        await userBPages.conversationList().getConversation(groupName).open();

        for (const pages of [userAPages, userBPages]) {
          await pages.conversation().clickConversationInfoButton();
          await pages
            .conversationDetails()
            .getParticipant(pages === userAPages ? userB.fullName : userA.fullName)
            .openDetails();
          await pages.participantDetails().devicesButton.click();
          await expect(pages.participantDevices().activeDevices).toHaveCount(1);

          const firstDevice = pages.participantDevices().activeDevices.first();
          await firstDevice.click();

          await pages.participantDeviceDetails().toggleDeviceVerification();
          await expect(pages.participantDevices().getVerifiedBadge(firstDevice)).toBeVisible();
        }

        await expect(
          userAPages.conversation().systemMessages.filter({hasText: 'All fingerprints are verified (Proteus)'}),
        ).toBeVisible();
      });

      await test.step('Action: User A adds User C to the group conversation', async () => {
        await userAPages.conversation().clickConversationInfoButton();
        await userAPages.conversation().clickAddMemberButton();
        await userAPages.conversationDetails().addUsersToConversation([userC.fullName]);
        await expect(userAPages.conversationDetails().groupMembers.filter({hasText: userC.fullName})).toBeVisible();
        await expect(
          userAPages.conversation().systemMessages.filter({hasText: 'New people joined. Verify devices'}),
        ).toBeVisible();
      });

      await test.step('Action: User A verifies User Cs device', async () => {
        await userAPages.conversationDetails().getParticipant(userC.fullName).openDetails();
        await userAPages.participantDetails().devicesButton.click();

        await expect(userAPages.participantDevices().activeDevices).toHaveCount(1);
        const firstDevice = userAPages.participantDevices().activeDevices.first();
        await firstDevice.click();

        await userAPages.participantDeviceDetails().toggleDeviceVerification();
        await expect(
          userAPages.conversation().systemMessages.filter({hasText: 'All fingerprints are verified (Proteus)'}),
        ).toHaveCount(2);
      });
    },
  );

  test(
    'Verify conversation degrades with warning if your own account gets new device',
    {tag: ['@TC-731', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const {pages: userAPages, modals: userAModals} = PageManager.from(userAPage).webapp;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await test.step('Prerequisite: All devices from both participants are verified', async () => {
        await userAPages.conversationList().getConversation(userB.fullName).open();
        await userBPages.conversationList().getConversation(userA.fullName).open();
        await verifyCrossDeviceTrust(userAPages, userBPages);
      });

      await test.step('Action: User A logs with a new device', async () => {
        await createPage(withLogin(userA, {confirmNewHistory: true}));
      });

      await test.step('Action: User A sends a message from the first device', async () => {
        await expect(
          userAPages.conversation().systemMessages.filter({hasText: 'You started using a new device'}),
        ).toBeVisible();

        await userAPages.conversation().sendMessage('Message from verified device');

        await expect(userAModals.confirm().modalTitle).toContainText(`You started using a new device`);
        await userAModals.confirm().clickAction();

        await expect(userAPages.conversation().getMessage({sender: userA})).toBeVisible();
      });
    },
  );
});
