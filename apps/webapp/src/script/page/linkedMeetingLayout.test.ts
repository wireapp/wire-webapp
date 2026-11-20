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

import {getAppColumns} from './linkedMeetingLayout';

describe('linked meeting columns', () => {
  const desktop = {
    isLinkedMeetingOnlyView: false,
    isMobileView: false,
    isMobileLeftSidebarView: false,
    isMobileCentralColumnView: false,
    isLeftSidebarHidden: false,
    isCellsOrMeetingsTab: false,
  };

  it('keeps navigation and the meeting column on desktop while the linked view is active', () => {
    expect(getAppColumns({...desktop, isLinkedMeetingOnlyView: true})).toEqual({
      showLeftSidebar: true,
      showMainContent: true,
    });
    expect(getAppColumns(desktop)).toEqual({showLeftSidebar: true, showMainContent: true});
  });

  it('keeps navigation and the meeting column on mobile even when the sidebar view was selected', () => {
    const mobile = {...desktop, isMobileView: true, isMobileLeftSidebarView: true};
    expect(getAppColumns({...mobile, isLinkedMeetingOnlyView: true})).toEqual({
      showLeftSidebar: true,
      showMainContent: true,
    });
    expect(getAppColumns(mobile)).toEqual({showLeftSidebar: true, showMainContent: false});
  });

  it('keeps normal columns for meetings-enabled members and temporary guests', () => {
    const mobile = {...desktop, isMobileView: true, isMobileLeftSidebarView: true};
    expect(getAppColumns({...mobile, isCellsOrMeetingsTab: true})).toEqual({
      showLeftSidebar: true,
      showMainContent: true,
    });
  });
});
