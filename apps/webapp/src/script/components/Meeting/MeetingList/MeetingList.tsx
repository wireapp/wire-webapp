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
import {formatISO9075, startOfDay} from 'date-fns';

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
import {getMeetingInstances} from 'Components/Meeting/selectors/getMeetingInstances';
import {getVisibleTimeWindow} from 'Components/Meeting/selectors/getVisibleTimeWindow';
import {groupMeetingInstancesByDay} from 'Components/Meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingInstancesByDay} from 'Components/Meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {getDaySectionHeader} from 'Components/Meeting/utils/getDaySectionHeader';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

export interface MeetingListProps {
  meetingSeries: MeetingSeries[];
  isLoading: boolean;
  hasLoadError: boolean;
  selfUser: User | undefined;
  scrollElementRef?: RefObject<HTMLElement | null>;
  useMeetingDayGroupVirtualizer?: UseMeetingDayGroupVirtualizer;
}

const getCalendarDayKey = (timestampInMilliseconds: number): string =>
  formatISO9075(startOfDay(new Date(timestampInMilliseconds)), {representation: 'date'});

const filterNotEndedMeetingInstances = (
  meetingInstancesByDay: MeetingInstancesByDay[],
  nowMilliseconds: number,
): MeetingInstancesByDay[] =>
  meetingInstancesByDay
    .map(dayGroup => ({
      ...dayGroup,
      meetingInstances: dayGroup.meetingInstances.filter(
        meetingInstance => meetingInstance.end.getTime() >= nowMilliseconds,
      ),
    }))
    .filter(dayGroup => is.nonEmptyArray(dayGroup.meetingInstances));

const getVisibleDayGroups = (meetingInstancesByDay: MeetingInstancesByDay[]): MeetingInstancesByDay[] =>
  meetingInstancesByDay.filter(dayGroup => is.nonEmptyArray(dayGroup.meetingInstances));

export const MeetingList = ({
  meetingSeries,
  isLoading,
  hasLoadError,
  selfUser,
  scrollElementRef,
  useMeetingDayGroupVirtualizer: useMeetingDayGroupVirtualizerDependency = useMeetingDayGroupVirtualizer,
}: MeetingListProps) => {
  const {translate, wallClock} = useApplicationContext();
  const [nowMilliseconds, setNowMilliseconds] = useState(() => wallClock.currentTimestampInMilliseconds);
  const [visibleDayCount, setVisibleDayCount] = useState(INITIAL_VISIBLE_DAY_COUNT);

  useEffect(() => {
    const id = wallClock.setInterval(
      () => setNowMilliseconds(wallClock.currentTimestampInMilliseconds),
      TIME_IN_MILLIS.SECOND,
    );
    return () => wallClock.clearInterval(id);
  }, [wallClock]);

  const visibleDayKey = getCalendarDayKey(nowMilliseconds);

  const visibleDayStart = useMemo(() => startOfDay(new Date(nowMilliseconds)), [visibleDayKey]);

  const expandedMeetingInstancesByDay = useMemo(() => {
    const {from, to} = getVisibleTimeWindow(visibleDayStart, {dayCount: visibleDayCount});
    const meetingInstances = getMeetingInstances(meetingSeries, from, to);

    return groupMeetingInstancesByDay(meetingInstances);
  }, [meetingSeries, visibleDayCount, visibleDayStart]);

  const meetingInstancesByDay = useMemo(
    () => filterNotEndedMeetingInstances(expandedMeetingInstancesByDay, nowMilliseconds),
    [expandedMeetingInstancesByDay, nowMilliseconds],
  );

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
    visibleDayStart,
    wallClock,
  });

  const hasVisibleMeetingInstances = visibleDayGroups.length > 0;
  const now = new Date(nowMilliseconds);

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
                nowMilliseconds={nowMilliseconds}
                selfUser={selfUser}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
