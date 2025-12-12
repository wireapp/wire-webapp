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

import {BrowserContext} from '@playwright/test';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';

import {Services} from '../../data/serviceInfo';
import {getUser} from '../../data/user';
import {PageManager} from '../../pageManager';
import {test, expect} from '../../test.fixtures';
import {loginUser} from '../../utils/userActions';

// Generating test data
let owner = getUser();
const member1 = getUser();
const member2 = getUser();
const teamName = 'Critical';
const conversationName = 'Crits';

// Browser contexts for cleanup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let member1Context: BrowserContext | undefined;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let member2Context: BrowserContext | undefined;

test(
  'Team owner adds whole team to an all team chat',
  {tag: ['@TC-8631', '@crit-flow-web']},
  async ({page, pageManager, api, browser}) => {
    const {pages, modals} = pageManager.webapp;

    // Create page managers for members that will be reused across steps
    let member1PageManager: PageManager;
    let member2PageManager: PageManager;

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      const user = await api.createTeamOwner(owner, teamName);
      owner = {...owner, ...user};
      addCreatedTeam(owner, owner.teamId);
      const invitationIdForMember1 = await api.team.inviteUserToTeam(member1.email, owner);
      const invitationCodeForMember1 = await api.brig.getTeamInvitationCodeForEmail(
        owner.teamId,
        invitationIdForMember1,
      );

      const invitationIdForMember2 = await api.team.inviteUserToTeam(member2.email, owner);
      const invitationCodeForMember2 = await api.brig.getTeamInvitationCodeForEmail(
        owner.teamId,
        invitationIdForMember2,
      );

      await api.createPersonalUser(member1, invitationCodeForMember1);
      await api.createPersonalUser(member2, invitationCodeForMember2);
    });

    await test.step('Team owner logs in into a client and creates group conversation', async () => {
      await pageManager.openMainPage();
      await loginUser(owner, pageManager);
      await modals.dataShareConsent().clickDecline();
    });

    await test.step('Team owner adds team members to a group', async () => {
      await pages.conversationList().clickCreateGroup();
      await pages.groupCreation().setGroupName(conversationName);
      await pages.startUI().selectUsers([member1.username, member2.username]);
      await pages.groupCreation().clickCreateGroupButton();
      expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Team owner adds a service to newly created group', async () => {
      await api.team.addServiceToTeamWhitelist(owner.teamId, Services.POLL_SERVICE, owner.token);
      // Add the Poll service to the conversation
      await pages.conversation().clickConversationTitle();
      await pages.conversationDetails().waitForSidebar();
      await pages.conversationDetails().clickAddPeopleButton();
      await pages.conversationDetails().addServiceToConversation('Poll');
      // Verify service was added by checking for system message
      await expect(page.getByText('You added Poll Bot to the')).toBeVisible();
    });

    await test.step('All group participants send messages in a group', async () => {
      // Member1 logs in and opens the conversation (establish encrypted session)
      member1Context = await browser.newContext();
      const member1Page = await member1Context.newPage();
      member1PageManager = new PageManager(member1Page);
      await member1PageManager.openMainPage();
      await loginUser(member1, member1PageManager);
      await member1PageManager.webapp.modals.dataShareConsent().clickDecline();
      await member1PageManager.webapp.pages.conversationList().openConversation(conversationName);

      // Member2 logs in and opens the conversation (establish encrypted session)
      member2Context = await browser.newContext();
      const member2Page = await member2Context.newPage();
      member2PageManager = new PageManager(member2Page);
      await member2PageManager.openMainPage();
      await loginUser(member2, member2PageManager);
      await member2PageManager.webapp.modals.dataShareConsent().clickDecline();
      await member2PageManager.webapp.pages.conversationList().openConversation(conversationName);

      // Wait for encryption to be established by checking that conversation is fully loaded
      await pages.conversationList().openConversation(conversationName);
      await pages.conversation().conversationTitle.waitFor({state: 'visible'});

      // Now all members can send and receive encrypted messages
      // Team owner sends a message
      await pages.conversation().sendMessage(`Hello from ${owner.firstName}!`);
      await expect(pages.conversation().getMessage({content: `Hello from ${owner.firstName}!`})).toBeVisible();

      // Member1 sends a message
      await member1PageManager.webapp.pages.conversation().sendMessage(`Hello from ${member1.firstName}!`);
      await expect(
        member1PageManager.webapp.pages.conversation().getMessage({content: `Hello from ${member1.firstName}!`}),
      ).toBeVisible();

      // Member2 sends a message
      await member2PageManager.webapp.pages.conversation().sendMessage(`Hello from ${member2.firstName}!`);
      await expect(
        member2PageManager.webapp.pages.conversation().getMessage({content: `Hello from ${member2.firstName}!`}),
      ).toBeVisible();

      // Owner verifies all messages are visible
      await pages.conversationList().openConversation(conversationName);
      await expect(pages.conversation().getMessage({content: `Hello from ${member1.firstName}!`})).toBeVisible();
      await expect(pages.conversation().getMessage({content: `Hello from ${member2.firstName}!`})).toBeVisible();
    });

    await test.step('Team owner and group members react on received messages with reactions', async () => {
      // Owner reacts to member1's message with +1 (thumbs up)
      await pages.conversationList().openConversation(conversationName);
      const member1MessageForOwner = pages.conversation().getMessage({content: `Hello from ${member1.firstName}!`});
      await member1MessageForOwner.waitFor({state: 'visible'}); // Wait for message to be ready
      await pages.conversation().reactOnMessage(member1MessageForOwner, 'plus-one');

      // Owner reacts to member2's message with +1 (thumbs up)
      const member2MessageForOwner = pages.conversation().getMessage({content: `Hello from ${member2.firstName}!`});
      await pages.conversation().reactOnMessage(member2MessageForOwner, 'plus-one');

      // Member1 reacts to owner's message with heart (❤️)
      await member1PageManager.webapp.pages.conversationList().openConversation(conversationName);
      const ownerMessageForMember1 = member1PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${owner.firstName}!`});
      await member1PageManager.webapp.pages.conversation().reactOnMessage(ownerMessageForMember1, 'heart');

      // Member1 reacts to member2's message with heart (❤️)
      const member2MessageForMember1 = member1PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${member2.firstName}!`});
      await member1PageManager.webapp.pages.conversation().reactOnMessage(member2MessageForMember1, 'heart');

      // Member2 reacts to owner's message with joy (😂)
      await member2PageManager.webapp.pages.conversationList().openConversation(conversationName);
      const ownerMessageForMember2 = member2PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${owner.firstName}!`});
      await member2PageManager.webapp.pages.conversation().reactOnMessage(ownerMessageForMember2, 'joy');

      // Member2 reacts to member1's message with joy (😂)
      const member1MessageForMember2 = member2PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${member1.firstName}!`});
      await member2PageManager.webapp.pages.conversation().reactOnMessage(member1MessageForMember2, 'joy');
    });

    await test.step('All group participants make sure they see reactions from other group participants', async () => {
      // Owner verifies they can see heart (❤️) and joy (😂) reactions on their message from member1 and member2
      await pages.conversationList().openConversation(conversationName);
      const ownerMessage = pages.conversation().getMessage({content: `Hello from ${owner.firstName}!`});
      await expect(pages.conversation().getReactionOnMessage(ownerMessage, 'heart')).toBeVisible();
      await expect(pages.conversation().getReactionOnMessage(ownerMessage, 'joy')).toBeVisible();

      // Member1 verifies they can see thumbs up (+1) and joy (😂) reactions on their message from owner and member2
      await member1PageManager.webapp.pages.conversationList().openConversation(conversationName);
      const member1Message = member1PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${member1.firstName}!`});
      await expect(
        member1PageManager.webapp.pages.conversation().getReactionOnMessage(member1Message, 'plus-one'),
      ).toBeVisible();
      await expect(
        member1PageManager.webapp.pages.conversation().getReactionOnMessage(member1Message, 'joy'),
      ).toBeVisible();

      // Member2 verifies they can see thumbs up (+1) and heart (❤️) reactions on their message from owner and member1
      await member2PageManager.webapp.pages.conversationList().openConversation(conversationName);
      const member2Message = member2PageManager.webapp.pages
        .conversation()
        .getMessage({content: `Hello from ${member2.firstName}!`});
      await expect(
        member2PageManager.webapp.pages.conversation().getReactionOnMessage(member2Message, 'plus-one'),
      ).toBeVisible();
      await expect(
        member2PageManager.webapp.pages.conversation().getReactionOnMessage(member2Message, 'heart'),
      ).toBeVisible();
    });

    await test.step('Team owner removes one group member from a group', async () => {
      // Conversation Sidebar should already be open from previous step

      // Get the member from the members list and remove them
      await pages.conversation().removeMemberFromGroup(member2.fullName);
      await modals.removeMember().clickConfirm();

      // Verify member is no longer in the conversation by checking system message
      expect(await pages.conversation().isSystemMessageVisible(`You removed ${member2.fullName}`)).toBeTruthy();
    });

    await test.step('Team owner removes a service from a group', async () => {
      // Conversation Sidebar should already be open from previous step

      // Remove the Poll service (services appear in the members list)
      await pages.conversationDetails().removeServiceFromConversation('Poll');

      // Verify service was removed by checking for system message
      expect(await pages.conversation().isSystemMessageVisible('You removed Poll Bot')).toBeTruthy();
    });
  },
);

test.afterAll(async ({api}) => {
  await member1Context?.close();
  await member2Context?.close();
  await removeCreatedTeam(api, owner);
});
