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

import {ReactNode, useCallback, useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {ClockProvider} from 'Components/Meeting/ClockContext';
import {
  emptyListContainerStyles,
  emptyTabsListContainerStyles,
} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {EmptyMeetingList} from 'Components/Meeting/EmptyMeetingList/EmptyMeetingList';
import {meetingListContainerStyles, showAllButtonStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup';
import {MeetingTab, MeetingTabs} from 'Components/Meeting/MeetingList/MeetingTabs/MeetingTabs';
import {TodayAndOngoingSection} from 'Components/Meeting/MeetingList/TodayAndOngoingSection/TodayAndOngoingSection';
import {MEETINGS_PAST, MEETINGS_TODAY, MEETINGS_TOMORROW} from 'Components/Meeting/mocks/MeetingMocks';
import {getTodayTomorrowLabels, groupByStartHour} from 'Components/Meeting/utils/MeetingDatesUtil';
import {t} from 'Util/LocalizerUtil';

export interface Meeting {
  start_date: string;
  end_date: string;
  schedule: string;
  conversation_id: string;
  title: string;
  // Ask iOS and Android about how to identify this status
  attending?: boolean;
}

export enum MeetingTabsTitle {
  NEXT = 'next',
  PAST = 'past',
}

export interface TodayAndOngoingSectionProps {
  meetingsToday: Meeting[];
  headerForOnGoing: string;
  headerForToday: string;
}

export const MeetingList = () => {
  const [activeTab, setActiveTab] = useState<MeetingTab>(MeetingTabsTitle.NEXT);

  const {today, tomorrow} = getTodayTomorrowLabels();
  const headerForOnGoing = `${t('meetings.list.onGoing.header')}`;
  const headerForToday = `${t('meetings.list.today')} (${today})`;
  const headerForTomorrow = `${t('meetings.list.tomorrow')} (${tomorrow})`;

  const groupedMeetingsTomorrow = groupByStartHour(MEETINGS_TOMORROW);

  const hasMeetingsToday = MEETINGS_TODAY.length > 0;
  const hasMeetingsTomorrow = MEETINGS_TOMORROW.length > 0;
  const isNextTab = activeTab === MeetingTabsTitle.NEXT;

  const handleTabChange = useCallback((tab: MeetingTab) => setActiveTab(tab), []);

  let content: ReactNode;

  if (!hasMeetingsToday && !hasMeetingsTomorrow) {
    return (
      <div css={emptyListContainerStyles}>
        <EmptyMeetingList />
      </div>
    );
  }

  if (isNextTab) {
    content = hasMeetingsToday ? (
      <>
        <TodayAndOngoingSection
          meetingsToday={MEETINGS_TODAY}
          headerForOnGoing={headerForOnGoing}
          headerForToday={headerForToday}
        />

        <MeetingListItemGroup header={headerForTomorrow} groupedMeetings={groupedMeetingsTomorrow} />
        <div css={showAllButtonStyles}>
          <Button variant={ButtonVariant.TERTIARY}>{t('meetings.showAllLabel')}</Button>
        </div>
      </>
    ) : (
      <div css={emptyTabsListContainerStyles}>
        <EmptyMeetingList text={t('meetings.noUpcomingMeetingsText')} />
      </div>
    );
  } else {
    content = hasMeetingsTomorrow ? (
      <MeetingListItemGroup view={MeetingTabsTitle.PAST} groupedMeetings={{0: MEETINGS_PAST}} />
    ) : (
      <div css={emptyTabsListContainerStyles}>
        <EmptyMeetingList
          showCallingButton={false}
          text={t('meetings.noPastMeetingsText')}
          helperText={t('meetings.noPastMeetingsHelperText')}
        />
      </div>
    );
  }

  return (
    <div css={meetingListContainerStyles}>
      <MeetingTabs active={activeTab} onChange={handleTabChange} />
      <ClockProvider>{content}</ClockProvider>
    </div>
  );
};
