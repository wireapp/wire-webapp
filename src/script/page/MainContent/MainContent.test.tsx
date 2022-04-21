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

import ko from 'knockout';
import {act, render, waitFor} from '@testing-library/react';
import MainContent from './MainContent';
import {ContentViewModel, ContentState} from 'src/script/view_model/ContentViewModel';

jest.mock(
  './panels/preferences/AccountPreferences',
  () =>
    function AccountPreferences() {
      return <span>AccountPreferences</span>;
    },
);

describe('Preferences', () => {
  const defaultParams = {
    contentViewModel: {
      repositories: {} as any,
      state: ko.observable(ContentState.PREFERENCES_ACCOUNT),
    } as ContentViewModel,
  };

  it('renders the right component according to view state', () => {
    jest.useFakeTimers();
    const {queryByText, getByText} = render(<MainContent {...defaultParams} />);
    expect(queryByText('preferencesAbout')).toBeNull();
    expect(queryByText('AccountPreferences')).not.toBeNull();

    act(() => {
      defaultParams.contentViewModel.state(ContentState.PREFERENCES_ABOUT);
    });
    waitFor(() => getByText('preferencesAbout'));
    jest.advanceTimersByTime(1000);
    expect(queryByText('AccountPreferences')).toBeNull();
    expect(queryByText('preferencesAbout')).not.toBeNull();
  });
});
