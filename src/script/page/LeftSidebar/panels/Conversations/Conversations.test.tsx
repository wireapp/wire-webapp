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
import {observable} from 'knockout';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {User} from 'src/script/entity/User';
import {ListState} from 'src/script/page/useAppState';

import {Conversations} from './';

describe('Conversations', () => {
  const defaultParams: React.ComponentProps<typeof Conversations> = {
    conversationRepository: {
      conversationLabelRepository: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getFavorites: jest.fn().mockReturnValue([]),
        getLabels: jest.fn().mockReturnValue([]),
        getLabelConversations: jest.fn().mockReturnValue([]),
        labels: [],
      },
    } as any,
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
    inputRef: {current: null},
    isConversationFilterFocused: false,
    setIsConversationFilterFocused: () => undefined,
    integrationRepository: {integrations: observable([])} as any,
    searchRepository: {search: jest.fn()} as any,
    teamRepository: {getTeam: jest.fn()} as any,
    userRepository: {users: observable([])} as any,
  };

  it('Opens preferences when clicked', () => {
    const {getByTitle} = render(withTheme(<Conversations {...defaultParams} />));
    const openPrefButton = getByTitle('preferencesHeadline');
    act(() => {
      openPrefButton.click();
    });

    expect(defaultParams.listViewModel.switchList).toHaveBeenCalledWith(ListState.PREFERENCES);
  });
});
