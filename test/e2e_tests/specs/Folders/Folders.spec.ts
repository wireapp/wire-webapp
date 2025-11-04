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

import {test as base} from '@playwright/test';

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {addCreatedUser, tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginAndSetup} from 'test/e2e_tests/utils/userActions';

import {ApiManagerE2E} from '../../backend/apiManager.e2e';

type testcaseFixtures = {
  pageManager: PageManager;
  api: ApiManagerE2E;
  userBPageManager: PageManager;
};

export const test = base.extend<testcaseFixtures>({
  pageManager: async ({page}, use) => {
    await use(PageManager.from(page));
  },

  api: new ApiManagerE2E(),

  userBPageManager: async ({browser}, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const manager = PageManager.from(page);
    await use(manager);
    await context.close();
  },
});

export {expect} from '@playwright/test';

// Generating test users
let userA: User;
let userB: User;

test.describe('Folders', () => {
  test.beforeEach(async ({pageManager: userAPageManager, userBPageManager, api}, testInfo) => {
    userA = getUser();
    userB = getUser();

    // Step 1: Create and log in users
    await test.step('Preconditions: Creating test users via API', async () => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);

      await api.createPersonalUser(userB);
      addCreatedUser(userB);
    });

    await test.step('Preconditions: Signing in User A and User B', async () => {
      await Promise.all([loginAndSetup(userA, userAPageManager), loginAndSetup(userB, userBPageManager)]);
    });

    // Step 2: Connect users (Conditional)
    // Skipped if '@no-setup' is present, as these tests require a manual connection
    if (!testInfo.tags.includes('@no-setup')) {
      await test.step('Preconditions: Connecting users via API', async () => {
        await api.connectUsers(userA, userB);
      });
    }
  });

  test(
    'I want to move a 1:1 conversation to a new custom folder',
    {tag: ['@TC-545', '@regression']},
    async ({pageManager: userAPageManager}) => {
      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

      await test.step('User A moves conversation with User B to custom folder', async () => {
        await userAPages.conversationList().openContextMenu(userB.fullName);
        await userAPages.conversationList().moveConversationToFolderButton.click();
        await userAPages.conversationList().createNewFolderButton.click();
        await userAModals.createNewFolder().folderNameInput.fill('Custom-Folder');
        await userAModals.createNewFolder().clickAction();
      });

      test('I want to move a group conversation to a new custom folder', {tag: ['@TC-546', '@regression']});

      test('I want to move a 1:1 conversation to an existing custom folder', {tag: ['@TC-547', '@regression']});

      test('I want to move a group conversation to an existing custom folder', {tag: ['@TC-548', '@regression']});

      test('I want to see custom folder removed when last conversation is removed', {tag: ['@TC-553', '@regression']});

      test('I should not be able to create a custom folder without a name 0', {tag: ['@TC-560', '@regression']});

      test('I should not see any traces of a deleted custom folder', {tag: ['@TC-568', '@regression']});

      test('I want to see 1:1 and group conversations in Favorites folder', {tag: ['@TC-742', '@regression']});

      test.afterAll(async ({api}) => {
        await tearDownAll(api);
      });
    },
  );
});
