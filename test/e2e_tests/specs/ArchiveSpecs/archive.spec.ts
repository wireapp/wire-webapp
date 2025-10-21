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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {setupBasicTestScenario, completeLogin} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('Accessibility', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA, memberB] = members;
  const teamName = 'Accessibility';

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
  });

  test(
    'I want to archive and unarchive conversation via conversation list',
    {tag: ['@TC-97', '@regression']},
    async ({pageManager}) => {
      const {components, modals, pages} = pageManager.webapp;
      await completeLogin(pageManager, memberA);

      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await modals.userProfile().clickStartConversation();
      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().archiveConversation();
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().unarchiveConversation();
      await components.conversationSidebar().clickAllConversationsButton();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();
    },
  );

  test(
    'Verify the conversation is not unarchived when there are new messages in this conversation',
    {tag: ['@TC-99', '@regression']},
    async ({pageManager: pageManagerA, browser}) => {
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManagerB = new PageManager(memberPage);

      const {components, modals, pages} = pageManagerA.webapp;
      const {pages: pagesB, components: componentsB, modals: modalsB} = memberPageManagerB.webapp;

      await Promise.all([completeLogin(pageManagerA, memberA), completeLogin(memberPageManagerB, memberB)]);
      try {
        await modalsB.acknowledge().modal.waitFor({state: 'visible', timeout: 2500});
        if (await modalsB.acknowledge().isModalPresent()) {
          await modalsB.acknowledge().clickAction();
        }
      } catch (err) {}

      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await pageManagerA.waitForTimeout(500); // wait a moment to render the modal
      if (await modals.userProfile().isVisible()) {
        await modals.userProfile().clickStartConversation();
      }
      await pages.conversationList().clickConversationOptions(memberB.fullName);

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await componentsB.conversationSidebar().clickAllConversationsButton();
      await pagesB.conversationList().openConversation(memberA.fullName);
      await pagesB.conversation().sendMessage('test');
      await pages.conversationList().archiveConversation();
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().unarchiveConversation();
      await memberContext.close();
    },
  );

  test(
    'I want to archive the group conversation from conversation details',
    {tag: ['@TC-104', '@regression']},
    async ({pageManager}) => {
      const groupName = 'test';
      const {components, pages} = pageManager.webapp;
      await completeLogin(pageManager, memberA);
      await createGroup(pageManager, groupName, [memberB]);
      await pages.conversation().clickConversationInfoButton();
      await pages.conversationDetails().clickArchiveButton();
      await pageManager.waitForTimeout(400);
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(groupName)).toBeTruthy();

      await pages.conversationList().clickConversationOptions(groupName);
      await pages.conversationList().unarchiveConversation();
    },
  );

  test(
    'I want to archive the 1on1 conversation from conversation details',
    {tag: ['@TC-105', '@regression']},
    async ({pageManager}) => {
      const {components, modals, pages} = pageManager.webapp;
      await completeLogin(pageManager, memberA);

      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await pageManager.waitForTimeout(500); // wait a moment to render the modal
      if (await modals.userProfile().isVisible()) {
        await modals.userProfile().clickStartConversation();
      }
      await pages.conversation().clickConversationInfoButton();
      await pages.conversationDetails().clickArchiveButton();
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().unarchiveConversation();
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
