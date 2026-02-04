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

import {SidebarStatus, SidebarTabs, isTabVisible, useSidebarStore} from './useSidebarStore';

describe('useSidebarStore', () => {
  beforeEach(() => {
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    useSidebarStore.setState({
      currentTab: SidebarTabs.RECENT,
      visibleTabs: [
        SidebarTabs.RECENT,
        SidebarTabs.FOLDER,
        SidebarTabs.FAVORITES,
        SidebarTabs.GROUPS,
        SidebarTabs.CHANNELS,
        SidebarTabs.DIRECTS,
        SidebarTabs.UNREAD,
        SidebarTabs.MENTIONS,
        SidebarTabs.REPLIES,
        SidebarTabs.DRAFTS,
        SidebarTabs.PINGS,
        SidebarTabs.ARCHIVES,
      ],
    });
  });

  it('keeps RECENT visible even when toggled', () => {
    useSidebarStore.getState().toggleTabVisibility(SidebarTabs.RECENT);

    expect(useSidebarStore.getState().visibleTabs).toContain(SidebarTabs.RECENT);
  });

  it('hides active tab and falls back to RECENT', () => {
    useSidebarStore.setState({currentTab: SidebarTabs.GROUPS});

    useSidebarStore.getState().toggleTabVisibility(SidebarTabs.GROUPS);

    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.RECENT);
    expect(useSidebarStore.getState().visibleTabs).not.toContain(SidebarTabs.GROUPS);
  });

  it('sets current tab', () => {
    useSidebarStore.getState().setCurrentTab(SidebarTabs.MENTIONS);

    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.MENTIONS);
  });

  it('sets sidebar status', () => {
    useSidebarStore.getState().setStatus(SidebarStatus.CLOSED);

    expect(useSidebarStore.getState().status).toBe(SidebarStatus.CLOSED);
  });

  it('sets visible tabs', () => {
    const visibleTabs = [SidebarTabs.RECENT, SidebarTabs.FAVORITES];

    useSidebarStore.getState().setVisibleTabs(visibleTabs);

    expect(useSidebarStore.getState().visibleTabs).toEqual(visibleTabs);
  });

  it('checks tab visibility', () => {
    const visibleTabs = [SidebarTabs.FAVORITES];

    expect(isTabVisible(SidebarTabs.RECENT, visibleTabs)).toBe(true);
    expect(isTabVisible(SidebarTabs.FAVORITES, visibleTabs)).toBe(true);
    expect(isTabVisible(SidebarTabs.DRAFTS, visibleTabs)).toBe(false);
  });
});
