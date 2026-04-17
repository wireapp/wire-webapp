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
import {PageManager} from 'test/e2e_tests/pageManager';
import {sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';
import {test, expect, withLogin} from '../../test.fixtures';

test('Channels Management', {tag: ['@TC-8752', '@crit-flow-web']}, async ({createUser, createTeam, createPage}) => {
  const conversation1 = 'Test Channel 1';
  const conversation2 = 'Test Channel 2';

  const member = await createUser();
  const team = await createTeam('Channels Management', {
    users: [member],
    features: {channels: true, mls: true},
  });
  const owner = team.owner;

  const [ownerPageManager, memberPageManager] = await Promise.all([
    PageManager.from(createPage(withLogin(owner))),
    PageManager.from(createPage(withLogin(member))),
  ]);

  const {pages: ownerPages, modals: ownerModals} = ownerPageManager.webapp;
  const {pages: memberPages, modals: memberModals} = memberPageManager.webapp;

  await test.step('Team owner creates a channel with available member', async () => {
    await ownerPages.conversationList().clickCreateGroup();
    await ownerModals.createConversation().createChannel(conversation1, {members: [member]});
    await expect(ownerPages.conversationList().getConversation(conversation1)).toBeVisible();
  });

  await test.step('Team members leave the conversation', async () => {
    await sendTextMessageToConversation(
      memberPageManager,
      conversation1,
      `Hello ${conversation1}, ${member.firstName} here!`,
    );
    await memberPages.conversation().toggleGroupInformation();
    await expect(memberPages.conversationDetails().groupMembers.filter({hasText: member.fullName})).toBeVisible();

    await memberPages.conversation().leaveConversation();
    await memberModals.leaveConversation().clickConfirm();
    await expect(memberPages.conversation().messageInput).not.toBeAttached();
  });

  await test.step('Team owner confirm member left', async () => {
    await ownerPages.conversationList().getConversation(conversation1).open();
    await expect(ownerPages.conversation().systemMessages.filter({hasText: `${member.fullName} left`})).toBeVisible();
  });

  await test.step('Team owner creates another channel', async () => {
    await ownerPages.conversationList().clickCreateGroup();
    await ownerModals.createConversation().createChannel(conversation2, {members: [member]});
    await expect(ownerPages.conversationList().getConversation(conversation2)).toBeVisible();
  });

  await test.step('Team owner makes the member an admin', async () => {
    await ownerPages.conversation().toggleGroupInformation();
    await ownerPages.conversation().makeUserAdmin(member.fullName);
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPages.conversationList().getConversation(conversation2).open();
    await memberPages.conversation().toggleGroupInformation();
    await expect(memberPages.conversation().adminsList.filter({hasText: member.fullName})).toBeVisible();
  });

  await test.step('Team admin remove member', async () => {
    await ownerPages.conversation().toggleGroupInformation();
    await ownerPages.conversation().removeAdminFromGroup(member.fullName);
    await ownerModals.confirm().actionButton.click();
  });

  await test.step('Team member verifies they have been removed by the owner', async () => {
    await memberPages.conversationList().getConversation(conversation2).open();
    await expect(memberPages.conversation().messageInput).not.toBeAttached();
  });

  await test.step('Team owner add member back to the same conversation', async () => {
    await ownerPages.conversationList().getConversation(conversation2).open();
    await expect(
      ownerPages.conversation().systemMessages.filter({hasText: `You removed ${member.fullName}`}),
    ).toBeVisible();
    await ownerPages.conversation().clickAddMemberButton();
    await ownerPages.conversationDetails().addUsersToConversation([member.fullName]);
  });

  await test.step('Team member confirms they have been added back to the conversation', async () => {
    await memberPages.conversationList().getConversation(conversation2).open();
    await memberPages.conversation().toggleGroupInformation();
    await expect(
      memberPages.conversation().systemMessages.filter({hasText: `${owner.fullName} added you to the conversation`}),
    ).toBeVisible();
  });

  await test.step('Team owner promote member to admin', async () => {
    await ownerPages.conversationList().getConversation(conversation2).open();
    await ownerPages.conversation().makeUserAdmin(member.fullName);
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPages.conversationList().getConversation(conversation2).open();
    await memberPages.conversation().toggleGroupInformation();
    await expect(memberPages.conversation().adminsList.filter({hasText: member.fullName})).toBeVisible();
  });

  await test.step('Team owner send a message', async () => {
    await sendTextMessageToConversation(ownerPageManager, conversation2, 'Hello team! Admin here.');
  });

  await test.step('Team member sees the message', async () => {
    await expect(memberPages.conversation().getMessage({content: 'Hello team! Admin here.'})).toBeVisible();
  });
});
