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

import {PageManager} from 'test/e2e_tests/pageManager';

import {test, expect, LOGIN_TIMEOUT} from '../../test.fixtures';
import {getUser} from 'test/e2e_tests/data/user';

test('SSO login with claimed domain', {tag: ['@TC-8781', '@regression']}, async ({context, createPage}) => {
  const page = await createPage(context);
  const pageManager = PageManager.from(page);
  await pageManager.openMainPage();

  const ssoUser = getUser({
    email: process.env.SSO_CLAIMED_DOMAIN_CODE,
    username: process.env.SSO_CLAIMED_USER_EMAIL,
    password: process.env.SSO_CLAIMED_USER_PASSWORD,
  });

  const {pages, components} = pageManager.webapp;
  const [idpPage] = await Promise.all([
    context.waitForEvent('page'),
    pages.singleSignOn().enterEmailOnSSOPage(ssoUser.email),
  ]);

  await test.step('Log in on IDP page', async () => {
    await idpPage.getByRole('textbox', {name: 'Username'}).fill(ssoUser.username, {timeout: 20_000});
    await idpPage.getByRole('textbox', {name: 'Password'}).fill(ssoUser.password);
    await idpPage.getByRole('button', {name: 'Sign In'}).click();
  });

  await test.step('Remove an existing device and confirm new history', async () => {
    // Since this test re-uses the same user over and over again we need to always remove one of the previously registered devices
    await page.getByRole('button', {name: 'Remove device'}).first().click({timeout: LOGIN_TIMEOUT});
    // We will also always be prompted to confirm the new history on this device
    await pages.historyInfo().clickConfirmButton();
    await expect(components.conversationSidebar().sidebar, `Login took more than ${LOGIN_TIMEOUT}s`).toBeVisible({
      timeout: LOGIN_TIMEOUT,
    });
  });

  await expect(pages.sidebar().allConversationsButton).toBeVisible();
});
