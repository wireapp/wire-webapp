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
import {test, expect, withLogin, withConnectedUser} from 'test/e2e_tests/test.fixtures';

import {OptionModal} from '../../pageManager/webapp/modals/option.modal';
import {createGroup} from '../../utils/userActions';

/* ===== Helper Functions ===== */
/**
 * Creates a custom folder and moves a conversation into it
 * @param pageManager PageManager instance
 * @param optionModal OptionModal instance for folder creation
 * @param conversationName Name of the conversation to move into the folder
 * @param folderName Name of the new folder to create
 */
async function createCustomFolder(
  pageManager: PageManager,
  optionModal: OptionModal,
  conversationName: string,
  folderName: string,
) {
  const pages = pageManager.webapp.pages;
  await pages.conversationList().openContextMenu(conversationName);
  await pages.conversationList().moveConversationButton.click();

  await pages.conversationList().createNewFolderButton.click();

  await optionModal.modal.getByPlaceholder('Folder Name').fill(folderName);
  await optionModal.clickAction();
}

/**
 * Moves a conversation to an existing custom folder
 * @param pageManager PageManager instance
 * @param conversationName Name of the conversation to move into existing folder
 * @param folderName Name of the folder to move to
 */
async function moveConversationToFolder(pageManager: PageManager, conversationName: string, folderName: string) {
  const pages = pageManager.webapp.pages;
  await pages.conversationList().openContextMenu(conversationName);
  await pages.conversationList().moveConversationButton.click();
  await pages.conversationList().getMoveToFolderButton(folderName).click();
}

/* ============================ */

