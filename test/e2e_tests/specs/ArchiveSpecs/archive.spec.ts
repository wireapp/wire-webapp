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
import {setupBasicTestScenario, startUpApp} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';

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
      await startUpApp(pageManager, memberA);
      // starts an 1o1 // exclude to startup
      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await modals.userProfile().clickStartConversation();
      // right click archive
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
      const {pages: pagesB, components: componentsB} = memberPageManagerB.webapp;

      await Promise.all([startUpApp(pageManagerA, memberA), startUpApp(memberPageManagerB, memberB)]);

      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await modals.userProfile().clickStartConversation();

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().archiveConversation();
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await componentsB.conversationSidebar().clickAllConversationsButton();
      await pagesB.conversationList().openConversation(memberA.fullName);
      await pagesB.conversation().sendMessage('test');
      await components.conversationSidebar().clickArchive();

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();

      await memberContext.close();
    },
  );

  test(
    'I want to archive the group conversation from conversation details',
    {tag: ['@TC-104', '@regression']},
    async ({pageManager, browser}) => {
      await startUpApp(pageManager, memberA);
      // generate an group
      // open sidebar
      // click archive chat
      // click archive tab
      // check chat is there
    },
  );

  test(
    'I want to archive the 1on1 conversation from conversation details',
    {tag: ['@TC-105', '@regression']},
    async ({pageManager}) => {
      await startUpApp(pageManager, memberA);
      // generate an group
      // open sidebar
      // click archive chat
      // click archive tab
      // check chat is there
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
