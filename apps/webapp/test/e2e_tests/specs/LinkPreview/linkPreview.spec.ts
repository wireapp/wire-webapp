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

import {FrameLocator} from 'playwright/test';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect} from 'test/e2e_tests/test.fixtures';
import {connectWithUser} from 'test/e2e_tests/utils/userActions';

test.describe('Link Preview', () => {
  test(
    'I want to see preview for youtube, spotify, soundcloud or vimeo which was sent into a group conversation, on the second end',
    {tag: ['@TC-1264', '@regression']},
    async ({createPage, createUser, createTeam}) => {
      const userB = await createUser();
      const team = await createTeam('Test Team', {users: [userB]});
      const userA = team.owner;

      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
      await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();

      const linkConfigs = [
        {
          url: 'https://soundcloud.com/slacker2d/dresden-ischen-sou-geil-v2',
          iframeSelector: 'iframe.soundcloud',
          validate: async (frame: FrameLocator) => {
            await frame.getByRole('application', {name: 'Play', exact: true}).click();
            await expect(frame.getByRole('application', {name: 'Pause', exact: true})).toBeVisible();
          },
        },
        // YouTube has implemented some anti-bot checks on embedded videos so this part of the test is currently disabled [WPB-25663]
        // {
        //   url: 'https://www.youtube.com/watch?v=BMFsJiAcELY',
        //   iframeSelector: 'iframe.youtube',
        //   validate: async (frame: FrameLocator) => {
        //     await expect(frame.getByLabel('Time elapsed')).not.toBeVisible();
        //     await frame.getByRole('button', {name: 'Play video', exact: true}).click();
        //     // Video player might take some time to load, so here we aren't checking for the pause button
        //     await expect(frame.getByLabel('Time elapsed')).toBeVisible();
        //   },
        // },
        {
          url: 'https://play.spotify.com/album/7buEcyw6fJF3WPgr06BomH',
          iframeSelector: 'iframe.spotify',
          validate: async (frame: FrameLocator) => {
            await frame.getByRole('button', {name: 'Play', exact: true}).click();
            await expect(frame.getByRole('button', {name: 'Pause', exact: true})).toBeVisible();
          },
        },
        {
          url: 'https://vimeo.com/288344114',
          iframeSelector: 'iframe.vimeo',
          validate: async (frame: FrameLocator) => {
            await frame.getByRole('button', {name: 'Play', exact: true}).click();
            await expect(frame.getByRole('button', {name: 'Pause', exact: true})).toBeVisible();
          },
        },
      ];

      for (const link of linkConfigs) {
        await userAPages.conversation().sendMessage(link.url);

        // Validating the link preview for both users
        for (const pages of [userAPages, userBPages]) {
          const message = pages.conversation().getMessage({content: link.url});
          const frame = message.frameLocator(link.iframeSelector);

          await expect(message.locator(link.iframeSelector)).toBeVisible();
          await link.validate(frame);
        }
      }
    },
  );
});
