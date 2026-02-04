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

import {fireEvent, render, waitFor} from '@testing-library/react';

import en from 'I18n/en-US.json';
import {Config} from 'src/script/Config';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {setStrings} from 'Util/LocalizerUtil';

import {TabsFilterButton} from './TabsFilterButton';
import {SidebarTabs, useSidebarStore} from '../useSidebarStore';

jest.mock('Util/useChannelsFeatureFlag', () => ({
  useChannelsFeatureFlag: () => ({
    isChannelsEnabled: false,
    shouldShowChannelTab: false,
  }),
}));

jest.mock('Repositories/team/TeamState', () => ({
  TeamState: class {
    isCellsEnabled = () => false;
  },
}));

jest.mock('Util/ComponentUtil', () => ({
  useKoSubscribableChildren: () => ({isCellsEnabled: false}),
}));

jest.mock('Components/Icon', () => ({
  SettingsIcon: () => <div data-testid="settings-icon" />,
}));

describe('TabsFilterButton', () => {
  beforeEach(() => {
    setStrings({en});
    Config._dangerouslySetConfigFeaturesForDebug({
      ...Config.getConfig().FEATURE,
      ENABLE_ADVANCED_FILTERS: true,
    });
    useSidebarStore.setState({
      visibleTabs: [SidebarTabs.RECENT, SidebarTabs.FAVORITES, SidebarTabs.GROUPS],
    });
  });

  it('opens the dropdown and toggles a tab visibility', async () => {
    const {getByTitle, getByText} = render(withTheme(<TabsFilterButton />));

    fireEvent.click(getByTitle('Customize visible tabs'));

    const favoritesLabel = getByText('Favorites');
    fireEvent.click(favoritesLabel);

    await waitFor(() => {
      expect(useSidebarStore.getState().visibleTabs).not.toContain(SidebarTabs.FAVORITES);
    });
  });
});
