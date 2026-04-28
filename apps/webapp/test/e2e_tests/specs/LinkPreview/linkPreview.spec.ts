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
import {test, withLogin, expect, withConnectedUser} from 'test/e2e_tests/test.fixtures';

test.describe('Link Preview', () => {
  test(
    'I want to see preview for youtube, spotify, soundcloud or vimeo which was sent into a group conversation, on the second end',
    {tag: ['@TC-1264', '@regression']},
    async ({createPage, createUser, createTeam}) => {
      const userB = await createUser();
      const team = await createTeam('Test Team', {
        users: [userB],
      });
      const userA = team.owner;

      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const linkConfigs = [
        {
          url: 'https://soundcloud.com/slacker2d/dresden-ischen-sou-geil-v2',
          iframeSelector: 'iframe.soundcloud',
          validate: async (frame: FrameLocator) => {
            await frame.getByRole('application', {name: 'Play', exact: true}).click();
            await expect(frame.getByRole('application', {name: 'Pause', exact: true})).toBeVisible();
          },
        },
        {
          url: 'https://www.youtube.com/watch?v=BMFsJiAcELY',
          iframeSelector: 'iframe.youtube',
          validate: async (frame: FrameLocator) => {
            await frame.getByRole('button', {name: 'Play video', exact: true}).click();
            // Video player might take some time to load, so here we aren't checking for the pause button
            await expect(frame.getByLabel('Time elapsed 0:00')).toBeVisible();
          },
        },
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
        await userAPages.conversation().sendTypedMessage(link.url);

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
