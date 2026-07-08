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

import {useCallback, useEffect, useMemo, useState, type RefObject} from 'react';

import is from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Loading} from '@wireapp/react-ui-kit';

import {emptyListContainerStyles} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {EmptyMeetingList} from 'Components/Meeting/EmptyMeetingList/EmptyMeetingList';
import {estimateMeetingDayGroupHeight} from 'Components/Meeting/MeetingList/estimateMeetingDayGroupHeight';
import {meetingListContainerStyles} from 'Components/Meeting/MeetingList/MeetingList.styles';
import {INITIAL_VISIBLE_DAY_COUNT} from 'Components/Meeting/MeetingList/meetingListConstants';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/meetingListItemGroup';
import {useLoadMoreMeetingListDays} from 'Components/Meeting/MeetingList/useLoadMoreMeetingListDays';
import {
  useMeetingDayGroupVirtualizer,
  type UseMeetingDayGroupVirtualizer,
} from 'Components/Meeting/MeetingList/useMeetingDayGroupVirtualizer';
import type {ScheduleMeetingRecurrenceOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import {getMeetingInstances} from 'Components/Meeting/selectors/getMeetingInstances';
import {getVisibleTimeWindow} from 'Components/Meeting/selectors/getVisibleTimeWindow';
import {groupMeetingInstancesByDay} from 'Components/Meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingInstancesByDay} from 'Components/Meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {getDaySectionHeader} from 'Components/Meeting/utils/getDaySectionHeader';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

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
  scrollElementRef?: RefObject<HTMLElement | null>;
  useMeetingDayGroupVirtualizer?: UseMeetingDayGroupVirtualizer;
}

const getVisibleDayGroups = (meetingInstancesByDay: MeetingInstancesByDay[]): MeetingInstancesByDay[] =>
  meetingInstancesByDay.filter(dayGroup => is.nonEmptyArray(dayGroup.meetingInstances));

export const MeetingList = ({
  meetingSeries,
  isLoading,
  hasLoadError,
  scrollElementRef,
  useMeetingDayGroupVirtualizer: useMeetingDayGroupVirtualizerDependency = useMeetingDayGroupVirtualizer,
}: MeetingListProps) => {
  const {translate, wallClock} = useApplicationContext();
  const [nowMs, setNowMs] = useState(() => wallClock.currentTimestampInMilliseconds);
  const [visibleDayCount, setVisibleDayCount] = useState(INITIAL_VISIBLE_DAY_COUNT);

  useEffect(() => {
    const id = wallClock.setInterval(() => setNowMs(wallClock.currentTimestampInMilliseconds), TIME_IN_MILLIS.SECOND);
    return () => wallClock.clearInterval(id);
  }, [wallClock]);

  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const meetingInstancesByDay = useMemo(() => {
    const {from, to} = getVisibleTimeWindow(now, {dayCount: visibleDayCount});
    const meetingInstances = getMeetingInstances(meetingSeries, from, to).filter(
      meetingInstance => meetingInstance.end.getTime() >= nowMs,
    );

    return groupMeetingInstancesByDay(meetingInstances);
  }, [meetingSeries, now, nowMs, visibleDayCount]);

  const visibleDayGroups = useMemo(() => getVisibleDayGroups(meetingInstancesByDay), [meetingInstancesByDay]);

  const getScrollElement = useCallback(() => scrollElementRef?.current ?? null, [scrollElementRef]);

  const dayGroupInstanceCounts = useMemo(
    () => visibleDayGroups.map(dayGroup => dayGroup.meetingInstances.length),
    [visibleDayGroups],
  );

  const getEstimatedDayGroupHeight = useCallback(
    (dayGroupIndex: number) => estimateMeetingDayGroupHeight(dayGroupInstanceCounts[dayGroupIndex] ?? 1),
    [dayGroupInstanceCounts],
  );

  const getDayGroupKey = useCallback(
    (dayGroupIndex: number) => visibleDayGroups[dayGroupIndex]?.day.toISOString() ?? String(dayGroupIndex),
    [visibleDayGroups],
  );

  const dayGroupVirtualizer = useMeetingDayGroupVirtualizerDependency({
    visibleDayGroupCount: visibleDayGroups.length,
    getScrollElement,
    getEstimatedDayGroupHeight,
    getDayGroupKey,
  });

  useLoadMoreMeetingListDays({
    scrollElementRef,
    virtualizer: dayGroupVirtualizer,
    visibleDayGroupCount: visibleDayGroups.length,
    visibleDayCount,
    setVisibleDayCount,
    meetingSeries,
    now,
    wallClock,
  });

  const hasVisibleMeetingInstances = visibleDayGroups.length > 0;

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
    <div css={meetingListContainerStyles} data-uie-name="meetings-list">
      <div
        style={{
          height: `${dayGroupVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {dayGroupVirtualizer.getVirtualItems().map(virtualItem => {
          const dayGroup = visibleDayGroups[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={dayGroupVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MeetingListItemGroup
                header={getDaySectionHeader(dayGroup.day, now, translate)}
                meetingInstances={dayGroup.meetingInstances}
                nowMs={nowMs}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
