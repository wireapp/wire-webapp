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
import {sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

// Generating test data
const conversationName = 'Test Conversation';

test('Conversation Management', {tag: ['@TC-8636', '@crit-flow-web']}, async ({createTeam, createPage}) => {
  test.setTimeout(150_000);

  let owner: User;
  let members: User[];
  let ownerPageManager: PageManager;
  let memberPageManagers: PageManager[];

  await test.step('Preconditions: Team owner created a team with 5 members', async () => {
    const team = await createTeam('Conversation Management', {withMembers: 5});
    owner = team.owner;
    members = team.members;

    const [pmOwner, ...pmMembers] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))),
      ...members.map(member => PageManager.from(createPage(withLogin(member)))),
    ]);
    ownerPageManager = pmOwner;
    memberPageManagers = pmMembers;
  });

  await test.step('Team owner creates a group with all the five members', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().clickCreateGroup();
    await pages.groupCreation().setGroupName(conversationName);
    await pages.startUI().selectUsers(members.map(member => member.username));
    await pages.groupCreation().clickCreateGroupButton();
    expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
  });

  await test.step('Team owner sends a message in the conversation', async () => {
    await sendTextMessageToConversation(ownerPageManager, conversationName, 'Hello team! Admin here.');
  });

  await test.step('Team members sign in and send messages', async () => {
    await Promise.all(
      members.map(async (member, index) => {
        await sendTextMessageToConversation(
          memberPageManagers[index],
          conversationName,
          `Hello team! ${member.firstName} here.`,
        );
      }),
    );
  });

  await test.step('Team owner signed in to the application and verify messages', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().openConversation(conversationName);
    await Promise.all(
      members.map(async member => {
        const message = pages.conversation().getMessage({content: `Hello team! ${member.firstName} here.`});
        await expect(message).toBeVisible();
      }),
    );
  });

  await test.step('Team owner send self-destructing messages', async () => {
    const {pages, components} = ownerPageManager.webapp;
    const textMessage = 'This message will self-destruct in 10 seconds.';
    await components.inputBarControls().setEphemeralTimerTo('10 seconds');
    await pages.conversation().sendMessage(textMessage);

    await expect(pages.conversation().getMessage({content: textMessage})).toBeVisible();
    // Wait for more than 10 seconds to ensure the message is deleted
    await pages.conversation().page.waitForTimeout(11000);

    await expect(pages.conversation().getMessage({content: textMessage})).not.toBeVisible();
    await components.inputBarControls().setEphemeralTimerTo('Off');
  });

  await test.step('Team owner open searched conversation', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().searchConversation(conversationName);
    await pages.conversationList().openConversation(conversationName);
    expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    await pages.conversationList().openConversation(conversationName);
  });

  await test.step('Team owner leave conversation with clear history', async () => {
    const {pages, modals} = ownerPageManager.webapp;
    await pages.conversationList().openContextMenu(conversationName);
    await pages.conversationList().leaveConversation();
    await modals.leaveConversation().toggleCheckbox();
    await modals.leaveConversation().clickConfirm();
    await pages.conversation().isConversationReadonly();
    expect(await pages.conversation().isMessageInputVisible()).toBeFalsy();
  });
});
