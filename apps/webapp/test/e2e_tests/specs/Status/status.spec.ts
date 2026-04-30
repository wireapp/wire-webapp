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

import {Page} from 'playwright/test';
import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin, Team} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {interceptNotifications} from 'test/e2e_tests/utils/mockNotifications.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from 'test/e2e_tests/utils/userActions';

enum UserStatus {
  Away = 'Away',
  None = 'None',
  Available = 'Available',
  Busy = 'Busy',
}

async function updateUserStatus(pageManager: PageManager['webapp'], userName: string, status: UserStatus) {
  const {components, modals} = pageManager;
  await components.conversationSidebar().openStatusMenu(userName);
  await components.conversationSidebar().setStatus(status);
  await modals.optionModal().clickAction();
}

test.describe('Status', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Test group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    team = await createTeam('Test Team', {users: [userB, userC]});
    userA = team.owner;
  });

  const commonTestCases = [
    {
      name: 'Text',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendMessage('Test message');
      },
    },
    {
      name: 'Image',
      sendAction: async ({pageA}) => {
        await shareAssetHelper(getImageFilePath(), pageA, pageA.getByRole('button', {name: 'Add picture'}));
      },
    },
    {
      name: 'Ping',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendPing();
      },
    },
    {
      name: 'File sharing',
      sendAction: async ({pageA}) => {
        await shareAssetHelper(getTextFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      name: 'Audio',
      sendAction: async ({pageA}) => {
        await shareAssetHelper(getAudioFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      name: 'Video',
      sendAction: async ({pageA}) => {
        await shareAssetHelper(getVideoFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      name: 'Mention',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Test mention');
      },
    },
    {
      name: 'location sharing',
      sendAction: async ({api, conversation}) => {
        let conversationId;
        if (conversation === '1on1') {
          conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
            protocol: 'mls',
          });
        } else {
          conversationId = await api.conversation.getGroupConversation(userA.token, groupName);
        }

        const {instanceId} = await api.testService.createInstance(
          userA.password,
          userA.email,
          'Test Service Device',
          false,
        );

        if (conversationId === undefined) throw new Error("Couldn't find conversation of userB with userA");
        await api.testService.sendLocation(instanceId, conversationId, {
          locationName: 'Test Location',
          latitude: 52.5170365,
          longitude: 13.404954,
          zoom: 42,
        });
      },
    },
    {
      name: 'Link preview',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendMessage('https://www.lidl.de/');
      },
    },
    {
      name: 'Reply',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        const message = userAPages.conversation().getMessage({content: 'Message to reply'});

        await expect(message).toBeVisible();
        await userAPages.conversation().replyToMessage(message);
        await userAPages.conversation().sendMessage('Reply');
      },
    },
  ] as const satisfies {
    name: string;
    sendAction: (params: {pageA: Page; api: ApiManagerE2E; conversation?: string}) => Promise<void>;
  }[];

  const systemTestCases = [
    {
      name: 'Rename group',
      sendAction: async ({userAPageManager}) => {
        const userAPages = userAPageManager.pages;
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickConversationInfoButton();
        await userAPages.conversationDetails().changeConversationName('New Group Name');
      },
    },
    {
      name: 'Remove member from group',
      sendAction: async ({userAPageManager}) => {
        const pages = userAPageManager.pages;
        await pages.conversation().removeMemberFromGroup(userC.fullName);
      },
    },
    {
      name: 'Leave group',
      sendAction: async ({userAPageManager}) => {
        const {pages, modals} = userAPageManager;
        await pages.conversation().leaveConversation();
        await modals.leaveConversation().clickConfirm();
      },
    },
    {
      name: 'Create new group conversation',
      sendAction: async ({userAPageManager}) => {
        const userAPages = userAPageManager.pages;
        await createGroup(userAPages, 'Test Group 2', [userB]);
      },
    },
    {
      name: 'Add member to group',
      sendAction: async ({userAPageManager}) => {
        const userAPages = userAPageManager.pages;
        await userAPages.conversationList().getConversation('Test Group 2').open();
        await userAPages.conversation().clickConversationInfoButton();
        await userAPages.conversationDetails().clickAddPeopleButton();
        await userAPages.conversationDetails().addUsersToConversation([userC.fullName]);
      },
    },
    {
      name: 'Remove member from a new group',
      sendAction: async ({userAPageManager}) => {
        const pages = userAPageManager.pages;
        await pages.conversation().removeMemberFromGroup(userC.fullName);
      },
    },
  ] as const satisfies {
    name: string;
    sendAction: (params: {userAPageManager: PageManager['webapp']}) => Promise<void>;
  }[];

  const notificationConfigs = [
    {
      status: UserStatus.Away,
      tag: ['@TC-3608', '@regression'],
      title: 'When I am away, I should not get any notifications',
      expectSpecialNotifications: false, // Away suppresses everything including calls/mentions
    },
    {
      status: UserStatus.Busy,
      tag: ['@TC-3614', '@regression'],
      title:
        'When I am Busy, I should not get any notifications for certain messages (text, file, video, audio, ping, images, link preview, system messages)',
      expectSpecialNotifications: true, // Busy allows calls/mentions/replies
    },
  ];

  for (const config of notificationConfigs) {
    test(config.title, {tag: config.tag}, async ({createPage, api}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB), withConnectedUser(userC)),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage).webapp;
      const {pages: userAPages} = userAPageManager;
      const {pages: userBPages, components} = userBPageManager;

      // Prerequisite Setup
      await createGroup(userAPages, groupName, [userB, userC]);

      const scenarios = [
        {
          type: '1on1',
          targetForUserA: userB.fullName,
          targetForUserB: userA.fullName,
          options: {protocol: 'mls'} as const,
        },
        {type: 'group', targetForUserA: groupName, targetForUserB: groupName, options: {}},
      ];

      // User B sends initial messages for replies
      for (const {targetForUserB, options} of scenarios) {
        await userBPages.conversationList().getConversation(targetForUserB, options).open();
        await userBPages.conversation().sendMessage('Message to reply');
      }

      if (config.status === UserStatus.Busy) {
        // Specific "Busy" logic: Mute the group
        await userBPages.conversation().clickConversationInfoButton();
        await userBPages.conversationDetails().setNotifications('Mentions and replies');
      }

      await updateUserStatus(userBPageManager, userB.fullName, config.status);
      // User B opens the third conversation to receive notifications
      await userBPages.conversationList().getConversation(userC.fullName).open();

      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      for (const {type, targetForUserA, targetForUserB, options} of scenarios) {
        await test.step(`Verify notifications in ${type}`, async () => {
          const filteredCases = commonTestCases.filter(
            tc => config.status === UserStatus.Away || !['Mention', 'Reply'].includes(tc.name),
          );
          await userAPages.conversationList().getConversation(targetForUserA, options).open();

          for (const testCase of filteredCases) {
            await test.step(`Action: ${testCase.name} message in ${type}`, async () => {
              await testCase.sendAction({pageA: userAPage, api});
            });
          }

          await components.conversationSidebar().clickAllConversationsButton();
          await expect(userBPages.conversationList().getConversation(targetForUserB, options)).toContainText(
            /\d+ ping, \d+ messages/,
          );
          await expect.poll(() => getUserBNotifications()).toHaveLength(0);
        });
      }

      // System Test Cases
      await test.step('User B should not receive any system notification', async () => {
        await userAPages.conversationList().getConversation(groupName).open();
        for (const systemTestCase of systemTestCases) {
          await systemTestCase.sendAction({userAPageManager});
        }
        await expect.poll(() => getUserBNotifications()).toHaveLength(0);
      });

      // Handle the "Special" Notifications (Calls/Mentions/Replies)
      if (config.expectSpecialNotifications) {
        await test.step('User B should receive mentions, replies, and calls (Busy status)', async () => {
          const specialTestCases = [
            ...commonTestCases.filter(tc => tc.name === 'Mention' || tc.name === 'Reply'),
            {
              name: 'Call',
              sendAction: async ({pageA}: {pageA: Page}) => {
                const userAPages = PageManager.from(pageA).webapp.pages;
                await userAPages.conversation().startCall();
              },
            },
          ];

          await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
          for (const testCase of specialTestCases) {
            await test.step(`Action: ${testCase.name} message`, async () => {
              await testCase.sendAction({pageA: userAPage, api});
            });
          }
          await expect.poll(() => getUserBNotifications()).toHaveLength(specialTestCases.length);
        });
      } else {
        await test.step('User B should not receive calls notification (Away status)', async () => {
          await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
          await userAPages.conversation().startCall();
          await expect(userBPages.calling().callCell).toBeVisible();
          await expect.poll(() => getUserBNotifications()).toHaveLength(0);
        });
      }
    });
  }

  test('I want to see a popup when I change my status', {tag: ['@TC-8772', '@regression']}, async ({createPage}) => {
    const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
    const {components, modals} = userAPageManager.webapp;

    // User A should have no status after login
    await expect(components.conversationSidebar().personalStatusIcon).not.toBeVisible();
    const statuses = Object.values(UserStatus);

    for (const status of statuses) {
      const expectedTitle = status === 'None' ? 'No status set' : `You are set to ${status}`;

      await components.conversationSidebar().openStatusMenu(userA.fullName);
      await components.conversationSidebar().setStatus(status);
      await expect(modals.optionModal().modalTitle).toContainText(expectedTitle);

      await modals.optionModal().actionButton.click();
      await expect(modals.optionModal().modalTitle).not.toBeVisible();
    }
  });

  test(
    'When I am available or have unset status, I want to get notifications for every message in non-muted conversations',
    {tag: ['@TC-3626', '@regression']},
    async ({createPage, api}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage).webapp;
      const {pages, components} = userBPageManager;
      const userAPages = userAPageManager.pages;

      let notificationCount = 0;

      // User A creates a group conversation between User A, User B, User C
      await createGroup(userAPages, groupName, [userB, userC]);

      // User B sends initial message and sets status to available
      await pages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();
      await pages.conversation().sendMessage('Message to reply');

      await pages.conversationList().getConversation(groupName).open();
      await pages.conversation().sendMessage('Message to reply');

      await updateUserStatus(userBPageManager, userB.fullName, UserStatus.Available);
      await components.conversationSidebar().clickPreferencesButton();

      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      const scenarios = [
        {
          type: '1on1',
          target: userB.fullName,
          options: {protocol: 'mls'} as const,
        },
        {
          type: 'group',
          target: 'Test Group',
          options: {},
        },
      ];

      for (const {type, target, options} of scenarios) {
        await test.step(`User A opens the ${type} conversation`, async () => {
          await userAPages.conversationList().getConversation(target, options).open();
        });

        await test.step(`User B should receive all conversation notifications`, async () => {
          for (const testCase of commonTestCases) {
            await test.step(`Action: ${testCase.name}`, async () => {
              await testCase.sendAction({pageA: userAPage, api});
              notificationCount++;
            });
          }
          await expect.poll(() => getUserBNotifications()).toHaveLength(notificationCount);
        });
      }

      await test.step(`User B should receive system notifications only for group creation and renaming`, async () => {
        await userAPages.conversationList().getConversation(groupName).open();
        for (const systemTestCase of systemTestCases) {
          await test.step(`Action: ${systemTestCase.name}`, async () => {
            await systemTestCase.sendAction({userAPageManager});
            if (systemTestCase.name === 'Rename group' || systemTestCase.name === 'Create new group conversation') {
              notificationCount++;
            }
          });
        }

        await expect.poll(() => getUserBNotifications()).toHaveLength(notificationCount);
      });
    },
  );

  test('I want to set my status on profile page', {tag: ['@TC-1766', '@regression']}, async ({createPage}) => {
    const [userAPageManager, userBPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))),
    ]);

    const {pages, components, modals} = userAPageManager.webapp;
    const userBPages = userBPageManager.webapp.pages;

    // User B verify no status is set in conversation list
    const conversation = await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();
    await expect(conversation.statusAvailabilityIcon).not.toBeVisible();

    // User A opens preferences by clicking the gear button
    await components.conversationSidebar().clickPreferencesButton();
    // User A verifies status is None in account preferences
    await expect(pages.account().statusOption(UserStatus.None)).toHaveAccessibleName('Selected, None');
    // User A verifies available status in account preferences are Available, Busy, Away
    await expect(pages.account().statusOption(UserStatus.Available)).toBeVisible();
    await expect(pages.account().statusOption(UserStatus.Busy)).toBeVisible();
    await expect(pages.account().statusOption(UserStatus.Away)).toBeVisible();

    // User A sets status to Available in account preferences
    await pages.account().selectStatus(UserStatus.Available);
    await expect(modals.optionModal().modalTitle).toContainText('You are set to Available');
    await modals.optionModal().actionButton.click();

    // User A verifies is Available in account preferences
    await expect(pages.account().statusOption(UserStatus.Available)).toHaveAccessibleName('Selected, Available');
    await expect(pages.account().statusOption(UserStatus.None)).not.toHaveAccessibleName('Selected, None');

    // User B verifies status is Available in conversation list
    await expect(conversation.statusAvailabilityIcon).toBeVisible();
    await expect(conversation.statusAvailabilityIcon).toHaveAttribute('data-uie-value', 'available');
  });

  test(
    'I want to see availability status in searchable group participant list',
    {tag: ['@TC-1779', '@regression']},
    async ({createPage}) => {
      const [adminPageManager, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      const {components, pages: adminPages} = adminPageManager.webapp;

      // Admin creates a group with user B
      await createGroup(adminPages, groupName, [userB]);

      // Admin sets availability status to BUSY
      await updateUserStatus(adminPageManager.webapp, userA.fullName, UserStatus.Busy);
      await expect(components.conversationSidebar().personalStatusIcon).toBeVisible();

      // User B should see the BUSY status in the searchable group participant list
      await userBPages.conversationList().getConversation(groupName).open();
      await userBPages.conversation().clickConversationInfoButton();
      await expect(userBPages.conversationDetails().getUserAvailabilityIcon(userA.fullName)).toBeVisible();
      await expect(userBPages.conversationDetails().getUserAvailabilityIcon(userA.fullName)).toHaveAttribute(
        'data-uie-value',
        'busy',
      );
    },
  );
});
