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

import {test, expect, withLogin, withConnectionRequest} from '../../test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Connections', () => {
  let memberA: User;
  let memberB: User;

  test.beforeEach(async ({createUser}) => {
    [memberA, memberB] = await Promise.all([createUser(), createUser()]);
  });

  test(
    'Verify 1on1 conversation is not created on the second end after you ignore connection request',
    {tag: ['@TC-365', '@regression']},
    async ({createPage}) => {
      const [memberBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(memberB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(memberA), withConnectionRequest(memberB))),
      ]);

      await memberBPages.conversationList().pendingConnectionRequest.click();
      await memberBPages.conversation().clickIgnoreButton();

      await expect(memberBPages.conversation().itemPendingRequest).not.toBeVisible();
    },
  );

  test(
    'Verify sending a connection request to user from conversation view',
    {tag: ['@TC-369', '@regression']},
    async ({createPage, createUser}) => {
      const memberC = await createUser();
      const [memberAPages, memberBPages, memberCPages] = await Promise.all([
        PageManager.from(
          createPage(withLogin(memberA), withConnectionRequest(memberB), withConnectionRequest(memberC)),
        ).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(memberB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(memberC))).then(pm => pm.webapp.pages),
      ]);

      await test.step('B & C accept connection requests from A', async () => {
        for (const pages of [memberBPages, memberCPages]) {
          await pages.conversationList().pendingConnectionRequest.click();
          await pages.connectRequest().connectButton.click();
        }
      });

      await test.step('A creates a group with B & C', async () => {
        await createGroup(memberAPages, 'Group', [memberB, memberC]);
      });

      await test.step('B sends a connection request to C via the group conversation', async () => {
        await memberBPages.conversationList().openConversation('Group');
        await memberBPages.conversation().conversationInfoButton.click();
        await memberBPages.conversationDetails().openParticipantDetails(memberC.fullName);
        await memberBPages.participantDetails().sendConnectRequest();
      });

      await test.step('C sees the connection request from B', async () => {
        await expect(memberCPages.conversationList().pendingConnectionRequest).toBeVisible();
      });
    },
  );

  test(
    'I want to cancel a pending request from conversation list',
    {tag: ['@TC-370', '@regression']},
    async ({createPage}) => {
      const [memberBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(memberB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(memberA), withConnectionRequest(memberB))).then(pm => pm.webapp.pages),
      ]);

      await memberBPages.conversationList().pendingConnectionRequest.click();
      await memberBPages.conversation().ignoreButton.click();

      await expect(memberBPages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();
    },
  );

  test(
    'I want to archive a pending request from conversation list',
    {tag: ['@TC-371', '@regression']},
    async ({createPage}) => {
      const {pages} = PageManager.from(await createPage(withLogin(memberA), withConnectionRequest(memberB))).webapp;

      await pages.conversationList().getConversationLocator(memberB.fullName).openContextMenu();
      await pages.conversationList().archiveConversation();

      await expect(pages.conversationList().getConversationLocator(memberB.fullName)).toBeVisible();
    },
  );
});