test.describe('Folders', () => {
  let userA: User;
  let userB: User;
  let userAPageManagerInstance: PageManager;
  let userAPageManager: PageManager['webapp'];

  test.beforeEach(async ({createTeam, createPage}) => {
    const team = await createTeam('Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
    userAPageManagerInstance = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)));
    userAPageManager = userAPageManagerInstance.webapp;
  });

  test('I want to move a 1:1 conversation to a new custom folder', {tag: ['@TC-545', '@regression']}, async () => {
    const {pages: userAPages, modals: userAModals} = userAPageManager;

    const customFolderName = 'Custom-Folder';

    // Step 1: User A opens 1:1 conversation with User B
    await userAPages.conversationList().openConversation(userB.fullName);
    // Step 2: User A moves 1:1 conversation with User B into new custom folder
    await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), userB.fullName, customFolderName);
    // Step 3: 1:1 conversation with User B is in the custom folder
    const actualTitle = userAPages.conversationList().page.locator('[data-uie-name="conversation-list-header-title"]');

    await expect(actualTitle).toHaveText(customFolderName);
  });

  test('I want to move a group conversation to a new custom folder', {tag: ['@TC-546', '@regression']}, async () => {
    const {pages: userAPages, modals: userAModals} = userAPageManager;

    const customFolderName = 'Custom-Folder';
    const conversationName = 'Group Conversation with User A and User B';

    await createGroup(userAPages, conversationName, [userB]);

    // Step 1: User A opens group conversation with User B
    await userAPages.conversationList().openConversation(conversationName);
    // Step 2: User A moves group conversation with User B in new custom folder
    await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), conversationName, customFolderName);
    // Step 3: Group conversation with User B is in the custom folder
    const actualTitle = userAPages.conversationList().page.locator('[data-uie-name="conversation-list-header-title"]');

    await expect(actualTitle).toHaveText(customFolderName);
  });

  test(
    'I want to move a 1:1 conversation to an existing custom folder',
    {tag: ['@TC-547', '@regression']},
    async () => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager;

      const customFolderName = 'Custom-Folder';
      const conversationName = 'Group Conversation with User A and User B';

      await createGroup(userAPages, conversationName, [userB]);

      // Preconditions: Create a custom folder with group conversation
      await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), conversationName, customFolderName);
      await userAComponents.conversationSidebar().allConverationsButton.click();

      // Step 1: User A moves 1:1 conversation with User B into an existing custom folder
      await moveConversationToFolder(userAPageManagerInstance, userB.fullName, customFolderName);
      // Step 2: 1:1 conversation with User B is in the custom folder
      const actualTitle = userAPages
        .conversationList()
        .page.locator('[data-uie-name="conversation-list-header-title"]');

      await expect(actualTitle).toHaveText(customFolderName);
    },
  );

  test(
    'I want to move a group conversation to an existing custom folder',
    {tag: ['@TC-548', '@regression']},
    async () => {
      const {pages: userAPages, modals: userAModals, components: userAComponents} = userAPageManager;

      const customFolderName = 'Custom-Folder';
      const conversationName = 'Group Conversation with User A and User B';

      await createGroup(userAPages, conversationName, [userB]);

      // Preconditions: Create a custom folder with 1:1 conversation
      await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), userB.fullName, customFolderName);
      await userAComponents.conversationSidebar().allConverationsButton.click();

      // Step 1: User A moves group with User B into an existing custom folder
      await moveConversationToFolder(userAPageManagerInstance, conversationName, customFolderName);
      // Step 2: Group conversation with User B is in the custom folder
      const actualTitle = userAPages
        .conversationList()
        .page.locator('[data-uie-name="conversation-list-header-title"]');

      await expect(actualTitle).toHaveText(customFolderName);
    },
  );

  // TODO: Blocked due to Bug-Ticket [WPB-22266]
  test.skip(
    'I want to see custom folder removed when last conversation is removed',
    {tag: ['@TC-553', '@regression']},
    async () => {
      const {pages: userAPages, modals: userAModals} = userAPageManager;

      const customFolderName = 'Custom-Folder';

      // Preconditions: Conversation is in custom folder
      await userAPages.conversationList().openConversation(userB.fullName);
      await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), userB.fullName, customFolderName);

      // Step 1: User A clicks 'remove from custom folder' button
      await userAPages.conversationList().openContextMenu(userB.fullName);
      await userAPages.conversationList().getRemoveConversationFromFolderButton(customFolderName).click();
      // Step 2: The conversation list header is changed to 'All Conversations'
      const actualTitle = userAPages
        .conversationList()
        .page.locator('[data-uie-name="conversation-list-header-title"]');

      await expect(actualTitle).toHaveText('All Conversations');
      // Step 3: Custom Folder Name is no longer visible in the Move-To-Menu
      await expect(userAPages.conversationList().getMoveToFolderButton(customFolderName)).not.toBeVisible();
    },
  );

  test('I should not be able to create a custom folder without a name', {tag: ['@TC-560', '@regression']}, async () => {
    const {pages: userAPages, modals: userAModals} = userAPageManager;

    // Step 1: User A opens 1:1 conversation with User B
    await userAPages.conversationList().openConversation(userB.fullName);
    // Step 2: User A wants to move 1:1 conversation with User B into custom folder
    await userAPages.conversationList().openContextMenu(userB.fullName);
    await userAPages.conversationList().moveConversationButton.click();
    await userAPages.conversationList().createNewFolderButton.click();

    // Step 3: 'Create Folder Modal' should still be visible after click on create
    await expect(userAModals.optionModal().actionButton).toBeDisabled();
  });

  test('I should not see any traces of a deleted custom folder', {tag: ['@TC-568', '@regression']}, async () => {
    const {pages: userAPages, modals: userAModals} = userAPageManager;

    const customFolderName = 'Custom-Folder';

    // Preconditions: Conversation is in custom folder
    await userAPages.conversationList().openConversation(userB.fullName);
    await createCustomFolder(userAPageManagerInstance, userAModals.optionModal(), userB.fullName, customFolderName);

    // Step 1: User A removes conversation with User B from custom folder
    await userAPages.conversationList().openContextMenu(userB.fullName);
    await userAPages.conversationList().getRemoveConversationFromFolderButton(customFolderName).click();

    // Step 2: User A tries to move conversation with User B back into the folder, custom folder name should no longer be visible in the folder menu
    await userAPages.conversationList().openConversation(userB.fullName);
    await expect(userAPages.conversationList().getMoveToFolderButton(customFolderName)).not.toBeVisible();
  });
});
