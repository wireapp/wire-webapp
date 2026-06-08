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

import {fireEvent, render, waitFor} from '@testing-library/react';

import {Config} from 'src/script/Config';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {createRootContextValueForTest, createRootProviderWrapperForTest} from 'src/script/page/testSupport/rootContextTestSupport';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {TabAndFilterSettings} from './tabAndFilterSettings';
import {SidebarTabs, useSidebarStore} from '../useSidebarStore';

jest.mock('Util/useChannelsFeatureFlag', () => ({
  useChannelsFeatureFlag: jest.fn(() => ({
    isChannelsEnabled: false,
    shouldShowChannelTab: false,
  })),
}));

jest.mock('Repositories/team/TeamState', () => ({
  TeamState: class {
    isCellsEnabled = () => false;
  },
}));

jest.mock('Util/componentUtil', () => ({
  useKoSubscribableChildren: () => ({isCellsEnabled: false}),
}));

jest.mock('Components/icon', () => ({
  SettingsIcon: () => <div data-testid="settings-icon" />,
}));

describe('TabAndFilterSettings', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({}));

  beforeEach(() => {
    jest.mocked(useChannelsFeatureFlag).mockReturnValue({
      isChannelsEnabled: false,
      shouldShowChannelTab: false,
    });
    Config._dangerouslySetConfigFeaturesForDebug({
      ...Config.getConfig().FEATURE,
      ENABLE_ADVANCED_FILTERS: true,
    });
    useSidebarStore.setState({
      visibleTabs: [SidebarTabs.RECENT, SidebarTabs.FAVORITES, SidebarTabs.GROUPS],
    });
  });

  it('opens the dropdown and toggles a tab visibility', async () => {
    const {getByTitle, getByText} = render(withTheme(<TabAndFilterSettings />), {
      wrapper: rootProviderWrapper,
    });

    fireEvent.click(getByTitle('tabsFilterTooltip'));

    const favoritesLabel = getByText('conversationLabelFavorites');
    fireEvent.click(favoritesLabel);

    await waitFor(() => {
      expect(useSidebarStore.getState().visibleTabs).not.toContain(SidebarTabs.FAVORITES);
    });
  });

  it('inserts the channels tab between groups and directs when channels are enabled', () => {
    jest.mocked(useChannelsFeatureFlag).mockReturnValue({
      isChannelsEnabled: true,
      shouldShowChannelTab: true,
    });

    const {getByTitle, getAllByRole} = render(withTheme(<TabAndFilterSettings />), {
      wrapper: rootProviderWrapper,
    });

    fireEvent.click(getByTitle('tabsFilterTooltip'));

    const tabLabels = getAllByRole('menuitemcheckbox').map(checkboxElement => checkboxElement.textContent);

    expect(tabLabels).toEqual([
      'conversationLabelFavorites',
      'conversationLabelGroups',
      'conversationLabelChannels',
      'conversationLabelDirects',
      'folderViewTooltip',
      'conversationFooterArchive',
      'conversationLabelUnread',
      'conversationLabelMentions',
      'conversationLabelReplies',
      'conversationLabelDrafts',
      'conversationLabelPings',
    ]);
  });
});
