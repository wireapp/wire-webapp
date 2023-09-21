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
import ko from 'knockout';

import {User} from 'src/script/entity/User';
import {ListState} from 'src/script/page/useAppState';
import {PROPERTIES_TYPE} from 'src/script/properties/PropertiesType';

import {Conversations} from '.';

describe('Conversations', () => {
  const defaultParams: React.ComponentProps<typeof Conversations> = {
    conversationRepository: {
      conversationLabelRepository: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    } as any,
    listViewModel: {} as any,
    preferenceNotificationRepository: {notifications: ko.observable([])} as any,
    propertiesRepository: {getPreference: jest.fn(), savePreference: jest.fn()} as any,
    selfUser: new User(),
    switchList: jest.fn(),
  };

  it('Opens preferences when clicked', () => {
    const {getByTitle} = render(<Conversations {...defaultParams} />);
    const openPrefButton = getByTitle('tooltipConversationsPreferences');
    act(() => {
      openPrefButton.click();
    });

    expect(defaultParams.switchList).toHaveBeenCalledWith(ListState.PREFERENCES);
  });

  it('Switches between folder and list view and save view state', () => {
    const {getByTitle} = render(<Conversations {...defaultParams} />);
    const switchToFolder = getByTitle('folderViewTooltip');
    act(() => {
      switchToFolder.click();
    });

    expect(defaultParams.propertiesRepository.savePreference).toHaveBeenCalledWith(
      PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS,
      true,
    );

    const switchToList = getByTitle('conversationViewTooltip');
    act(() => {
      switchToList.click();
    });

    expect(defaultParams.propertiesRepository.savePreference).toHaveBeenCalledWith(
      PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS,
      false,
    );
  });
});
