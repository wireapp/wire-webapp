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
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';

type Pages = PageManager['webapp']['pages'];

test.describe('Reactions', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  const likeCases = [
    {
      tc: '@TC-1527',
      title: 'link preview in 1:1',
      sendFromUserB: async (userBPages: Pages) => {
        const link = 'https://www.kaufland.de/';
        await userBPages.conversation().sendMessage(link);
      },
    },
    {
      tc: '@TC-1528',
      title: 'picture',
      sendFromUserB: async (userBPages: Pages) => {
        const {page} = userBPages.conversation();
        await shareAssetHelper(getImageFilePath(), page, page.getByRole('button', {name: 'Add picture'}));
      },
    },
    {
      tc: '@TC-1529',
      title: 'audio message',
      sendFromUserB: async (userBPages: Pages) => {
        const {page} = userBPages.conversation();
        await shareAssetHelper(getAudioFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      tc: '@TC-1530',
      title: 'video message',
      sendFromUserB: async (userBPages: Pages) => {
        const {page} = userBPages.conversation();
        await shareAssetHelper(getVideoFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      tc: '@TC-1532',
      title: 'shared file',
      sendFromUserB: async (userBPages: Pages) => {
        const {page} = userBPages.conversation();
        await shareAssetHelper(getTextFilePath(), page, page.getByRole('button', {name: 'Add file'}));
      },
    },
    {
      tc: '@TC-1536',
      title: 'message in 1:1',
      sendFromUserB: async (userBPages: Pages) => {
        await userBPages.conversation().sendMessage('Message from User B');
      },
    },
  ];

  for (const c of likeCases) {
    test(`Verify liking someone's ${c.title}`, {tag: [c.tc, '@regression']}, async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await c.sendFromUserB(userBPages);

      const messageFromUserB = userAPages.conversation().getMessage({sender: userB});
      await expect(messageFromUserB).toBeVisible();

      await userAPages.conversation().reactOnMessage(messageFromUserB, 'heart');

      await expect(userAPages.conversation().getReactionOnMessage(messageFromUserB, 'heart')).toBeVisible();
    });
  }

  test("Verify liking someone's location", {tag: ['@TC-1533', '@regression']}, async ({createPage, api}) => {
    const userAPages = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(
      pm => pm.webapp.pages,
    );

    await test.step('Prerequisite: Send location via TestService', async () => {
      const {instanceId} = await api.testService.createInstance(
        userB.password,
        userB.email,
        'Test Service Device',
        false,
      );
      const conversationId = await api.conversation.getConversationWithUser(userB.token, userA.id!);
      await api.testService.sendLocation(instanceId, conversationId, {
        locationName: 'Test Location',
        latitude: 52.5170365,
        longitude: 13.404954,
        zoom: 42,
      });
    });

    const messageWithLink = userAPages.conversation().getMessage({sender: userB});
    await userAPages.conversation().reactOnMessage(messageWithLink, 'heart');

    await expect(userAPages.conversation().getReactionOnMessage(messageWithLink, 'heart')).toBeVisible();
  });

  test('Verify liking an own text message', {tag: ['@TC-1534', '@regression']}, async ({createPage}) => {
    const userAPages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

    await userAPages.conversation().sendMessage('Message from User A');
    const messageUserA = userAPages.conversation().getMessage({sender: userA});
    await userAPages.conversation().reactOnMessage(messageUserA, 'heart');

    await expect(userAPages.conversation().getReactionOnMessage(messageUserA, 'heart')).toBeVisible();
  });

  test('Verify you cannot like a system message', {tag: ['@TC-1535', '@regression']}, async ({createPage}) => {
    const userAPages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

    const systemMessage = userAPages.conversation().systemMessages;
    await systemMessage.hover();

    const reactionButtons = systemMessage.getByRole('group').getByRole('button').first();
    await expect(reactionButtons).not.toBeVisible();
  });

  test('Verify likes are reset if you edited message', {tag: ['@TC-1538', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
    ]);

    await userBPages.conversation().sendMessage('Message from User B');

    const messageUserB = userAPages.conversation().getMessage({sender: userB});
    await userAPages.conversation().reactOnMessage(messageUserB, 'heart');

    const reaction = userAPages.conversation().getReactionOnMessage(messageUserB, 'heart');
    await expect(reaction).toBeVisible();

    await userBPages.conversation().editMessage(userBPages.conversation().getMessage({sender: userB}));
    await userBPages.conversation().sendMessage('Edited Message');
    const editedMessage = userAPages.conversation().getMessage({content: 'Edited Message'});
    await expect(editedMessage).toBeVisible();

    await expect(reaction).not.toBeVisible();
  });

  test(
    'Verify I can open like list by hovering the link in the tooltip of a reaction pill',
    {tag: ['@TC-1540', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversation().sendMessage('Message from User B');

      const messageUserB = userAPages.conversation().getMessage({sender: userB});
      await userAPages.conversation().reactOnMessage(messageUserB, 'heart');

      const message = userBPages.conversation().getMessage({sender: userB});
      await userBPages.conversation().reactOnMessage(message, 'heart');

      const reaction = userAPages.conversation().getReactionOnMessage(messageUserB, 'heart');
      await reaction.hover();

      const tooltip = userAPages
        .conversation()
        .page.getByRole('tooltip')
        .filter({hasText: `${userA.fullName} reacted with`});
      await expect(tooltip).toBeVisible();
    },
  );

  const toggleReactionCases = [
    {
      tc: '@TC-1548',
      title: 'I want to add/remove a reaction by clicking a reaction pill',
      emoji: 'heart',
    },
    {
      tc: '@TC-1549',
      title: 'I want to add/remove a reaction using emoji picker',
      emoji: 'joy',
    },
  ] as const;

  for (const c of toggleReactionCases) {
    test(c.title, {tag: [c.tc, '@regression']}, async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userBPages.conversation().sendMessage('Message to react to');

      const messageInUserA = userAPages.conversation().getMessage({sender: userB});
      await userAPages.conversation().reactOnMessage(messageInUserA, c.emoji);

      const messageInUserB = userBPages.conversation().getMessage({sender: userB});
      await userBPages.conversation().reactOnMessage(messageInUserB, c.emoji);

      const reactionPill = userAPages.conversation().getReactionOnMessage(messageInUserA, c.emoji);

      await expect(reactionPill).toBeVisible();
      await expect(reactionPill).toHaveText('2');

      await reactionPill.click();
      await expect(reactionPill).toHaveText('1');

      await reactionPill.click();
      await expect(reactionPill).toHaveText('2');
    });
  }
});
