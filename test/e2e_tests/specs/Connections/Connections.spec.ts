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
import {startUpApp} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

test.describe('Connections', () => {
  test.slow();

  //   let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA, memberB] = members;

  test.beforeAll(async ({api}) => {
    // const user = await setupBasicTestScenario(api, members, owner, teamName);
    // owner = {...owner, ...user};
    // add single user
  });

  test(
    'Verify 1on1 conversation is not created on the second end after you ignore connection request',
    {tag: ['@TC-365', '@TC-369', '@TC-370', '@TC-371', '@regression']},
    async ({pageManager}) => {
      const {pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      test.step('Verify sending a connection request to user from conversation view', () => {});

      test.step('I want to cancel a pending request from conversation list', () => {});

      test.step('I want to archive a pending request from conversation list', () => {});

      expect(await pages.conversationList().isConversationItemVisible(memberB.fullName)).toBeTruthy();
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
