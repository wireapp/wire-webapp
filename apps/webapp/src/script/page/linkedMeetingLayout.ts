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

type AppColumnsInput = {
  isLinkedMeetingOnlyView: boolean;
  isMobileView: boolean;
  isMobileLeftSidebarView: boolean;
  isMobileCentralColumnView: boolean;
  isLeftSidebarHidden: boolean;
  isCellsOrMeetingsTab: boolean;
};

export const getAppColumns = ({
  isLinkedMeetingOnlyView,
  isMobileView,
  isMobileLeftSidebarView,
  isMobileCentralColumnView,
  isLeftSidebarHidden,
  isCellsOrMeetingsTab,
}: AppColumnsInput): {showLeftSidebar: boolean; showMainContent: boolean} => {
  return {
    showLeftSidebar:
      isLinkedMeetingOnlyView || (isMobileView && isMobileLeftSidebarView) || (!isMobileView && !isLeftSidebarHidden),
    showMainContent: isLinkedMeetingOnlyView || isCellsOrMeetingsTab || !isMobileView || isMobileCentralColumnView,
  };
};
