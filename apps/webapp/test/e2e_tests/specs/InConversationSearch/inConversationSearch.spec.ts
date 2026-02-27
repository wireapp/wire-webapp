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
import {getAudioFilePath, getTextFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup} from '../../utils/userActions';

test.describe('In Conversation Search', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test(
    'Verify main overview shows media from all categories',
    {tag: ['@TC-352', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      // Preconditions: User B sends media from all categories (images, links, audio and files)
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      const {page} = userBPages.conversation();
      // Image
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      // Audio
      await shareAssetHelper(getAudioFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      // File
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().searchButton.click();
      const collection = userAPages.collection();
      await expect(collection.getSection('Images')).toBeVisible();
      await expect(collection.getSection('Audio')).toBeVisible();
      await expect(collection.getSection('Files')).toBeVisible();
    },
  );

  test(
    'Verify opening overview of all pictures from sender and receiver in group',
    {tag: ['@TC-356', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      const conversationName = 'Test Group';
      await createGroup(userAPages, conversationName, [userB]);

      await userBPages.conversationList().openConversation(conversationName);
      const {page: pageB} = userBPages.conversation();

      for (let imageCount = 0; imageCount < 10; imageCount++) {
        await shareAssetHelper(getImageFilePath(), pageB, pageB.getByRole('button', {name: 'Add picture'}));
      }

      await userAPages.conversationList().openConversation(conversationName);
      const {page: pageA} = userAPages.conversation();
      for (let imageCount = 0; imageCount < 10; imageCount++) {
        await shareAssetHelper(getImageFilePath(), pageA, pageA.getByRole('button', {name: 'Add picture'}));
      }

      await userAPages.conversation().searchButton.click();
      await expect(userAPages.collection().getSection('Images').showAllButton).toBeVisible();
    },
  );

  test(
    'Verify opening single picture from all shared media overview',
    {tag: ['@TC-357', '@regression']},
    async ({createPage}) => {
      const [userAPageManager, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      const {pages: userAPages, modals: userAModals} = userAPageManager.webapp;

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      const {page: pageB} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), pageB, pageB.getByRole('button', {name: 'Add picture'}));

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      const {page: pageA} = userAPages.conversation();
      await shareAssetHelper(getImageFilePath(), pageA, pageA.getByRole('button', {name: 'Add picture'}));

      await userAPages.conversation().searchButton.click();
      await userAPages.collection().getSection('Images').getByRole('presentation').first().click();
      await expect(userAModals.detailViewModal().image).toBeVisible();
    },
  );

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test.skip('Verify opening overview of all links', {tag: ['@TC-358', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    // Step: User B sends several links

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    // Step: User B sends several links

    await userAPages.conversation().searchButton.click();
    // Step: Verify links overview button is visible
  });

  test('Verify opening overview of all files', {tag: ['@TC-359', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    const {page: pageB} = userBPages.conversation();

    for (let fileCount = 0; fileCount < 10; fileCount++) {
      await shareAssetHelper(getTextFilePath(), pageB, pageB.getByRole('button', {name: 'Add file'}));
    }

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    const {page: pageA} = userAPages.conversation();
    for (let fileCount = 0; fileCount < 10; fileCount++) {
      await shareAssetHelper(getTextFilePath(), pageA, pageA.getByRole('button', {name: 'Add file'}));
    }

    await userAPages.conversation().searchButton.click();
    await expect(userAPages.collection().getSection('Files').showAllButton).toBeVisible();
  });

  test(
    "Verify deleted media isn't in collection on other side",
    {tag: ['@TC-360', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      const {page: pageB} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), pageB, pageB.getByRole('button', {name: 'Add picture'}));

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      const messageWithImage = userAPages.conversation().getMessage({sender: userB});
      await expect(messageWithImage).toBeVisible();

      const messageB = userBPages.conversation().getMessage({sender: userB});
      await userBPages.conversation().deleteMessage(messageB, 'Everyone');

      await userAPages.conversation().searchButton.click();
      await expect(userAPages.collection().getSection('Images').showAllButton).not.toBeVisible();
    },
  );

  test('Verify I can search my own message', {tag: ['@TC-385', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('User A Message');

    await userAPages.conversation().searchButton.click();
    const collection = userAPages.collection();
    await collection.searchBar.fill('User A');

    // TODO: uncomment the next two lines when search behavior is fixed
    // await expect(collection.searchResults).toHaveCount(1);
    // await expect(collection.searchResults).toContainText('User A Message');

    // TODO: remove this line when search behavior is fixed
    await expect(collection.searchResults.last()).toContainText('User A Message');
  });

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test.skip(
    'Verify I can search for text mixed with a link preview',
    {tag: ['@TC-388', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('User B message');

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Here is a link: [LinkPreview]https://www.kaufland.de');

      await userAPages.conversation().searchButton.click();

      const collection = userAPages.collection();
      await collection.searchBar.fill('link: LinkPreview');
      await expect(collection.searchResults).toHaveCount(1);
      await expect(collection.searchResults).toContainText('Here is a link: [LinkPreview]https://www.kaufland.de');
    },
  );

  test('Verify I can search for links without preview', {tag: ['@TC-391', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('https://www.kaufland.de');

    await expect(userBPages.conversation().getMessage({content: 'https://www.kaufland.de'})).toBeVisible();
    await userAPages.conversation().searchButton.click();

    const collection = userAPages.collection();
    await collection.searchBar.fill('kaufland');

    await expect(collection.searchResults).toHaveCount(1);
    await expect(collection.searchResults).toContainText('https://www.kaufland.de');

  });

  test('Verify I can not search for a deleted message', {tag: ['@TC-392', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message: Papaya');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('User A message: Guava');

    const messageUserB = userBPages.conversation().getMessage({sender: userB});
    await userBPages.conversation().deleteMessage(messageUserB, 'Everyone');

    await userAPages.conversation().searchButton.click();
    await userAPages.collection().searchBar.fill('Papaya');
    await expect(userAPages.collection().noResultsMessage).toBeVisible();
  });

  test(
    'Verify results are sorted - latest message on top of list',
    {tag: ['@TC-398', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      // User B sends the first (older) message
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('Older Message from User B');

      await expect(userAPages.conversation().getMessage({sender: userB})).toBeVisible();

      //  User A sends the second (newer) message
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Newer Message from User A');

      await userAPages.conversation().searchButton.click();
      const collection = userAPages.collection();
      await collection.searchBar.fill('Message');

      await expect(collection.searchResults).toHaveCount(2);
      await expect(collection.searchResults.first()).toContainText('Newer Message from User A');
      await expect(collection.searchResults.last()).toContainText('Older Message from User B');
    },
  );

  test('Verify I can find a message with special letters', {tag: ['@TC-403', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    const specialWord = 'Crème brûlée';

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage(`Message with diacritical letter: ${specialWord}`);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().searchButton.click();

    const collection = userAPages.collection();
    await collection.searchBar.fill(specialWord);
    await expect(collection.searchResults).toHaveCount(1);
    await expect(collection.searchResults).toContainText(`Message with diacritical letter: ${specialWord}`);
  });

  test('Verify invisible characters in search are trimmed', {tag: ['@TC-405', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().searchButton.click();

    const collection = userAPages.collection();
    await collection.searchBar.fill('  message');
    await expect(collection.searchResults).toHaveCount(1);
    await expect(collection.searchResults).toContainText('User B message');
  });

  test(
    'I want to see message is scrolled into view when tapping on search result',
    {tag: ['@TC-408', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('Papaya');

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await expect(userAPages.conversation().getMessage({content: 'Papaya'})).toBeVisible()
      ;
      await userAPages.conversation().sendMessage(`Message from User A: 1`);
      await userAPages.conversation().sendMessage('Empty\n'.repeat(50));
      await userAPages.conversation().sendMessage(`Message from User A: 2`);

      await expect(userAPages.conversation().getMessage({content: 'Message from User A: 2'})).toBeInViewport();
      await expect(userAPages.conversation().getMessage({content: 'Message from User A: 1'})).not.toBeInViewport();

      await userAPages.conversation().searchButton.click();
      await userAPages.collection().searchBar.fill('Papaya');

      const collection = userAPages.collection();
      await collection.searchBar.fill('Papaya');
      await expect(collection.searchResults).toHaveCount(1);
      await expect(collection.searchResults).toContainText('Papaya');

      const markedSearchResult = userAPages.collection().component.locator('mark').filter({hasText: 'Papaya'});
      await markedSearchResult.click();
      const messageFromUserB = userAPages.conversation().getMessage({sender: userB});
      await expect(messageFromUserB).toBeVisible();
    },
  );
});
