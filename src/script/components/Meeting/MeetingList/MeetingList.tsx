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

import {ReactNode, useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {
  emptyListContainerStyles,
  emptyTabsListContainerStyles,
} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {EmptyMeetingList} from 'Components/Meeting/EmptyMeetingList/EmptyMeetingList';
import {meetingListContainerStyles, showAllButtonStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup';
import {MeetingTab, MeetingTabs} from 'Components/Meeting/MeetingList/MeetingTabs/MeetingTabs';
import {getTodayTomorrowLabels, groupByStartHour} from 'Components/Meeting/utils/MeetingDatesHandler';
import {t} from 'Util/LocalizerUtil';

export interface Meeting {
  start_date: string;
  end_date: string;
  schedule: string;
  conversation_id: string;
  title: string;
}

export enum MeetingTabsTitle {
  NEXT = 'next',
  PAST = 'past',
}

export const MeetingList = () => {
  // Temporary mocked data to visualize the UI until the backend is wired
  const meetingsToday: Meeting[] = [
    {
      start_date: '2025-06-03T07:30:00',
      end_date: '2025-06-03T07:40:00',
      schedule: 'Single',
      conversation_id: '1',
      title: 'Meeting 1',
    },
    {
      start_date: '2025-06-03T07:45:00',
      end_date: '2025-06-03T10:15:00',
      schedule: 'Single',
      conversation_id: '2',
      title: 'Meeting 2',
    },
    {
      start_date: '2025-06-03T08:00:00',
      end_date: '2025-06-03T10:15:00',
      schedule: 'Daily',
      conversation_id: '3',
      title: 'Meeting 3',
    },
  ];

  const meetingsTomorrow: Meeting[] = [
    {
      start_date: '2025-06-04T07:00:00',
      end_date: '2025-06-04T15:15:00',
      schedule: 'Single',
      conversation_id: '4',
      title: 'Meeting 4',
    },
    {
      start_date: '2025-06-04T08:00:00',
      end_date: '2025-06-04T08:15:00',
      schedule: 'Monthly',
      conversation_id: '5',
      title: 'Meeting 5',
    },
    {
      start_date: '2025-06-04T17:00:00',
      end_date: '2025-06-04T18:15:00',
      schedule: 'Monthly',
      conversation_id: '6',
      title: 'Meeting 6',
    },
    {
      start_date: '2025-06-04T09:00:00',
      end_date: '2025-06-04T10:15:00',
      schedule: 'Monthly',
      conversation_id: '7',
      title: 'Meeting 7',
    },
  ];

  const [activeTab, setActiveTab] = useState<MeetingTab>(MeetingTabsTitle.NEXT);

  const {today, tomorrow} = getTodayTomorrowLabels();
  const headerForToday = `${t('meetings.list.today')} (${today})`;
  const headerForTomorrow = `${t('meetings.list.tomorrow')} (${tomorrow})`;

  const groupedMeetingsToday = groupByStartHour(meetingsToday);
  const groupedMeetingsTomorrow = groupByStartHour(meetingsTomorrow);

  const hasMeetingsToday = meetingsToday.length > 0;
  const hasMeetingsTomorrow = meetingsTomorrow.length > 0;
  const isNextTab = activeTab === MeetingTabsTitle.NEXT;

  let content: ReactNode;

  if (!hasMeetingsToday && !hasMeetingsTomorrow) {
    return (
      <div css={emptyListContainerStyles}>
        <EmptyMeetingList />
      </div>
    );
  }

  if (isNextTab) {
    // Next tab
    content = hasMeetingsToday ? (
      <>
        <MeetingListItemGroup header={headerForToday} groupedMeetings={groupedMeetingsToday} />
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
    // Past tab
    content = hasMeetingsTomorrow ? (
      <MeetingListItemGroup view={MeetingTabsTitle.PAST} groupedMeetings={{0: meetingsTomorrow}} />
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
      <MeetingTabs active={activeTab} onChange={setActiveTab} />
      {content}
    </div>
  );
};
