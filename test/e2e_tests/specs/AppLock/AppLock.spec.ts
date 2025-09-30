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

import {getUser} from 'test/e2e_tests/data/user';
import {setupBasicTestScenario} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test} from '../../test.fixtures';

test.describe('Accessibility', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA] = members;
  const teamName = 'Accessibility';

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
    await api.brig.unlockAppLock(owner.teamId);
  });

  test(
    'Web: I should not be able to close app lock setup modal if app lock is enforced',
    {tag: ['@TC-2740', '@regression']},
    async ({pageManager, api}) => {
      await pageManager.openMainPage();
      await api.brig.enableAppLock(owner.teamId);
      // set app log state
      await loginUser(memberA, pageManager);
      // wait for modal
      await pageManager.waitForTimeout(50_000);
    },
  );

  // test(
  //   'I want to see app lock setup modal on login after app lock has been enforced for the team',
  //   {tag: ['@TC-2744', '@regression']},
  //   async ({pageManager}) => {
  //     await pageManager.openMainPage();
  //     const {components, pages} = pageManager.webapp;

  //     await loginUser(memberA, pageManager);

  //     await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
  //   },
  // );

  // test(
  //   'Web: I want the app to lock when I switch back to webapp tab after inactivity timeout expired',
  //   {tag: ['@TC-2752', '@regression']},
  //   async ({pageManager}) => {
  //     await pageManager.openMainPage();
  //     const {components, pages} = pageManager.webapp;

  //     await loginUser(memberA, pageManager);

  //     await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
  //   },
  // );

  // test(
  //   'Web: App should not lock if I switch back to webapp tab in time (during inactivity timeout)',
  //   {tag: ['@TC-2753', '@regression']},
  //   async ({pageManager}) => {
  //     await pageManager.openMainPage();
  //     const {components, pages} = pageManager.webapp;

  //     await loginUser(memberA, pageManager);

  //     await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
  //   },
  // );

  // test(
  //   'Web: I want the app to automatically lock after refreshing the page',
  //   {tag: ['@TC-2754', '@regression']},
  //   async ({pageManager}) => {
  //     await pageManager.openMainPage();
  //     const {components, pages} = pageManager.webapp;

  //     await loginUser(memberA, pageManager);

  //     await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
  //   },
  // );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
