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

import {useEffect, useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {emptyListContainerStyles} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {EmptyMeetingList} from 'Components/Meeting/EmptyMeetingList/EmptyMeetingList';
import {meetingListContainerStyles, showAllButtonStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {
  MeetingGroupBy,
  MeetingListItemGroup,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup';
import {TodayAndOngoingSection} from 'Components/Meeting/MeetingList/TodayAndOngoingSection/TodayAndOngoingSection';
import {MEETINGS_PAST, MEETINGS_TODAY, MEETINGS_TOMORROW} from 'Components/Meeting/mocks/MeetingMocks';
import {getTodayTomorrowLabels, groupByStartHour} from 'Components/Meeting/utils/MeetingDatesUtil';
import {t} from 'Util/localizerUtil';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

export interface Meeting {
  start_date: string;
  end_date: string;
  schedule: string;
  conversation_id: string;
  title: string;
  // TODO: Ask iOS and Android about how to identify this status
  attending?: boolean;
}

export interface TodayAndOngoingSectionProps {
  meetingsToday: Meeting[];
  headerForOnGoing: string;
  headerForToday: string;
  nowMs: number;
}

export const MeetingList = () => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), TIME_IN_MILLIS.SECOND);
    return () => window.clearInterval(id);
  }, []);

  const {today, tomorrow} = getTodayTomorrowLabels();
  const headerForOnGoing = `${t('meetings.list.onGoing.header')}`;
  const headerForToday = `${t('meetings.list.today')} (${today})`;
  const headerForTomorrow = `${t('meetings.list.tomorrow')} (${tomorrow})`;

  const groupedMeetingsTomorrow = groupByStartHour(MEETINGS_TOMORROW);
  const groupedMeetingsPast = groupByStartHour(MEETINGS_PAST);

  const hasMeetingsToday = MEETINGS_TODAY.length > 0;
  const hasMeetingsTomorrow = MEETINGS_TOMORROW.length > 0;
  const hasMeetingsPast = MEETINGS_PAST.length > 0;

  if (!hasMeetingsToday && !hasMeetingsTomorrow && !hasMeetingsPast) {
    return (
      <div css={emptyListContainerStyles}>
        <EmptyMeetingList />
      </div>
    );
  }

  return (
    <div css={meetingListContainerStyles}>
      <>
        {hasMeetingsToday && (
          <TodayAndOngoingSection
            meetingsToday={MEETINGS_TODAY}
            headerForOnGoing={headerForOnGoing}
            headerForToday={headerForToday}
            nowMs={nowMs}
          />
        )}

        {hasMeetingsTomorrow && (
          <MeetingListItemGroup header={headerForTomorrow} groupedMeetings={groupedMeetingsTomorrow} />
        )}

        {hasMeetingsPast && (
          <MeetingListItemGroup groupedMeetings={groupedMeetingsPast} groupBy={MeetingGroupBy.NONE} nowMs={nowMs} />
        )}

        {(hasMeetingsToday || hasMeetingsTomorrow || hasMeetingsPast) && (
          <div css={showAllButtonStyles}>
            <Button variant={ButtonVariant.TERTIARY}>{t('meetings.showAllLabel')}</Button>
          </div>
        )}
      </>
    </div>
  );
};
