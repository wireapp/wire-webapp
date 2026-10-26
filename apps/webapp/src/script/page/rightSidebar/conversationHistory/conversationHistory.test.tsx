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
import {UserState} from 'Repositories/user/userState';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ConversationHistory} from './conversationHistory';

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

function renderConversationHistory(): ReturnType<typeof render> {
  return render(withTheme(<ConversationHistory onClose={jest.fn()} onGoBack={jest.fn()} />), {
    wrapper: rootProviderWrapper,
  });
}

describe('ConversationHistory — upgrade banner', () => {
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);
  let originalSelfUser: User;
  let conferenceCallingSpy: jest.SpyInstance;

  beforeEach(() => {
    originalSelfUser = userState.self();
    conferenceCallingSpy = jest.spyOn(teamState, 'isConferenceCallingEnabled').mockReturnValue(false);
  });

  afterEach(() => {
    userState.self(originalSelfUser);
    conferenceCallingSpy.mockRestore();
  });

  it('hides the upgrade banner for temporary guests', () => {
    const selfUser = new User('test-id', '', translateForTest);
    selfUser.isTemporaryGuest(true);
    userState.self(selfUser);

    renderConversationHistory();

    expect(screen.queryByRole('button', {name: translateForTest('createConversationUpgradePlanModalButton')})).not.toBeInTheDocument();
  });

  it('shows the upgrade banner for regular users', () => {
    const selfUser = new User('test-id', '', translateForTest);
    selfUser.isTemporaryGuest(false);
    userState.self(selfUser);

    renderConversationHistory();

    expect(screen.queryByRole('button', {name: translateForTest('createConversationUpgradePlanModalButton')})).toBeInTheDocument();
  });
});
