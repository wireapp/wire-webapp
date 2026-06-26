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

import {useEffect, useMemo, useState} from 'react';

import is from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Loading} from '@wireapp/react-ui-kit';

import {emptyListContainerStyles} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {EmptyMeetingList} from 'Components/Meeting/EmptyMeetingList/EmptyMeetingList';
import type {MeetingsListErrorKey} from 'Components/Meeting/loadMeetingsList';
import {meetingListContainerStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup';
import {TodayAndOngoingSection} from 'Components/Meeting/MeetingList/TodayAndOngoingSection/TodayAndOngoingSection';
import {partitionMeetingsByDay} from 'Components/Meeting/partitionMeetingsByDay';
import type {ScheduleMeetingRecurrenceOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import {getTodayTomorrowLabels, groupByStartHour} from 'Components/Meeting/utils/MeetingDatesUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

export interface Meeting {
  start_date: string;
  end_date: string;
  recurrence: ScheduleMeetingRecurrenceOption;
  conversation_id: string;
  title: string;
  qualified_id: QualifiedId;
  qualified_creator: QualifiedId;
  invited_emails: string[];
  // TODO: Ask iOS and Android about how to identify this status
  attending?: boolean;
}

export interface TodayAndOngoingSectionProps {
  meetingsToday: Meeting[];
  headerForToday: string;
  nowMs: number;
  onMeetingDeleted?: () => Promise<void>;
}

export interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
  errorKey?: MeetingsListErrorKey;
  onMeetingDeleted?: () => Promise<void>;
}

export const MeetingList = ({meetings, isLoading, errorKey, onMeetingDeleted}: MeetingListProps) => {
  const {translate, wallClock} = useApplicationContext();
  const [nowMs, setNowMs] = useState(() => wallClock.currentTimestampInMilliseconds);

  useEffect(() => {
    const id = wallClock.setInterval(() => setNowMs(wallClock.currentTimestampInMilliseconds), TIME_IN_MILLIS.SECOND);
    return () => wallClock.clearInterval(id);
  }, [wallClock]);

  const {today, tomorrow} = getTodayTomorrowLabels();
  const headerForToday = `${translate('meetings.list.today')} (${today})`;
  const headerForTomorrow = `${translate('meetings.list.tomorrow')} (${tomorrow})`;

  const {today: meetingsToday, tomorrow: meetingsTomorrow} = useMemo(
    () => partitionMeetingsByDay(meetings, wallClock),
    [meetings, wallClock],
  );

  const groupedMeetingsTomorrow = groupByStartHour(meetingsTomorrow);

  const hasMeetingsToday = is.nonEmptyArray(meetingsToday);
  const hasMeetingsTomorrow = is.nonEmptyArray(meetingsTomorrow);

  if (isLoading && is.nonEmptyArray(meetings)) {
    return (
      <div css={emptyListContainerStyles} data-uie-name="meetings-list-loading">
        <Loading data-uie-name="status-loading" />
      </div>
    );
  }

  if (!is.nullOrUndefined(errorKey) && is.nonEmptyArray(meetings)) {
    return (
      <div css={meetingListContainerStyles} data-uie-name="meetings-list-error">
        {translate(errorKey)}
      </div>
    );
  }

  if (!hasMeetingsToday && !hasMeetingsTomorrow) {
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
            meetingsToday={meetingsToday}
            headerForToday={headerForToday}
            nowMs={nowMs}
            onMeetingDeleted={onMeetingDeleted}
          />
        )}

        {hasMeetingsTomorrow && (
          <MeetingListItemGroup
            header={headerForTomorrow}
            groupedMeetings={groupedMeetingsTomorrow}
            onMeetingDeleted={onMeetingDeleted}
          />
        )}
      </>
    </div>
  );
};
