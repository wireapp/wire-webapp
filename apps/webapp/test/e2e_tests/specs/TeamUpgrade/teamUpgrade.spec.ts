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

test('I want to upgrade team to paid', {tag: ['@TC-11757', '@regression']}, async ({createUser, createTeam, api}) => {
  const userB = await createUser();
  const {owner: userA} = await createTeam('Critical Team', {users: [userB]});

  await test.step('Upgrade team and verify payment confirmation email is received', async () => {
      await api.team.upgradeTeam(userA.teamId, userA);
      expect(await api.inbucket.isPaymentConfirmationEmailReceived(userA)).toBe(true);
  });
});
