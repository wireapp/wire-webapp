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
import {setupBasicTestScenario, startUpApp} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';

import {test} from '../../test.fixtures';

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
    async ({pageManager, browser}) => {
      const {components, modals} = pageManager.webapp;
      await startUpApp(pageManager, memberA);
      // starts an 1o1
      await components.conversationSidebar().clickConnectButton();
      await components.contactList().clickOnContact(memberB.fullName);
      await modals.userProfile().clickStartConversation();
      // right click archive
      // click archive
      // check chat is there
      // rightclick unarchive
      // check if its in the all tab
    },
  );

  test(
    'Verify the conversation is not unarchived when there are new messages in this conversation',
    {tag: ['@TC-99', '@regression']},
    async ({pageManager, browser}) => {
      await startUpApp(pageManager, memberA);
      // starts an 1o1
      // write an message from user b
      // click archive
      // check chat is there
      // rightclick unarchive
      // check if its in the all tab
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
