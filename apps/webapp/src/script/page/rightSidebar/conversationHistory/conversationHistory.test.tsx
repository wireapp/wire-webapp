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

import {render, screen} from '@testing-library/react';
import {container} from 'tsyringe';

import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ConversationHistory} from './conversationHistory';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

type TestFunction = () => void | Promise<void>;
type IsolatedTestFunction = () => Promise<void>;

function withConferenceCallingDisabled(testFunction: TestFunction): IsolatedTestFunction {
  return async function runWithConferenceCallingDisabled(): Promise<void> {
    const teamState = container.resolve(TeamState);
    const conferenceCallingSpy = jest.spyOn(teamState, 'isConferenceCallingEnabled').mockReturnValue(false);

    try {
      await testFunction();
    } finally {
      conferenceCallingSpy.mockRestore();
    }
  };
}

function renderConversationHistory(selfUser: User): ReturnType<typeof render> {
  const teamState = container.resolve(TeamState);
  return render(withTheme(<ConversationHistory onClose={jest.fn()} onGoBack={jest.fn()} selfUser={selfUser} teamState={teamState} />), {
    wrapper: rootProviderWrapper,
  });
}

describe('ConversationHistory — upgrade banner', () => {
  it(
    'hides the upgrade banner for temporary guests',
    withConferenceCallingDisabled(() => {
      const selfUser = new User('test-id', '', translateForTest);
      selfUser.isTemporaryGuest(true);
      renderConversationHistory(selfUser);
      expect(
        screen.queryByRole('button', {name: translateForTest('createConversationUpgradePlanModalButton')}),
      ).not.toBeInTheDocument();
    }),
  );

  it(
    'shows the upgrade banner for regular users',
    withConferenceCallingDisabled(() => {
      const selfUser = new User('test-id', '', translateForTest);
      selfUser.isTemporaryGuest(false);
      renderConversationHistory(selfUser);
      expect(
        screen.queryByRole('button', {name: translateForTest('createConversationUpgradePlanModalButton')}),
      ).toBeInTheDocument();
    }),
  );
});
