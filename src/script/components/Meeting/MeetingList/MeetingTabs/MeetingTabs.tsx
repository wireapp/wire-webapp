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

import {MeetingTabsTitle} from 'Components/Meeting/MeetingList/MeetingList';
import {tabStyles, tabsWrapperStyles} from 'Components/Meeting/MeetingList/MeetingTabs/MeetingTabs.styles';
import {t} from 'Util/LocalizerUtil';

export type MeetingTab = MeetingTabsTitle.NEXT | MeetingTabsTitle.PAST;

interface MeetingTabsProps {
  active: MeetingTab;
  onChange: (tab: MeetingTab) => void;
}

export const MeetingTabs = ({active, onChange}: MeetingTabsProps) => (
  <div css={tabsWrapperStyles} role="tablist" aria-label={t('meetings.tabs.ariaLabel')}>
    <div
      role="tab"
      aria-selected={active === MeetingTabsTitle.NEXT}
      tabIndex={0}
      css={tabStyles(active === MeetingTabsTitle.NEXT)}
      onClick={() => onChange(MeetingTabsTitle.NEXT)}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onChange(MeetingTabsTitle.NEXT)}
    >
      {t('meetings.tabs.next')}
    </div>
    <div
      role="tab"
      aria-selected={active === MeetingTabsTitle.PAST}
      tabIndex={0}
      css={tabStyles(active === MeetingTabsTitle.PAST)}
      onClick={() => onChange(MeetingTabsTitle.PAST)}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onChange(MeetingTabsTitle.PAST)}
    >
      {t('meetings.tabs.past')}
    </div>
  </div>
);
