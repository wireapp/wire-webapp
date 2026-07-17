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
import {withLogin, test, expect} from 'test/e2e_tests/test.fixtures';
import {connectWithUser, createGroup} from 'test/e2e_tests/utils/userActions';

/* ===== Helper Functions ===== */
/**
 * Creates a custom folder and moves a conversation into it
 * @param pageManager PageManager instance
 * @param conversationName Name of the conversation to move into the folder
 * @param folderName Name of the new folder to create
 */
async function createCustomFolder(pageManager: PageManager, conversationName: string, folderName: string) {
  const {pages, modals} = pageManager.webapp;
  const contextMenu = await pages.conversationList().getConversation(conversationName).openContextMenu();
  await contextMenu.moveToButton.click();
  await contextMenu.getByRole('button', {name: 'Create new folder'}).click();

  await modals.optionModal().modal.getByPlaceholder('Folder Name').fill(folderName);
  await modals.optionModal().clickAction();
}

/**
 * Moves a conversation to an existing custom folder
 * @param pageManager PageManager instance
 * @param conversationName Name of the conversation to move into existing folder
 * @param folderName Name of the folder to move to
 */
async function moveConversationToFolder(pageManager: PageManager, conversationName: string, folderName: string) {
  const pages = pageManager.webapp.pages;
  const contextMenu = await pages.conversationList().getConversation(conversationName).openContextMenu();
  await contextMenu.moveToButton.click();
  await contextMenu.getByRole('button', {name: folderName, exact: true}).click();
}

/* ============================ */

