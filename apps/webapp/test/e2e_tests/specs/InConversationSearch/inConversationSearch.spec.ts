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
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test(
    'Verify main overview shows media from all categories',
    {tag: ['@TC-352', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      // Preconditions: User B sends media from all categories (images, links, audio and files)
      await userBPages.conversationList().openConversation(userA.fullName);
      const {page} = userBPages.conversation();
      // Image
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      // Audio
      await shareAssetHelper(getAudioFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      // File
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));

      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().searchButton.click();
      const collection = userAPages.collection();
      await expect(collection.imagesSection).toBeVisible();
      await expect(collection.audioSection).toBeVisible();
      await expect(collection.filesSection).toBeVisible();
    },
  );

  test(
    'Verify opening overview of all pictures from sender and receiver in group',
    {tag: ['@TC-356', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      const conversationName = 'Test Group';
      await createGroup(userAPages, conversationName, [userB]);

      await userBPages.conversationList().openConversation(conversationName);
      let {page} = userBPages.conversation();

      for (let i = 0; i < 10; i++) {
        await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      }

      await userAPages.conversationList().openConversation(conversationName);
      ({page} = userAPages.conversation());
      for (let i = 0; i < 10; i++) {
        await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      }

      await userAPages.conversation().searchButton.click();
      await expect(userAPages.collection().overviewImagesButton).toBeVisible();
    },
  );

  test(
    'Verify opening single picture from all shared media overview',
    {tag: ['@TC-357', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      let {page} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      ({page} = userAPages.conversation());
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));

      await userAPages.conversation().searchButton.click();
      await userAPages.collection().page.getByRole('presentation').click();
      await expect(userAPages.collection().page.getByRole('presentation')).toBeVisible();
    },
  );

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test.skip('Verify opening overview of all links', {tag: ['@TC-358', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
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
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    let {page} = userBPages.conversation();

    for (let i = 0; i < 10; i++) {
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));
    }

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    ({page} = userAPages.conversation());
    for (let i = 0; i < 10; i++) {
      await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));
    }

    await userAPages.conversation().searchButton.click();
    await expect(userAPages.collection().overviewFilesButton).toBeVisible();
  });

  test(
    "Verify deleted media isn't in collection on other side",
    {tag: ['@TC-360', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      let {page} = userBPages.conversation();
      await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));

      const messageWithImage = userAPages.conversation().getMessage({sender: userB});
      await expect(messageWithImage).toBeVisible();

      const messageB = userBPages.conversation().getMessage({sender: userB});
      await userBPages.conversation().deleteMessage(messageB, 'Everyone');

      await userAPages.conversation().searchButton.click();
      await expect(userAPages.collection().overviewImagesButton).not.toBeVisible();
    },
  );

  test('Verify I can search my own message', {tag: ['@TC-385', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('User A Message');

    await userAPages.conversation().searchButton.click();
    await userAPages.collection().fullSearchBar.fill('User A');
    await expect(userAPages.collection().getMarkedSearchResult('User A')).toBeVisible();
  });

  // TODO: links are not shown to the collection - this part of the test is blocked by [WPB-22484]
  test.skip(
    'Verify I can search for text mixed with a link preview',
    {tag: ['@TC-388', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('User B message');

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Here is a link: [LinkPreview]https://www.kaufland.de');

      await userAPages.conversation().searchButton.click();
      await userAPages.collection().fullSearchBar.fill('link: LinkPreview');
      await expect(userAPages.collection().getMarkedSearchResult('link: linkPreview')).toBeVisible();
    },
  );

  test('Verify I can search for links without preview', {tag: ['@TC-391', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('https://www.kaufland.de');

    await userAPages.conversation().searchButton.click();
    await userAPages.collection().fullSearchBar.fill('kaufland');
    await expect(userAPages.collection().getMarkedSearchResult('kaufland').first()).toBeVisible();
  });

  test('Verify I can not search for a deleted message', {tag: ['@TC-392', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage('User B message: Papaya');

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessage('User A message: Guava');

    const messageUserB = userBPages.conversation().getMessage({sender: userB});
    await userBPages.conversation().deleteMessage(messageUserB, 'Everyone');

    await userAPages.conversation().searchButton.click();
    await userAPages.collection().fullSearchBar.fill('Papaya');
    await expect(userAPages.collection().noResultsMessage).toBeVisible();
  });

  test(
    'Verify results are sorted - latest message on top of list',
    {tag: ['@TC-398', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      // User B sends the first (older) message
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('Older Message from User B');

      //  User A sends the second (newer) message
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Newer Message from User A');

      await userAPages.conversation().searchButton.click();
      const collection = userAPages.collection();
      await collection.fullSearchBar.fill('Message');

      await expect(collection.resultTexts).toHaveCount(2);

      const results = await collection.getAllResultTexts();
      expect(results[0]).toContain('Newer Message from User A');
      expect(results[1]).toContain('Older Message from User B');
    },
  );

  test('Verify I can find a message with special letters', {tag: ['@TC-403', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    const specialWord = 'Crème brûlée';

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage(`Message with diacritical letter: ${specialWord}`);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().searchButton.click();

    await userAPages.collection().fullSearchBar.fill(specialWord);

    await expect(userAPages.collection().getMarkedSearchResult(specialWord)).toBeVisible();
  });

  test('Verify invisible characters in search are trimmed', {tag: ['@TC-405', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userBPages.conversation().sendMessage(`User B message`);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().searchButton.click();

    await userAPages.collection().fullSearchBar.fill('  message');

    await expect(userAPages.collection().getMarkedSearchResult('message')).toBeVisible();
  });

  test(
    'I want to see message is scrolled into view when tapping on search result',
    {tag: ['@TC-408', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversation().sendMessage('Papaya');

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      for (let i = 0; i < 20; i++) {
        await userAPages.conversation().sendMessage(`Message from User A: ${i}`);
      }

      await expect(userAPages.conversation().getMessage({content: 'Message from User A: 19'})).toBeVisible();

      await userAPages.conversation().searchButton.click();
      await userAPages.collection().fullSearchBar.fill('Papaya');
      await userAPages.collection().getMarkedSearchResult('Papaya').click();
      const messageFromUserB = userAPages.conversation().getMessage({sender: userB});
      await expect(messageFromUserB).toBeVisible();
    },
  );
});
