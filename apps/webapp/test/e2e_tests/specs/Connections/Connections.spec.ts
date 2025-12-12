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
import {completeLogin} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

test.describe('Connections', () => {
  const members = Array.from({length: 2}, () => getUser());
  const [memberA, memberB] = members;

  test.beforeAll(async ({api}) => {
    await api.createPersonalUser(memberA);
    await api.createPersonalUser(memberB);
  });

  test(
    'Verify 1on1 conversation is not created on the second end after you ignore connection request',
    {tag: ['@TC-365', '@TC-369', '@TC-370', '@TC-371', '@regression']},
    async ({pageManager: memberPageManagerA, browser}) => {
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManagerB = PageManager.from(memberPage);

      const {pages, components, modals} = memberPageManagerA.webapp;
      const {pages: pagesB} = memberPageManagerB.webapp;

      await Promise.all([completeLogin(memberPageManagerA, memberA), completeLogin(memberPageManagerB, memberB)]);

      await components.conversationSidebar().clickConnectButton();
      await pages.startUI().selectUser(memberB.username);
      await modals.userProfile().clickConnectButton();
      await pagesB.conversationList().openPendingConnectionRequest();
      await pagesB.conversation().clickItemPendingRequest();
      await pagesB.conversation().clickIgnoreButton();

      await expect(pagesB.conversation().itemPendingRequest).toHaveCount(0);

      await test.step('I want to cancel a pending request from conversation list', async () => {
        await pages.conversation().clickCancelRequest();
        await modals.cancelRequest().clickAction();
      });

      await test.step('I want to archive a pending request from conversation list', async () => {
        await components.conversationSidebar().clickConnectButton();
        await pages.startUI().selectUser(memberB.username);
        await modals.userProfile().clickConnectButton();
        await pagesB.conversationList().openPendingConnectionRequest();
        await pagesB.conversation().clickItemPendingRequest();
        await pages.conversationList().clickConversationOptions(memberB.fullName);
        await pages.conversationList().archiveConversation();
        await components.conversationSidebar().clickArchive();

        expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();
      });
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
