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
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {TabAndFilterSettings} from './tabAndFilterSettings';
import {SidebarTabs, useSidebarStore} from '../useSidebarStore';

jest.mock('Util/useChannelsFeatureFlag', () => ({
  useChannelsFeatureFlag: jest.fn(() => ({
    canCreateChannels: false,
    isChannelsEnabled: false,
    isChannelsFeatureEnabled: false,
    isChannelsHistorySharingEnabled: false,
    isPublicChannelsEnabled: false,
    shouldShowChannelTab: false,
  })),
}));

describe('TabAndFilterSettings', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  beforeEach(() => {
    jest.mocked(useChannelsFeatureFlag).mockReturnValue({
      canCreateChannels: false,
      isChannelsEnabled: false,
      isChannelsFeatureEnabled: false,
      isChannelsHistorySharingEnabled: false,
      isPublicChannelsEnabled: false,
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
      canCreateChannels: false,
      isChannelsEnabled: true,
      isChannelsFeatureEnabled: true,
      isChannelsHistorySharingEnabled: true,
      isPublicChannelsEnabled: true,
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
