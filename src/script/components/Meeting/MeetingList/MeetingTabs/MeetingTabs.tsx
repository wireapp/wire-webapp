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

import {MEETING_TABS_TITLE} from 'Components/Meeting/MeetingList/MeetingList';
import {tabStyles, tabsWrapperStyles} from 'Components/Meeting/MeetingList/MeetingTabs/MeetingTabs.styles';
import {t} from 'Util/LocalizerUtil';

export type MeetingTab = MEETING_TABS_TITLE.UPCOMING | MEETING_TABS_TITLE.PAST;

interface MeetingTabsProps {
  active: MeetingTab;
  onChange: (tab: MeetingTab) => void;
}

export const MeetingTabs = ({active, onChange}: MeetingTabsProps) => (
  <div css={tabsWrapperStyles} role="tablist" aria-label={t('meetings.tabs.ariaLabel')}>
    <div
      role="tab"
      aria-selected={active === MEETING_TABS_TITLE.UPCOMING}
      tabIndex={0}
      css={tabStyles(active === MEETING_TABS_TITLE.UPCOMING)}
      onClick={() => onChange(MEETING_TABS_TITLE.UPCOMING)}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onChange(MEETING_TABS_TITLE.UPCOMING)}
    >
      {t('meetings.tabs.next')}
    </div>
    <div
      role="tab"
      aria-selected={active === MEETING_TABS_TITLE.PAST}
      tabIndex={0}
      css={tabStyles(active === MEETING_TABS_TITLE.PAST)}
      onClick={() => onChange(MEETING_TABS_TITLE.PAST)}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onChange(MEETING_TABS_TITLE.PAST)}
    >
      {t('meetings.tabs.past')}
    </div>
  </div>
);
