/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React from 'react';

import {act, render} from '@testing-library/react';
import {createFireAndForgetInvoker} from '@wireapp/core/lib/taskExecution/fireAndForgetInvoker/fireAndForgetInvoker';
import {observable} from 'knockout';
import {noop} from 'noop-esm';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {ListState} from 'src/script/page/useAppState';
import {TestFactory} from 'test/helper/TestFactory';

import {Conversations} from './';
import {RootProvider} from '../../../RootProvider';
import {createRootContextValueForTest} from '../../../testSupport/rootContextTestSupport';

jest.mock('./ConversationSidebar/ConversationSidebar', () => ({
  ConversationSidebar: ({onClickPreferences}: {onClickPreferences: (contentState: number) => void}) => {
    const {ContentState} = require('src/script/page/useAppState');

    return (
      <button
        title="preferencesHeadline"
        type="button"
        onClick={() => onClickPreferences(ContentState.PREFERENCES_ACCOUNT)}
      />
    );
  },
}));

jest.mock('./ConversationHeader', () => ({
  ConversationHeader: () => null,
}));

const defaultParams: Omit<React.ComponentProps<typeof Conversations>, 'conversationRepository' | 'searchRepository'> = {
  listViewModel: {
    switchList: jest.fn(),
    contentViewModel: {
      loadPreviousContent: jest.fn(),
      switchContent: jest.fn(),
    },
  } as any,
  preferenceNotificationRepository: {notifications: observable([])} as any,
  propertiesRepository: {getPreference: jest.fn(), savePreference: jest.fn()} as any,
  selfUser: new User(),
  integrationRepository: {integrations: observable([])} as any,
  teamRepository: {getTeam: jest.fn()} as any,
  userRepository: {users: observable([])} as any,
};

describe('Conversations', () => {
  const rootContextValue = createRootContextValueForTest({
    fireAndForgetInvoker: createFireAndForgetInvoker({logger: {error: noop}}),
    mainViewModel: {} as Parameters<typeof createRootContextValueForTest>[0]['mainViewModel'],
    wallClock: {} as Parameters<typeof createRootContextValueForTest>[0]['wallClock'],
  });

  let conversationRepository: ConversationRepository;
  let searchRepository: SearchRepository;

  beforeEach(async () => {
    const testFactory = new TestFactory();
    conversationRepository = await testFactory.exposeConversationActors();
    searchRepository = new SearchRepository({} as UserRepository);
  });

  it('Opens preferences when clicked', () => {
    const {getByTitle} = render(
      withTheme(
        <RootProvider value={rootContextValue}>
          <Conversations
            {...defaultParams}
            searchRepository={searchRepository}
            conversationRepository={conversationRepository}
          />
        </RootProvider>,
      ),
    );
    const openPrefButton = getByTitle('preferencesHeadline');
    act(() => {
      openPrefButton.click();
    });

    expect(defaultParams.listViewModel.switchList).toHaveBeenCalledWith(ListState.PREFERENCES);
  });
});
