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

import {forTestsOnlyFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName} from 'src/script/featureToggles/startupFeatureToggles';
import {PageManager} from 'test/e2eTests/pageManager';
import {expect, test, withLogin} from 'test/e2eTests/testFixtures';

test.describe('Startup feature toggles on navigation', () => {
  test(
    'preserves startup feature toggles after login redirects to the main app',
    {tag: ['@regression']},
    async ({createUser, createPage}) => {
      const user = await createUser();
      const page = await createPage(
        withLogin(user, {
          startupFeatureToggles: {[forTestsOnlyFeatureToggleName]: true},
        }),
      );

      await expect(PageManager.from(page).webapp.components.conversationSidebar().sidebar).toBeVisible();

      const mainAppUrl = new URL(page.url());
      expect(mainAppUrl.pathname).toBe('/');
      expect(mainAppUrl.searchParams.get(startupFeatureToggleQueryParameterName)).toBe(forTestsOnlyFeatureToggleName);
    },
  );
});
