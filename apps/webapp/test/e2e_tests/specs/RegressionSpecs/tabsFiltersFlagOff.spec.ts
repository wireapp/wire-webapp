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
 *
 */

import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

test.describe('Conversation tabs feature flag', () => {
  test(
    'Legacy tabs render when advanced filters are disabled',
    {tag: ['@regression']},
    async ({createUser, createPage}) => {
      test.skip(
        process.env.FEATURE_ENABLE_ADVANCED_FILTERS === 'true',
        'Advanced filters are enabled in this environment',
      );

      const user = await createUser();
      const pageManager = PageManager.from(await createPage(withLogin(user)));
      const {components} = pageManager.webapp;
      const page = pageManager.page;

      await components.conversationSidebar().isPageLoaded();

      await expect(page.locator(selectByDataAttribute('tabs-filter-button'))).toHaveCount(0);

      const defaultTabs = [
        'go-recent-view',
        'go-favorites-view',
        'go-unread-view',
        'go-mentions-view',
        'go-pings-view',
        'go-replies-view',
        'go-drafts-view',
        'go-groups-view',
        'go-directs-view',
        'go-folders-view',
        'go-archive',
      ];

      for (const tab of defaultTabs) {
        await expect(page.locator(selectByDataAttribute(tab))).toBeVisible();
      }

      if (process.env.FEATURE_ENABLE_CHANNELS === 'true') {
        await expect(page.locator(selectByDataAttribute('go-channels-view'))).toBeVisible();
      }

      if (process.env.FEATURE_ENABLE_CELLS === 'true') {
        await expect(page.locator(selectByDataAttribute('go-cells'))).toBeVisible();
      }
    },
  );
});
