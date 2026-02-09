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
import {createGroup, sendTextMessageToConversation} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

// Generating test data
const conversation1 = 'Test Channel 1';
const conversation2 = 'Test Channel 2';

// ToDo(WPB-22442): Backoffice does not unlock calling feature for teams created during tests
test.fixme('Channels Management', {tag: ['@TC-8752', '@crit-flow-web']}, async ({createTeam, createPage, api}) => {
  let owner: User;
  let member: User;
  let ownerPageManager: PageManager;
  let memberPageManager: PageManager;

  await test.step('Preconditions: Team owner creates a channels enabled team', async () => {
    const team = await createTeam('Channels Management', {withMembers: 1});
    owner = team.owner;
    member = team.members[0];

    // TODO: Remove below line when we have a SQS workaround
    await api.brig.enableMLSFeature(owner.teamId);
    await api.brig.unlockChannelFeature(owner.teamId);
    await api.brig.enableChannelsFeature(owner.teamId);

    const [pmOwner, pmMember] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))),
      PageManager.from(createPage(withLogin(member))),
    ]);
    ownerPageManager = pmOwner;
    memberPageManager = pmMember;
  });

  await test.step('Team owner creates a channel with available member', async () => {
    const {pages} = ownerPageManager.webapp;
    await createGroup(pages, conversation1, [member]);
    expect(await pages.conversationList().isConversationItemVisible(conversation1)).toBeTruthy();
  });

  await test.step('Team members leave the conversation', async () => {
    await sendTextMessageToConversation(
      memberPageManager,
      conversation1,
      `Hello ${conversation1}, ${member.firstName} here!`,
    );
    await memberPageManager.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPageManager.webapp.pages.conversation().isUserGroupMember(member.fullName)).toBeTruthy();
    await memberPageManager.webapp.pages.conversation().leaveConversation();
    await memberPageManager.webapp.modals.leaveConversation().clickConfirm();
    await memberPageManager.webapp.pages.conversation().isConversationReadonly();
  });

  await test.step('Team owner confirm member left', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().openConversation(conversation1);
    expect(await pages.conversation().isSystemMessageVisible(`${member.fullName} left`)).toBeTruthy();
  });

  await test.step('Team owner creates another channel', async () => {
    const {pages} = ownerPageManager.webapp;
    await createGroup(pages, conversation2, [member]);
    expect(await pages.conversationList().isConversationItemVisible(conversation2)).toBeTruthy();
  });

  await test.step('Team owner makes the member an admin', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversation().toggleGroupInformation();
    await pages.conversation().makeUserAdmin(member.fullName);
    await pages.conversation().toggleGroupInformation();
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPageManager.webapp.pages.conversationList().openConversation(conversation2);
    await memberPageManager.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPageManager.webapp.pages.conversation().isUserGroupAdmin(member.fullName)).toBeTruthy();
  });

  await test.step('Team admin remove member', async () => {
    const {pages, modals} = ownerPageManager.webapp;
    await pages.conversation().removeAdminFromGroup(member.fullName);
    await modals.removeMember().clickConfirm();
    await pages.conversation().toggleGroupInformation();
  });

  await test.step('Team member verifies they have been removed by the owner', async () => {
    await memberPageManager.webapp.pages.conversationList().openConversation(conversation2);
    await memberPageManager.webapp.pages.conversation().isConversationReadonly();
  });

  await test.step('Team owner add member back to the same conversation', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().openConversation(conversation2);
    await pages.conversation().toggleGroupInformation();
    await pages.conversationDetails().waitForSidebar();
    await pages.conversationDetails().clickAddPeopleButton();
    await pages.startUI().selectUsers(member.username);
    await pages.groupCreation().clickAddMembers();
  });

  await test.step('Team member confirms they have been added back to the conversation', async () => {
    await memberPageManager.webapp.pages.conversationList().openConversation(conversation2);
    await memberPageManager.webapp.pages.conversation().toggleGroupInformation();
    expect(
      await memberPageManager.webapp.pages
        .conversation()
        .isSystemMessageVisible(`${owner.fullName} added you to the conversation`),
    ).toBeTruthy();
  });

  await test.step('Team owner promote member to admin', async () => {
    const {pages} = ownerPageManager.webapp;
    await pages.conversationList().openConversation(conversation2);
    await pages.conversation().makeUserAdmin(member.fullName);
  });

  await test.step('Team member confirms admin status', async () => {
    await memberPageManager.webapp.pages.conversationList().openConversation(conversation2);
    await memberPageManager.webapp.pages.conversation().toggleGroupInformation();
    expect(await memberPageManager.webapp.pages.conversation().isUserGroupAdmin(member.fullName)).toBeTruthy();
  });

  await test.step('Team owner send a message', async () => {
    await sendTextMessageToConversation(ownerPageManager, conversation2, 'Hello team! Admin here.');
  });

  await test.step('Team member sees the message', async () => {
    await expect(
      memberPageManager.webapp.pages.conversation().getMessage({content: 'Hello team! Admin here.'}),
    ).toBeVisible();
  });
});
