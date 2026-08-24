/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import type {Page} from '@playwright/test';

import {PageManager} from 'test/e2e_tests/pageManager';
import type {ConversationSidebar} from 'test/e2e_tests/pageManager/webapp/components/conversationSidebar.component';
import {expect, LOGIN_TIMEOUT, test} from 'test/e2e_tests/test.fixtures';
import {loginWithMeetingsEnabled} from 'test/e2e_tests/utils/meetings.util';

const CONVERSATION_LIST_TAB_IDS = [
  'go-recent-view',
  'go-favorites-view',
  'go-unread-view',
  'go-mentions-view',
  'go-replies-view',
  'go-drafts-view',
  'go-pings-view',
  'go-groups-view',
  'go-directs-view',
  'go-channels-view',
  'go-archive',
] as const;

const expectHash = async (page: Page, hash: string) => {
  await expect.poll(() => new URL(page.url()).hash).toBe(hash);
};

const expectTabSelected = async (sidebar: ConversationSidebar, testId: string) => {
  await expect(sidebar.tab(testId)).toHaveAttribute('aria-selected', 'true', {timeout: LOGIN_TIMEOUT});
};

const expectConversationListView = async (page: Page) => {
  await expect(page.getByTestId('conversation-list-header-title')).toBeVisible();
};

test.describe('URL on navigation', () => {
  test(
    'switching sidebar pages updates URL and refresh keeps Meetings',
    {tag: ['@regression']},
    async ({createTeam, createPage}) => {
      const {owner} = await createTeam('URL nav', {
        features: {meetings: true, mls: true, cells: true},
      });
      const page = await createPage(loginWithMeetingsEnabled(owner));
      const {pages, components} = PageManager.from(page).webapp;
      const sidebar = components.conversationSidebar();

      await sidebar.clickConnectButton();
      await expect(pages.startUI().component).toBeVisible();
      await expectTabSelected(sidebar, 'go-people');
      await expectHash(page, '#/');

      await sidebar.clickPreferencesButton();
      await expect(pages.settings().accountButton).toBeVisible();
      await expectTabSelected(sidebar, 'go-preferences');
      await expectHash(page, '#/preferences/account');

      await sidebar.clickCellsButton();
      await expect(page.getByRole('heading', {name: 'Files'})).toBeVisible();
      await expectTabSelected(sidebar, 'go-cells');
      await expectHash(page, '#/');

      await sidebar.clickMeetingsButton();
      await expectTabSelected(sidebar, 'go-meetings');
      await expectHash(page, '#/meetings');

      await page.reload();
      await sidebar.sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
      const meetingsPage = pages.meetings();
      await expect(meetingsPage.meetingsList.or(meetingsPage.emptyMeetingsList)).toBeVisible({timeout: LOGIN_TIMEOUT});
      await expectTabSelected(sidebar, 'go-meetings');
      await expectHash(page, '#/meetings');

      await sidebar.clickPreferencesButton();
      await expect(pages.settings().accountButton).toBeVisible();
      await expectHash(page, '#/preferences/account');

      await page.reload();
      await expect(pages.settings().accountButton).toBeVisible({timeout: LOGIN_TIMEOUT});
      await expectTabSelected(sidebar, 'go-preferences');
      await expectHash(page, '#/preferences/account');
    },
  );

  test(
    'switching conversation list tabs keeps the list view',
    {tag: ['@regression']},
    async ({createTeam, createPage}) => {
      const {owner} = await createTeam('URL nav', {
        features: {meetings: true, mls: true, cells: true, channels: true},
      });
      const page = await createPage(loginWithMeetingsEnabled(owner));
      const {components} = PageManager.from(page).webapp;
      const sidebar = components.conversationSidebar();

      await sidebar.clickAllConversationsButton();
      await expectTabSelected(sidebar, 'go-recent-view');

      for (const testId of CONVERSATION_LIST_TAB_IDS) {
        const tab = sidebar.tab(testId);
        if ((await tab.count()) === 0) {
          continue;
        }

        await tab.click();
        await expectTabSelected(sidebar, testId);
        await expectConversationListView(page);
        await expect(page).not.toHaveURL(/#\/(meetings|preferences)/);
      }
    },
  );

  test(
    'switching between conversation list tabs and sidebar pages restores URL and view',
    {tag: ['@regression']},
    async ({createTeam, createPage}) => {
      const {owner} = await createTeam('URL nav', {
        features: {meetings: true, mls: true, cells: true},
      });
      const page = await createPage(loginWithMeetingsEnabled(owner));
      const {pages, components} = PageManager.from(page).webapp;
      const sidebar = components.conversationSidebar();

      await sidebar.clickAllConversationsButton();
      await expectTabSelected(sidebar, 'go-recent-view');

      await sidebar.clickMeetingsButton();
      await expectHash(page, '#/meetings');
      await expectTabSelected(sidebar, 'go-meetings');

      await sidebar.clickAllConversationsButton();
      await expectHash(page, '#/');
      await expectTabSelected(sidebar, 'go-recent-view');
      await expectConversationListView(page);

      await sidebar.clickPreferencesButton();
      await expectHash(page, '#/preferences/account');
      await expectTabSelected(sidebar, 'go-preferences');

      await sidebar.favoritesButton.click();
      await expectHash(page, '#/');
      await expectTabSelected(sidebar, 'go-favorites-view');

      await sidebar.clickCellsButton();
      await expect(page.getByRole('heading', {name: 'Files'})).toBeVisible();
      await expectHash(page, '#/');
      await expectTabSelected(sidebar, 'go-cells');

      await sidebar.clickArchive();
      await expectHash(page, '#/');
      await expectTabSelected(sidebar, 'go-archive');

      await sidebar.clickConnectButton();
      await expect(pages.startUI().component).toBeVisible();
      await expectHash(page, '#/');
      await expectTabSelected(sidebar, 'go-people');

      await sidebar.clickMeetingsButton();
      await expectHash(page, '#/meetings');
      await expectTabSelected(sidebar, 'go-meetings');
    },
  );
});
