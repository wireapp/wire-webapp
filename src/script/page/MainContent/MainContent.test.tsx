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

import {act, render, waitFor} from '@testing-library/react';
import ko from 'knockout';

import {ContentState, ContentViewModel} from 'src/script/view_model/ContentViewModel';

import {MainContent} from './MainContent';

import {withTheme} from '../../auth/util/test/TestUtil';
import {MainViewModel} from '../../view_model/MainViewModel';
import {RootProvider} from '../RootProvider';

jest.mock(
  './panels/preferences/AccountPreferences',
  () =>
    function AccountPreferences() {
      return <span>AccountPreferences</span>;
    },
);

describe('Preferences', () => {
  const mainViewModel = {
    content: {
      repositories: {} as any,
      state: ko.observable(ContentState.PREFERENCES_ACCOUNT),
    } as ContentViewModel,
  } as MainViewModel;

  const defaultParams = {
    openRightSidebar: jest.fn(),
  };

  it('renders the right component according to view state', () => {
    jest.useFakeTimers();
    const {queryByText, getByText} = render(
      withTheme(
        <RootProvider value={mainViewModel}>
          <MainContent {...defaultParams} />
        </RootProvider>,
      ),
    );
    expect(queryByText('accessibility.headings.preferencesAbout')).toBeNull();
    expect(queryByText('AccountPreferences')).not.toBeNull();

    act(() => {
      mainViewModel.content.state(ContentState.PREFERENCES_ABOUT);
    });
    waitFor(() => getByText('accessibility.headings.preferencesAbout'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(queryByText('AccountPreferences')).toBeNull();
    expect(queryByText('accessibility.headings.preferencesAbout')).not.toBeNull();
  });
});
