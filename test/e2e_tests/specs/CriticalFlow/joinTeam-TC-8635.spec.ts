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
import {sendTextMessageToUser} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

const conversationName = 'Crits';
const textFromBToA = 'Hello Team Owner!';
const textFromAToB = 'Keep up the good work!';

test(
  'New person joins team and setups up device',
  {tag: ['@TC-8635', '@crit-flow-web']},
  async ({createTeam, createPage}) => {
    let userA: User;
    let userB: User;
    let userAPageManager: PageManager;
    let userBPageManager: PageManager;

    await test.step('Precondition', async () => {
      const team = await createTeam('Test Team', {withMembers: 1});
      userA = team.owner;
      userB = team.members[0];
      const [PmA, PmB] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
      ]);
      userAPageManager = PmA;
      userBPageManager = PmB;
    });

    await test.step('B searches for A', async () => {
      const {pages, components, modals} = userBPageManager.webapp;

      await components.conversationSidebar().clickConnectButton();
      await pages.startUI().selectUser(userA.username);
      expect(await modals.userProfile().isVisible());
      await modals.userProfile().clickStartConversation();
    });

    await test.step('B sends text to A', async () => {
      await sendTextMessageToUser(userBPageManager, userA, textFromAToB);
    });

    await test.step('A receives text of B and sends a text to B', async () => {
      const {pages} = userAPageManager.webapp;
      await userAPageManager.waitForTimeout(200); // wait to get the message
      await expect(pages.conversation().page.getByText(textFromAToB)).toBeVisible();
      await sendTextMessageToUser(userAPageManager, userB, textFromBToA);
    });

    await test.step('B receives Text of A', async () => {
      const {pages} = userBPageManager.webapp;
      await userAPageManager.waitForTimeout(200); // wait to get the message
      await expect(pages.conversation().page.getByText(textFromBToA)).toBeVisible();
    });

    await test.step('A creates a group chat', async () => {
      const {pages} = userAPageManager.webapp;
      await pages.conversationList().clickCreateGroup();
      await pages.groupCreation().setGroupName(conversationName);
      //await pages.groupCreation().clickAddMembers();
      await pages.groupCreation().clickCreateGroupButton();
    });

    await test.step('A adds B to chat', async () => {
      const {pages} = userAPageManager.webapp;

      // Team owner opens the group chat
      await pages.conversationList().openConversation(conversationName);
      expect(await pages.conversation().isConversationOpen(conversationName));

      // Team owner opens group information and adds A to the group
      await pages.conversation().toggleGroupInformation();
      expect(await pages.conversationDetails().isOpen(conversationName)).toBeTruthy();
      await pages.conversationDetails().clickAddPeopleButton();
      await pages.conversationDetails().addUsersToConversation([userB.fullName]);

      // Team owner confirms the addition of A to the group
      expect(await pages.conversationDetails().isUserPartOfConversationAsMember(userB.fullName));
      await expect(
        pages.conversation().page.getByText(`You added ${userB.fullName} to the conversation`),
      ).toBeVisible();
    });

    await test.step('B sees the chat', async () => {
      const {pages} = userBPageManager.webapp;
      await pages.conversationList().openConversation(conversationName);
      expect(await pages.conversation().isConversationOpen(conversationName));
    });

    await test.step('A mentions B', async () => {
      const {pages} = userAPageManager.webapp;
      await pages.conversation().sendMessageWithUserMention(userB.fullName);
    });

    await test.step('B sees the mention in the chat', async () => {
      const {pages} = userBPageManager.webapp;
      await userBPageManager.waitForTimeout(200); // wait to get the message

      pages.conversation().sendMessageButton.filter({hasText: 'Send'});
      await expect(pages.conversation().getMessage({content: `@${userB.fullName}`})).toBeVisible();
    });
  },
);
