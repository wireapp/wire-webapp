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
import {expect, test, withConnectedUser, withConnectionRequest, withLogin} from 'test/e2e_tests/test.fixtures';
import {Page} from '@playwright/test';
import {createGroup} from '../../utils/userActions';

test.describe('Deep Links', () => {
  let userA: User;
  let userB: User;
  let userC: User;
  let userD: User;

  // --- helper function to copy profile deep link ---
  async function copyProfileLink(page: Page, pageManager: PageManager): Promise<string> {
    const {pages, components} = pageManager.webapp;

    await components.conversationSidebar().preferencesButton.click();
    await pages.settings().copyProfileLinkButton.click();
    await components.conversationSidebar().allConverationsButton.click();

    const copiedLink = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });

    return copiedLink;
  }
  // -----------------------

  test.use({permissions: ['clipboard-write', 'clipboard-read']});

  test(
    'Opening profile deep links as a team member',
    {tag: ['@TC-590', '@regression']},
    async ({createTeam, createUser, createPage}) => {
      userB = await createUser();
      const team = await createTeam('Test Team', {users: [userB]});
      userA = team.owner;
      userC = await createUser();
      userD = await createUser();

      const [userAPage, userBPage, userCPage, userDPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB), withConnectionRequest(userC)),
        createPage(withLogin(userB), withConnectionRequest(userD)),
        createPage(withLogin(userC)),
        createPage(withLogin(userD)),
      ]);

      const [userAPageManager, userBPageManager, userCPageManager, userDPageManager] = await Promise.all([
        PageManager.from(userAPage),
        PageManager.from(userBPage),
        PageManager.from(userCPage),
        PageManager.from(userDPage),
      ]);

      await userBPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      await userCPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      await userDPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const {pages: userCPages} = userCPageManager.webapp;
      const {pages: userDPages} = userDPageManager.webapp;

      await userCPages.conversationList().pendingConnectionRequest.click();
      await userCPages.connectRequest().connectButton.click();
      await userDPages.conversationList().pendingConnectionRequest.click();
      await userDPages.connectRequest().connectButton.click();

      await test.step('User B copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserB = await copyProfileLink(userBPage, userBPageManager);
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage('UserB profile link: ' + copiedProfileLinkUserB);

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userB}).click();
        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userB.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userB.username);
        await expect(userAModals.userProfile().userEmailLabel).toBeVisible();
        await expect(userAModals.userProfile().userEmailEntry).toContainText(userB.email);
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().openConversationButton).toBeVisible();
        await expect(userAModals.userProfile().cancelButton).toBeVisible();
        await userAModals.userProfile().cancelButton.click();
      });

      await test.step('User C copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserC = await copyProfileLink(userCPage, userCPageManager);
        await userCPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userCPages.conversation().sendMessage('UserC profile link: ' + copiedProfileLinkUserC);

        await userAPages.conversationList().openConversation(userC.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userC}).click();
        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userC.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userC.username);
        await expect(userAModals.userProfile().guestChip).toBeVisible();
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().connectWarning).toBeVisible();
        await expect(userAModals.userProfile().openConversationButton).toBeVisible();
        await expect(userAModals.userProfile().blockButton).toBeVisible();
        await userAModals.userProfile().modalCloseButton.click();
      });

      await test.step('User D copies and sends profile deeplink to User B, who sends this link to User A and User A verifies information', async () => {
        const copiedProfileLinkUserD = await copyProfileLink(userDPage, userDPageManager);
        await userDPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userDPages.conversation().sendMessage('UserD profile link: ' + copiedProfileLinkUserD);
        await expect(userDPages.conversation().getMessage({sender: userD})).toBeVisible();

        await userBPages.conversationList().openConversation(userD.fullName, {protocol: 'mls'});
        const profileLinkUserD = userBPages.conversation().getMessage({sender: userD});
        await profileLinkUserD.hover();
        await userBPages.conversation().copyMessage(profileLinkUserD);

        const copiedProfileLinkFromUserD = await userBPage.evaluate(async () => {
          return await navigator.clipboard.readText();
        });

        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(copiedProfileLinkFromUserD);
        await expect(userBPages.conversation().getMessage({sender: userB})).toBeVisible();

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({content: 'UserD'}).click();

        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userD.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userD.username);
        await expect(userAModals.userProfile().guestChip).toBeVisible();
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().connectWarning).toBeVisible();
        await expect(userAModals.userProfile().connectButton).toBeVisible();
        await userAModals.userProfile().cancelButton.click();
      });
    },
  );

  test(
    'Opening profile deep links as a personal account',
    {tag: ['@TC-591', '@regression']},
    async ({createTeam, createUser, createPage}) => {
      userA = await createUser();
      const team = await createTeam('Test Team', {users: [userA]});
      userB = team.owner;
      userC = await createUser();
      userD = await createUser();

      const [userAPage, userBPage, userCPage, userDPage] = await Promise.all([
        createPage(withLogin(userA), withConnectionRequest(userC)),
        createPage(withLogin(userB), withConnectedUser(userA), withConnectionRequest(userD)),
        createPage(withLogin(userC)),
        createPage(withLogin(userD)),
      ]);

      const [userAPageManager, userBPageManager, userCPageManager, userDPageManager] = await Promise.all([
        PageManager.from(userAPage),
        PageManager.from(userBPage),
        PageManager.from(userCPage),
        PageManager.from(userDPage),
      ]);

      await userBPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      await userCPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      await userDPage.context().grantPermissions(['clipboard-write', 'clipboard-read']);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;
      const {pages: userBPages} = userBPageManager.webapp;
      const {pages: userCPages} = userCPageManager.webapp;
      const {pages: userDPages} = userDPageManager.webapp;

      await userCPages.conversationList().pendingConnectionRequest.click();
      await userCPages.connectRequest().connectButton.click();
      await userDPages.conversationList().pendingConnectionRequest.click();
      await userDPages.connectRequest().connectButton.click();

      await test.step('User B copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserB = await copyProfileLink(userBPage, userBPageManager);
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage('UserB profile link: ' + copiedProfileLinkUserB);

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userB}).click();
        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userB.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userB.username);
        await expect(userAModals.userProfile().userEmailLabel).toBeVisible();
        await expect(userAModals.userProfile().userEmailEntry).toContainText(userB.email);
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().openConversationButton).toBeVisible();
        await expect(userAModals.userProfile().cancelButton).toBeVisible();
        await userAModals.userProfile().cancelButton.click();
      });

      await test.step('User C copies and sends profile deeplink to User A and User A verifies information', async () => {
        const copiedProfileLinkUserC = await copyProfileLink(userCPage, userCPageManager);
        await userCPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userCPages.conversation().sendMessage('UserC profile link: ' + copiedProfileLinkUserC);

        await userAPages.conversationList().openConversation(userC.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({sender: userC}).click();
        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userC.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userC.username);
        await expect(userAModals.userProfile().guestChip).toBeVisible();
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().connectWarning).toBeVisible();
        await expect(userAModals.userProfile().openConversationButton).toBeVisible();
        await expect(userAModals.userProfile().blockButton).toBeVisible();
        await userAModals.userProfile().modalCloseButton.click();
      });

      await test.step('User B creates group with User D and sends group link to User A, then User A clicks on the link and verifies popup', async () => {
        const groupName = 'DeepLinksGroup';
        await createGroup(userBPages, groupName, [userD]);
        await userBPages.conversationList().openConversation(groupName);
        await userBPages.conversation().toggleGroupInformation();
        await userBPages.conversationDetails().openGuestOptions();

        const conversationJoinLink = await userBPages.guestOptions().createLink();
        await userBPages.conversation().sendMessage(conversationJoinLink);

        await userBPages.conversation().conversationInfoButton.click();
        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(conversationJoinLink);

        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        const messageWithConversationJoinLink = userAPages
          .conversation()
          .getMessage({sender: userB, content: conversationJoinLink});
        await messageWithConversationJoinLink.getByText(conversationJoinLink).click();
        await expect(userAModals.confirm().modal).toBeVisible();
        await expect(userAModals.confirm().actionButton).toContainText('Join Conversation');
        await userAModals.confirm().actionButton.click();
        await expect(userAPages.conversationList().getConversationLocator(groupName)).toBeVisible();
      });

      await test.step('User D copies and sends profile deeplink to User B, who sends this link to User A and User A verifies information', async () => {
        const copiedProfileLinkUserD = await copyProfileLink(userDPage, userDPageManager);
        await userDPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userDPages.conversation().sendMessage('UserD profile link: ' + copiedProfileLinkUserD);
        await expect(userDPages.conversation().getMessage({sender: userD})).toBeVisible();

        await userBPages.conversationList().openConversation(userD.fullName, {protocol: 'mls'});
        const profileLinkUserD = userBPages.conversation().getMessage({sender: userD}).last();
        await profileLinkUserD.hover();
        await userBPages.conversation().copyMessage(profileLinkUserD);

        const copiedProfileLinkFromUserD = await userBPage.evaluate(async () => {
          return await navigator.clipboard.readText();
        });

        await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
        await userBPages.conversation().sendMessage(copiedProfileLinkFromUserD);
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().getMessage({content: 'UserD'}).click();

        await expect(userAModals.userProfile().modal).toBeVisible();
        await expect(userAModals.userProfile().participantFullname).toContainText(userD.fullName);
        await expect(userAModals.userProfile().participantUsername).toContainText(userD.username);
        await expect(userAModals.userProfile().guestChip).toBeVisible();
        await expect(userAModals.userProfile().domainLabel).toBeVisible();
        await expect(userAModals.userProfile().connectWarning).toBeVisible();
        await expect(userAModals.userProfile().connectButton).toBeVisible();
        await userAModals.userProfile().cancelButton.click();
      });
    },
  );
});
