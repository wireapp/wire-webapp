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
import {meetingListContainerStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/meetingListItemGroup';
import type {ScheduleMeetingRecurrenceOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import {getMeetingInstances} from 'Components/Meeting/selectors/getMeetingInstances';
import {getVisibleTimeWindow} from 'Components/Meeting/selectors/getVisibleTimeWindow';
import {groupMeetingInstancesByDay} from 'Components/Meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {getDaySectionHeader} from 'Components/Meeting/utils/getDaySectionHeader';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

const VISIBLE_DAY_COUNT = 14;

export interface Meeting {
  start_date: string;
  end_date: string;
  recurrence: ScheduleMeetingRecurrenceOption;
  conversation_id: string;
  qualified_conversation: QualifiedId;
  title: string;
  qualified_id: QualifiedId;
  qualified_creator: QualifiedId;
  // TODO: Ask iOS and Android about how to identify this status
  attending?: boolean;
}

export interface MeetingListProps {
  meetingSeries: MeetingSeries[];
  isLoading: boolean;
  hasLoadError: boolean;
}

export const MeetingList = ({meetingSeries, isLoading, hasLoadError}: MeetingListProps) => {
  const {translate, wallClock} = useApplicationContext();
  const [nowMs, setNowMs] = useState(() => wallClock.currentTimestampInMilliseconds);

  useEffect(() => {
    const id = wallClock.setInterval(() => setNowMs(wallClock.currentTimestampInMilliseconds), TIME_IN_MILLIS.SECOND);
    return () => wallClock.clearInterval(id);
  }, [wallClock]);

  const now = wallClock.currentDate;

  const meetingInstancesByDay = useMemo(() => {
    const {from, to} = getVisibleTimeWindow(now, {dayCount: VISIBLE_DAY_COUNT});
    const meetingInstances = getMeetingInstances(meetingSeries, from, to).filter(
      meetingInstance => meetingInstance.end.getTime() >= nowMs,
    );

    return groupMeetingInstancesByDay(meetingInstances);
  }, [meetingSeries, now, nowMs]);

  const hasVisibleMeetingInstances = meetingInstancesByDay.some(dayGroup =>
    is.nonEmptyArray(dayGroup.meetingInstances),
  );

  if (isLoading && is.nonEmptyArray(meetingSeries)) {
    return (
      <div css={emptyListContainerStyles} data-uie-name="meetings-list-loading">
        <Loading data-uie-name="status-loading" />
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div css={meetingListContainerStyles} data-uie-name="meetings-list-error">
        {translate('meetings.list.loadError')}
      </div>
    );
  }

  if (!hasVisibleMeetingInstances) {
    return (
      <div css={emptyListContainerStyles}>
        <EmptyMeetingList />
      </div>
    );
  }

  return (
    <div css={meetingListContainerStyles}>
      {meetingInstancesByDay.map(dayGroup => {
        if (!is.nonEmptyArray(dayGroup.meetingInstances)) {
          return null;
        }

        return (
          <MeetingListItemGroup
            key={dayGroup.day.toISOString()}
            header={getDaySectionHeader(dayGroup.day, now, translate)}
            meetingInstances={dayGroup.meetingInstances}
            nowMs={nowMs}
          />
        );
      })}
    </div>
  );
};
