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
  await modals.statusChangeModal().clickAction();
}

async function prepareConversationForReply(
  pageManager: PageManager['webapp'],
  conversationName: string,
  conversationType: string,
) {
  const {pages, components} = pageManager;
  if (conversationType === '1on1') {
    await pages.conversationList().openConversation(conversationName, {protocol: 'mls'});
  } else {
    await pages.conversationList().openConversation(conversationName);
  }
  await pages.conversation().sendMessage('Message to reply');
  await components.conversationSidebar().clickPreferencesButton();
}

test.describe('Status', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  let groupName: string;
  let conversationId: string | undefined;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();

    team = await createTeam('Test Team', {users: [userB, userC]});
    userA = team.owner;
    groupName = 'Test group';
  });

  const commonTestCases: {
    name: string;
    sendAction: (params: {pageA: Page; api: ApiManagerE2E}) => Promise<void>;
  }[] = [
    {
      name: 'Text',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await userAPages.conversation().sendMessage('Test message');
        const message = userAPages.conversation().getMessage({sender: userA});
        await expect(message).toBeVisible();
      },
    },
    {
      name: 'Image',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await shareAssetHelper(getImageFilePath(), pageA, pageA.getByRole('button', {name: 'Add picture'}));
        expect(await userAPages.conversation().isImageFromUserVisible(userA)).toBeTruthy();
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
        const userAPages = PageManager.from(pageA).webapp.pages;
        await shareAssetHelper(getTextFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
        expect(await userAPages.conversation().isFileMessageVisible()).toBeTruthy();
      },
    },
    {
      name: 'Audio',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await shareAssetHelper(getAudioFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
        expect(await userAPages.conversation().isAudioMessageVisible()).toBeTruthy();
      },
    },
    {
      name: 'Video',
      sendAction: async ({pageA}) => {
        const userAPages = PageManager.from(pageA).webapp.pages;
        await shareAssetHelper(getVideoFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
        expect(await userAPages.conversation().isVideoMessageVisible()).toBeTruthy();
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
      sendAction: async ({api}) => {
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
        await expect(userAPages.conversation().getMessage({content: 'Reply'})).toBeVisible();
      },
    },
  ];

  const systemTestCases: {
    name: string;
    sendAction: (params: {pageA: PageManager}) => Promise<void>;
  }[] = [
    {
      name: 'Rename group',
      sendAction: async ({pageA}) => {
        const userAPages = pageA.webapp.pages;
        await userAPages.conversationList().openConversation(groupName);
        await userAPages.conversation().clickConversationInfoButton();
        await userAPages.conversationDetails().changeConversationName('New Group Name');
      },
    },
    {
      name: 'Remove member from group',
      sendAction: async ({pageA}) => {
        const pages = pageA.webapp.pages;
        await pages.conversation().removeMemberFromGroup(userC.fullName);
        await expect(pages.conversation().systemMessages.last()).toContainText(`You removed ${userC.fullName}`);
      },
    },
    {
      name: 'Leave group',
      sendAction: async ({pageA}) => {
        const {pages, modals} = pageA.webapp;
        await pages.conversation().leaveConversation();
        await modals.leaveConversation().clickConfirm();
        await expect(pages.conversation().systemMessages.last()).toContainText('You left');
      },
    },
    {
      name: 'Create new group conversation',
      sendAction: async ({pageA}) => {
        const userAPages = pageA.webapp.pages;
        await createGroup(userAPages, 'Test Group 2', [userB]);
      },
    },
    {
      name: 'Add member to group',
      sendAction: async ({pageA}) => {
        const userAPages = pageA.webapp.pages;
        await userAPages.conversationList().openConversation('Test Group 2');
        await userAPages.conversation().clickConversationInfoButton();
        await userAPages.conversationDetails().clickAddPeopleButton();
        await userAPages.conversationDetails().addUsersToConversation([userC.fullName]);
        await expect(userAPages.conversation().systemMessages.last()).toContainText(
          `You added ${userC.fullName} to the conversation`,
        );
      },
    },
    {
      name: 'Remove member from a new group',
      sendAction: async ({pageA}) => {
        const {pages} = pageA.webapp;
        await pages.conversation().removeMemberFromGroup(userC.fullName);
        await expect(pages.conversation().systemMessages.last()).toContainText(`You removed ${userC.fullName}`);
      },
    },
  ];

  test(
    'When I am away, I should not get any notifications for messages (text, file, video, audio, ping, images, link preview, mentions, replies)',
    {tag: ['@TC-3608', '@regression']},
    async ({createPage, api}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const userAPages = userAPageManager.webapp.pages;
      const {pages, components} = userBPageManager.webapp;

      // User B sets status to away
      await updateUserStatus(userBPageManager.webapp, userB.fullName, UserStatus.Away);

      const {getNotifications: getUserBNotifications} = await interceptNotifications(pages.conversation().page);

      for (const conversation of ['1on1', 'group']) {
        await test.step(`User A opens the ${conversation} conversation`, async () => {
          if (conversation === '1on1') {
            // User B sends a message to User A
            await prepareConversationForReply(userBPageManager.webapp, userA.fullName, conversation);
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              protocol: 'mls',
            });
            // User A opens 1:1 conversation between User A and User B
            await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
          } else {
            // User A creates a group conversation between User A, User B, User C
            await createGroup(userAPages, groupName, [userB, userC]);
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              conversationName: groupName,
            });

            await components.conversationSidebar().allConverationsButton.click();
            await prepareConversationForReply(userBPageManager.webapp, groupName, conversation);
          }
        });

        await test.step(`User B should not receive any conversation notifications`, async () => {
          for (const testCase of commonTestCases) {
            await test.step(`Action: ${testCase.name}`, async () => {
              await testCase.sendAction({pageA: userAPages.conversation().page, api});
              await expect.poll(() => getUserBNotifications()).toHaveLength(0);
            });
          }
        });
      }

      await test.step(`User B should not receive any system notification`, async () => {
        await userAPages.conversationList().openConversation(groupName);
        for (const systemTestCase of systemTestCases) {
          await test.step(`Action: ${systemTestCase.name}`, async () => {
            await systemTestCase.sendAction({pageA: userAPageManager});
            await expect.poll(() => getUserBNotifications()).toHaveLength(0);
          });
        }
      });

      await test.step(`User B should not receive notification from call in 1to1`, async () => {
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().startCall();
        await expect.poll(() => getUserBNotifications()).toHaveLength(0);
      });
    },
  );

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
      await expect(modals.statusChangeModal().modalTitle).toContainText(expectedTitle);

      await modals.statusChangeModal().actionButton.click();
      await expect(modals.statusChangeModal().modalTitle).not.toBeVisible();
    }
  });

  test(
    'When I am Busy, I should not get any notifications for certain messages (text, file, video, audio, ping, images, link preview, system messages)',
    {tag: ['@TC-3614', '@regression']},
    async ({createPage, api}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const userAPages = userAPageManager.webapp.pages;
      const {pages} = userBPageManager.webapp;

      // User A creates a group conversation between User A, User B, User C
      await createGroup(userAPages, groupName, [userB, userC]);

      await test.step('Prerequisite: User B sets status to Busy and mutes group conversation ', async () => {
        await updateUserStatus(userBPageManager.webapp, userB.fullName, UserStatus.Busy);

        await pages.conversationList().openConversation(groupName);
        await pages.conversation().clickConversationInfoButton();
        await pages.conversationDetails().setNotifications('Mentions and replies');
      });

      const {getNotifications: getUserBNotifications} = await interceptNotifications(pages.conversation().page);

      for (const conversation of ['1on1', 'group']) {
        await test.step(`User A opens the ${conversation} conversation`, async () => {
          if (conversation === '1on1') {
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              protocol: 'mls',
            });
            // User A creates 1:1 conversation between User A and User B
            await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
          } else {
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              conversationName: groupName,
            });

            await userAPages.conversationList().openConversation('Test Group');
          }
        });

        await test.step(`User B should not receive any notifications for certain messages (text, file, audio, ping, images, link preview)`, async () => {
          for (const testCase of commonTestCases) {
            if (testCase.name === 'Mention' || testCase.name === 'Reply') {
              continue; // Skip mention and reply test cases as they are handled separately
            }
            await test.step(`Action: ${testCase.name} message in ${conversation}`, async () => {
              await testCase.sendAction({pageA: userAPages.conversation().page, api});
              await expect.poll(() => getUserBNotifications()).toHaveLength(0);
            });
          }
        });
      }

      await test.step(`User B should not receive any system notification`, async () => {
        await userAPages.conversationList().openConversation(groupName);
        for (const systemTestCase of systemTestCases) {
          await test.step(`Action: ${systemTestCase.name}`, async () => {
            await systemTestCase.sendAction({pageA: userAPageManager});
            await expect.poll(() => getUserBNotifications()).toHaveLength(0);
          });
        }
      });

      await test.step(`User B should receive mentions, replies and calls notifications in 1to1`, async () => {
        const specialTasteCases = commonTestCases.filter(
          testCase => testCase.name === 'Mention' || testCase.name === 'Reply',
        );
        specialTasteCases.push({
          name: 'Call',
          sendAction: async ({pageA}) => {
            const userAPages = PageManager.from(pageA).webapp.pages;
            await userAPages.conversation().startCall();
          },
        });

        await prepareConversationForReply(userBPageManager.webapp, userA.fullName, '1on1');

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});

        for (const testCase of specialTasteCases) {
          await test.step(`Action: ${testCase.name} message`, async () => {
            await testCase.sendAction({pageA: userAPages.conversation().page, api});
            await expect.poll(() => getUserBNotifications()).toHaveLength(1);
          });
        }
      });
    },
  );

  test(
    'When I am available or have unset status, I want to get notifications for every message in non-muted conversations',
    {tag: ['@TC-3626', '@regression']},
    async ({createPage, api}) => {
      const [userAPageManager, userBPageManager] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      const userAPages = userAPageManager.webapp.pages;
      const {pages, components} = userBPageManager.webapp;

      // User B sets status to available
      await updateUserStatus(userBPageManager.webapp, userB.fullName, UserStatus.Available);

      const {getNotifications: getUserBNotifications} = await interceptNotifications(pages.conversation().page);
      let notificationCount = 0;

      // User A creates a group conversation between User A, User B, User C
      await createGroup(userAPages, groupName, [userB, userC]);
      notificationCount++;

      for (const conversation of ['1on1', 'group']) {
        await test.step(`User A opens the ${conversation} conversation`, async () => {
          if (conversation === '1on1') {
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              protocol: 'mls',
            });
            // User B sends a message to User A
            await prepareConversationForReply(userBPageManager.webapp, userA.fullName, conversation);
            // User A opens 1:1 conversation between User A and User B
            await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
          } else {
            conversationId = await api.conversation.getConversationWithUser(userA.token, userB.id!, {
              conversationName: groupName,
            });

            await components.conversationSidebar().allConverationsButton.click();
            await prepareConversationForReply(userBPageManager.webapp, groupName, conversation);

            await userAPages.conversationList().openConversation(groupName);
          }
        });

        await test.step(`User B should receive all conversation notifications`, async () => {
          for (const testCase of commonTestCases) {
            await test.step(`Action: ${testCase.name}`, async () => {
              await testCase.sendAction({pageA: userAPages.conversation().page, api});
              notificationCount++;
              await expect.poll(() => getUserBNotifications()).toHaveLength(notificationCount);
            });
          }
        });
      }

      await test.step(`User B should receive system notifications only for group creation and renaming`, async () => {
        await userAPages.conversationList().openConversation(groupName);
        for (const systemTestCase of systemTestCases) {
          await test.step(`Action: ${systemTestCase.name}`, async () => {
            await systemTestCase.sendAction({pageA: userAPageManager});
          });
        }

        await expect.poll(() => getUserBNotifications()).toHaveLength(notificationCount + 2);
      });
    },
  );

  test('I want to set my status on profile page', {tag: ['@TC-1766', '@regression']}, async ({createPage}) => {
    const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
    const userBPages = await PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(
      pm => pm.webapp.pages,
    );
    const {pages, components, modals} = userAPageManager.webapp;

    // User B verify no status is set in conversation list
    await userBPages.conversationList().openConversation(userA.fullName);
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).not.toBeVisible();

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
    await expect(modals.statusChangeModal().modalTitle).toContainText('You are set to Available');
    await modals.statusChangeModal().actionButton.click();

    // User A verifies is Available in account preferences
    await expect(pages.account().statusOption(UserStatus.Available)).toHaveAccessibleName('Selected, Available');
    await expect(pages.account().statusOption(UserStatus.None)).not.toHaveAccessibleName('Selected, None');

    // User B verifies status is Available in conversation list
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).toBeVisible();
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).toHaveAttribute('data-uie-value', 'available');
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
      await userBPages.conversationList().openConversation(groupName);
      await userBPages.conversation().clickConversationInfoButton();
      await expect(await userBPages.conversationDetails().statusParticipant(userA.fullName)).toBeVisible();
      await expect(await userBPages.conversationDetails().statusParticipant(userA.fullName)).toHaveAttribute(
        'data-uie-value',
        'busy',
      );
    },
  );
});