test.describe('Folders', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Team', {users: [userB]});
    userA = team.owner;
  });

  test(
    'I want to move a 1:1 conversation to a new custom folder',
    {tag: ['@TC-545', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const userAPages = userAPageManager.webapp.pages;

      const customFolderName = 'Custom-Folder';

      await test.step('User A moves 1:1 conversation with User B into new custom folder', async () => {
        await userAPages.conversationList().getConversation(userB.fullName).open();
        await createCustomFolder(userAPageManager, userB.fullName, customFolderName);
      });

      await test.step('1:1 conversation with User B is in the custom folder', async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText(customFolderName);
      });
    },
  );

  test(
    'I want to move a group conversation to a new custom folder',
    {tag: ['@TC-546', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const userAPages = userAPageManager.webapp.pages;

      const customFolderName = 'Custom-Folder';
      const conversationName = 'Group Conversation with User A and User B';

      await createGroup(userAPages, conversationName, [userB]);

      await test.step('User A moves group conversation with User B into new custom folder', async () => {
        await userAPages.conversationList().getConversation(conversationName).open();
        await createCustomFolder(userAPageManager, conversationName, customFolderName);
      });

      await test.step('Group conversation with User B is in the custom folder', async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText(customFolderName);
      });
    },
  );

  test(
    'I want to move a 1:1 conversation to an existing custom folder',
    {tag: ['@TC-547', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;

      const customFolderName = 'Custom-Folder';
      const conversationName = 'Group Conversation with User A and User B';

      await createGroup(userAPages, conversationName, [userB]);

      // Preconditions: Create a custom folder with group conversation
      await createCustomFolder(userAPageManager, conversationName, customFolderName);
      await userAComponents.conversationSidebar().allConversationsButton.click();

      await test.step('User A moves 1:1 conversation with User B into an existing custom folder', async () => {
        await moveConversationToFolder(userAPageManager, userB.fullName, customFolderName);
      });

      await test.step('1:1 conversation with User B is in the custom folder', async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText(customFolderName);
      });
    },
  );

  test(
    'I want to move a group conversation to an existing custom folder',
    {tag: ['@TC-548', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;

      const customFolderName = 'Custom-Folder';
      const conversationName = 'Group Conversation with User A and User B';

      // Preconditions: Create a custom folder with 1:1 conversation
      await createCustomFolder(userAPageManager, userB.fullName, customFolderName);
      await userAComponents.conversationSidebar().allConversationsButton.click();
      await createGroup(userAPages, conversationName, [userB]);

      await test.step('User A moves group with User B into an existing custom folder', async () => {
        await moveConversationToFolder(userAPageManager, conversationName, customFolderName);
      });

      await test.step('Group conversation with User B is in the custom folder', async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(userAComponents.conversationSidebar().folderList.getByText(customFolderName)).toBeVisible();
        await expect(actualTitle).toHaveText(customFolderName);
      });
    },
  );

  test(
    'I want to see custom folder removed when last conversation is removed',
    {tag: ['@TC-553', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;

      const customFolderName = 'Custom-Folder';

      // Preconditions: Conversation is in custom folder
      const conversation = await userAPages.conversationList().getConversation(userB.fullName).open();
      await createCustomFolder(userAPageManager, userB.fullName, customFolderName);
      await expect(userAComponents.conversationSidebar().folderList.getByText(customFolderName)).toBeVisible();

      await test.step("User A clicks 'remove from custom folder' button", async () => {
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.getByRole('button', {name: `Remove from "${customFolderName}"`}).click();
      });

      await test.step("The conversation list header is changed to 'All Conversations'", async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText('All conversations');
      });

      await test.step('Custom Folder Name is no longer visible in the Move-To-Menu', async () => {
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.moveToButton.click();
        await expect(contextMenu.getByRole('button', {name: customFolderName})).not.toBeVisible();
      });
    },
  );

  test(
    'I should not be able to create a custom folder without a name',
    {tag: ['@TC-560', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

      // Step 1: User A opens 1:1 conversation with User B
      const conversation = await userAPages.conversationList().getConversation(userB.fullName).open();
      // Step 2: User A wants to move 1:1 conversation with User B into custom folder
      const contextMenu = await conversation.openContextMenu();
      await contextMenu.moveToButton.click();
      await contextMenu.getByRole('button', {name: 'Create new folder'}).click();

      // Step 3: 'Create Folder Modal' should still be visible after click on create
      await expect(userAModals.optionModal().actionButton).toBeDisabled();
    },
  );

  test(
    'I should not see any traces of a deleted custom folder',
    {tag: ['@TC-568', '@regression']},
    async ({createPage}) => {
      const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
      await connectWithUser(userAPageManager, userB);
      const userAPages = userAPageManager.webapp.pages;

      const customFolderName = 'Custom-Folder';

      // Preconditions: Conversation is in custom folder
      const conversation = await userAPages.conversationList().getConversation(userB.fullName).open();
      await createCustomFolder(userAPageManager, userB.fullName, customFolderName);

      await test.step('User A removes conversation with User B from custom folder', async () => {
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.getByRole('button', {name: `Remove from "${customFolderName}"`}).click();
      });

      await test.step('User A tries to move conversation with User B back into the folder, custom folder name should no longer be visible in the folder menu', async () => {
        await conversation.open();
        const contextMenu = await conversation.openContextMenu();
        await contextMenu.moveToButton.click();
        await expect(contextMenu.getByRole('button', {name: customFolderName})).not.toBeVisible();
      });
    },
  );

  test(
    'I want to see 1:1 and group conversations in Favorites folder',
    {tag: ['@TC-742', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      const groupName = 'Group Name';

      // Preconditions: User A and User B are in a group conversation created by User B
      await createGroup(userBPages, groupName, [userA]);

      await test.step('User A adds group conversation with User B to Favorites', async () => {
        const contextMenu = await userAPages.conversationList().getConversation(groupName).openContextMenu();
        await contextMenu.addToFavoritesButton.click();

        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText('Favorites');

        await userAComponents.conversationSidebar().clickAllConversationsButton();
      });

      await test.step('User A adds 1:1 with User B to Favorites', async () => {
        const contextMenu = await userAPages.conversationList().getConversation(userB.fullName).openContextMenu();
        await contextMenu.addToFavoritesButton.click();

        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText('Favorites');

        await userAComponents.conversationSidebar().clickAllConversationsButton();
        await userAPages.conversationList().getConversation(groupName).open();
      });

      await test.step('User B sends message in 1:1 conversation with User A', async () => {
        await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();
        await userBPages.conversation().sendMessage('Direct');
      });

      await test.step('User A sees notification in Favorites and opens it', async () => {
        await expect(userAComponents.conversationSidebar().favoritesButton.getByTestId('unread-badge')).toBeVisible();
        await userAComponents.conversationSidebar().favoritesButton.click();
        await expect(userAPages.conversationList().getConversation(userB.fullName).unreadIndicator).toBeVisible();
        await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
        await expect(userAPages.conversation().getMessage({content: 'Direct', sender: userB})).toBeVisible();
      });

      await test.step('User B sends message in group conversation with User A', async () => {
        await userBPages.conversationList().getConversation(groupName).open();
        await userBPages.conversation().sendMessage('Group');
      });

      await test.step('User A sees notification in Favorites and opens it', async () => {
        await expect(userAComponents.conversationSidebar().favoritesButton.getByTestId('unread-badge')).toBeVisible();
        await expect(userAPages.conversationList().getConversation(groupName).unreadIndicator).toBeVisible();
        await userAPages.conversationList().getConversation(groupName).open();
        await expect(userAPages.conversation().getMessage({content: 'Group', sender: userB})).toBeVisible();
      });

      await test.step('User B removes User A from group conversation', async () => {
        await userBPages.conversationList().getConversation(groupName).open();
        await userBPages.conversation().toggleGroupInformation();

        await expect(userBPages.conversationDetails().groupMembers.filter({hasText: userA.fullName})).toBeVisible();

        await userBPages.conversationDetails().getParticipant(userA.fullName).openDetails();
        await userBPages.participantDetails().removeFromGroup();
      });

      await test.step('User A still sees group conversation in Favorites', async () => {
        const actualTitle = userAPages.conversationList().conversationListHeaderTitle;
        await expect(actualTitle).toHaveText('Favorites');
        await expect(userAPages.conversationList().getConversation(groupName)).toBeVisible();
      });

      await test.step('User A removes 1:1 and group conversation with User B from Favorites', async () => {
        const contextMenuDirectConversation = await userAPages
          .conversationList()
          .getConversation(userB.fullName, {protocol: 'mls'})
          .openContextMenu();
        await contextMenuDirectConversation.getByRole('button', {name: 'Remove from favorites'}).click();

        const contextMenuGroupConversation = await userAPages
          .conversationList()
          .getConversation(groupName)
          .openContextMenu();
        await contextMenuGroupConversation.getByRole('button', {name: 'Remove from favorites'}).click();
      });

      await test.step('User A sees empty Favorites folder', async () => {
        await expect(userAPages.conversationList().getConversation(userB.fullName)).not.toBeVisible();
        await expect(userAPages.conversationList().getConversation(groupName)).not.toBeVisible();
      });

      await test.step('User A sees 1:1 and group conversation with User B in All Conversation View', async () => {
        await userAComponents.conversationSidebar().clickAllConversationsButton();
        await expect(userAPages.conversationList().getConversation(userB.fullName)).toBeVisible();
        await expect(userAPages.conversationList().getConversation(groupName)).toBeVisible();
      });
    },
  );
});
