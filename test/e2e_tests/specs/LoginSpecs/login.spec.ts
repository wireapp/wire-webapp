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

import {generateRandomPassword} from 'Util/StringUtil';

import {test, expect} from '../../test.fixtures';

test.beforeEach(async ({browser, page}) => {
  await browser.startTracing(page, {screenshots: true});
});

test.afterEach(async ({browser}, testInfo) => {
  const trace = await browser.stopTracing();
  if (testInfo.status === 'failed') {
    await testInfo.attach(`performance-trace-${testInfo.testId}.json`, {body: trace});
  }
});

test(
  'Verify sign in error appearance in case of wrong credentials',
  {tag: ['@TC-3465', '@smoke']},
  async ({pageManager}) => {
    const {pages} = pageManager.webapp;

    await pageManager.openLoginPage();
    await pages.login().login({email: 'incorrect-email@wire.engineering', password: generateRandomPassword()});

    const errorMessage = pages.login().loginErrorText;
    await expect(errorMessage).toHaveText('Please verify your details and try again');
  },
);

test('Verify you can sign in by email', {tag: ['@TC-3461', '@regression']}, async ({pageManager, createUser}) => {
  const {components, pages} = pageManager.webapp;
  const user = await createUser();

  await pageManager.openLoginPage();
  await pages.login().login(user);

  await expect(components.conversationSidebar().personalStatusName).toHaveText(`${user.firstName} ${user.lastName}`);
  await expect(components.conversationSidebar().personalUserName).toContainText(user.username);
});
