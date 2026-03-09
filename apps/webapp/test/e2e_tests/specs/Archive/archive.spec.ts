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
import {connectWithUser, createGroup} from 'test/e2e_tests/utils/userActions';

import {expect, test, withConnectedUser, withLogin} from '../../test.fixtures';
import {Locator} from 'playwright/test';

test.describe('Archive', () => {
  let memberA: User;
  let memberB: User;

  test.beforeEach(async ({createUser, createTeam}) => {
    memberA = await createUser();
    ({owner: memberB} = await createTeam('Test Team', {users: [memberA]}));
  });

  test(
    'I want to archive and unarchive conversation via conversation list',
    {tag: ['@TC-97', '@regression']},
    async ({createPage}) => {
      const page = await createPage(withLogin(memberA), withConnectedUser(memberB));
      const {pages, components} = PageManager.from(page).webapp;

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().archiveConversation();
      await expect(pages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();

      await components.conversationSidebar().clickArchive();
      await expect(pages.conversationList().getConversationLocator(memberB.fullName)).toBeVisible();

      await pages.conversationList().clickConversationOptions(memberB.fullName);
      await pages.conversationList().unarchiveConversation();
      await expect(pages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();

      await components.conversationSidebar().clickAllConversationsButton();
      await expect(pages.conversationList().getConversationLocator(memberB.fullName)).toBeVisible();
    },
  );

  test(
    'Verify the conversation is not unarchived when there are new messages in this conversation',
    {tag: ['@TC-99', '@regression']},
    async ({createPage}) => {
      const [memberAPages, memberBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(memberA), withConnectedUser(memberB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(memberB))).then(pm => pm.webapp.pages),
      ]);

      await memberAPages.conversationList().openConversation(memberB.fullName, {protocol: 'mls'});
      await memberBPages.conversationList().openConversation(memberA.fullName, {protocol: 'mls'});

      await test.step('MemberA archives conversation with memberB', async () => {
        await memberAPages.conversationList().clickConversationOptions(memberB.fullName);
        await memberAPages.conversationList().archiveConversation();
      });

      await test.step('MemberB sends message in archived conversation', async () => {
        await memberBPages.conversation().sendMessage('Test message');
        await expect(memberAPages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();
      });

      await test.step('MemberB pings in archived conversation', async () => {
        await memberBPages.conversation().sendPing();
        await expect(memberAPages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();
      });
    },
  );

  (
    [
      {title: 'Verify the conversation is not unarchived there are new calls in this conversation', tag: '@TC-100'},
      {title: 'Verify that calling an archived muted conversation will not unarchive it', tag: '@TC-103'},
    ] as const
  ).forEach(({title, tag}) => {
    test(title, {tag: [tag, '@regression']}, async ({createPage}) => {
      const page = await createPage(withLogin(memberA), withConnectedUser(memberB));
      const {pages, components} = PageManager.from(page).webapp;

      await pages.conversationList().openConversation(memberB.fullName);

      if (tag === '@TC-103') {
        await test.step('User mutes the conversation', async () => {
          await pages.conversationList().clickConversationOptions(memberB.fullName);
          await pages.conversationList().setNotifications('Nothing');
        });
      }

      await test.step('User archives the conversation', async () => {
        await pages.conversationList().clickConversationOptions(memberB.fullName);
        await pages.conversationList().archiveConversation();
        await expect(pages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();
      });

      await test.step('User switches to archived conversations and sees it there', async () => {
        await components.conversationSidebar().archiveButton.click();
        await expect(pages.conversationList().getConversationLocator(memberB.fullName)).toBeVisible();
      });

      await test.step('User starts a call in the archived conversation', async () => {
        await pages.conversationList().openConversation(memberB.fullName);
        await pages.conversation().startCall();
      });

      await test.step('The conversation should still not be shown within all conversations', async () => {
        await components.conversationSidebar().allConverationsButton.click();
        await expect(pages.conversationList().getConversationLocator(memberB.fullName)).not.toBeVisible();
      });
    });
  });

  [{type: 'group', tag: '@TC-104'} as const, {type: '1on1', tag: '@TC-105'} as const].forEach(({type, tag}) => {
    test(
      `I want to archive the ${type} conversation from conversation details`,
      {tag: [tag, '@regression']},
      async ({createPage}) => {
        const pageManager = PageManager.from(await createPage(withLogin(memberA)));
        const {pages, components} = pageManager.webapp;

        let conversation: Locator;
        if (tag === '@TC-104') {
          await createGroup(pages, 'Test Group', [memberB]);
          conversation = pages.conversationList().getConversationLocator('Test Group');
        } else {
          await connectWithUser(pageManager, memberB);
          conversation = pages.conversationList().getConversationLocator(memberB.fullName);
        }

        await pages.conversation().conversationInfoButton.click();
        await pages.conversationDetails().archiveButton.click();
        await expect(conversation).not.toBeVisible();

        await components.conversationSidebar().archiveButton.click();
        await expect(conversation).toBeVisible();
      },
    );
  });
});
