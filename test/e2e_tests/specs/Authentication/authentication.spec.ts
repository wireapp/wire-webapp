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

import {test, expect} from 'test/e2e_tests/test.fixtures';

test.describe('Authentication', () => {
  test(
    'I want to be asked to share telemetry data when I log in',
    {tag: ['@TC-8780', '@regression']},
    async ({pageManager, createUser}) => {
      const {pages, modals} = pageManager.webapp;
      const user = await createUser({disableTelemetry: false});

      await pageManager.openLoginPage();
      await pages.login().login(user);

      await expect(modals.dataShareConsent().modalTitle).toBeVisible();
    },
  );
});
