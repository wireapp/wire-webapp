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
import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';

test.describe('Markdown', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test('I want to write a bold message', {tag: ['@TC-1313', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendTypedMessage('**Bold Message from User A**');

    for (const pages of [userAPages, userBPages]) {
      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('strong')).toHaveText('Bold Message from User A');
    }
  });

  test('I want to write a emphasized message', {tag: ['@TC-1314', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendTypedMessage('*Emphasized message from User A*');

    for (const pages of [userAPages, userBPages]) {
      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('emphasis')).toHaveText('Emphasized message from User A');
    }
  });

  test('I want to write a code message', {tag: ['@TC-1315', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendTypedMessage('`Code message from User A`');

    for (const pages of [userAPages, userBPages]) {
      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('code')).toContainText('Code message from User A');
    }
  });

  test('I want to write a long code message', {tag: ['@TC-1316', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);
    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

    const longCodeMessage = '```\nconst a = 5;\nconst b = 10;\nconsole.log(a + b);\n```';
    await userAPages.conversation().sendMessage(longCodeMessage);

    for (const pages of [userAPages, userBPages]) {
      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('code')).toContainText('const a = 5; const b = 10;');
    }
  });

  test('I want to write a mixed markdown message', {tag: ['@TC-1317', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendTypedMessage('**Bold**, *Italic* and `Code`');

    for (const pages of [userAPages, userBPages]) {
      const message = pages.conversation().getMessage({sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('strong')).toContainText('Bold');
      await expect(message.getByRole('emphasis')).toContainText('Italic');
      await expect(message.getByRole('code')).toContainText('Code');
    }
  });

  test('I want to edit a markdown message', {tag: ['@TC-1319', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendTypedMessage('Start **Bold** Message');

    const sentMessageA = userAPages.conversation().getMessage({sender: userA});
    const sentMessageB = userBPages.conversation().getMessage({sender: userA});

    await expect(sentMessageA.getByRole('strong')).toHaveText('Bold');
    await expect(sentMessageB.getByRole('strong')).toHaveText('Bold');

    await userAPages.conversation().editMessage(sentMessageA);
    await expect(userAPages.conversation().messageInput).toContainText('Start Bold Message');

    await userAPages.conversation().sendTypedMessage('Edited to *Italic* Message');

    for (const message of [sentMessageA, sentMessageB]) {
      await expect(message).toContainText('Edited to Italic Message');
      await expect(message.getByRole('emphasis')).toHaveText('Italic');
      await expect(message.getByRole('strong')).not.toBeVisible();
    }
  });

  test(
    'I want to write a url with markdown (Mixed with text)',
    {tag: ['@TC-1319', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const linkText = 'Wire Website';
      const url = 'https://wire.com';
      await userAPages.conversation().sendTypedMessage(`Visit [${linkText}](${url}) for book a demo`);

      for (const pages of [userAPages, userBPages]) {
        const message = pages.conversation().getMessage({sender: userA});
        await expect(message).toBeVisible();
        await expect(message).toContainText(`Visit ${linkText} for book a demo`);

        const linkLocator = message.getByRole('link', {name: linkText});
        await expect(linkLocator).toHaveAttribute('href', url);
      }
    },
  );
});
