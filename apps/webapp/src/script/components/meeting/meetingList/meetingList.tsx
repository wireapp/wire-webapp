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

import {type RefObject, useCallback, useEffect, useMemo, useState} from 'react';

import {isNonEmptyArray} from '@sindresorhus/is';
import {startOfDay} from 'date-fns';

import {Button, ButtonVariant, Loading} from '@wireapp/react-ui-kit';

import {emptyListContainerStyles} from 'Components/meeting/emptyMeetingList/emptyListStyles';
import {EmptyMeetingList} from 'Components/meeting/emptyMeetingList/emptyMeetingList';
import {
  meetingDayHeaderStyles,
  meetingListContainerStyles,
  meetingListItemWrapperStyles,
  screenReaderOnlyStyles,
} from 'Components/meeting/meetingList/meetingList.styles';
import {
  INITIAL_MEETING_INSTANCE_COUNT,
  LOAD_MORE_MEETING_INSTANCE_COUNT,
  MEETING_DAY_GROUP_HEADER_HEIGHT,
  MEETING_DAY_GROUP_SECTION_TOP_PADDING,
  MEETING_LIST_ITEM_HEIGHT,
} from 'Components/meeting/meetingList/meetingListConstants';
import {MeetingListItem} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingListItem';
import {useLoadMoreMeetingListItems} from 'Components/meeting/meetingList/useLoadMoreMeetingListItems';
import {
  useMeetingListVirtualizer,
  type UseMeetingListVirtualizer,
} from 'Components/meeting/meetingList/useMeetingListVirtualizer';
import {
  getMeetingInstancePage,
  getNextMeetingInstancePage,
  type MeetingInstancePage,
} from 'Components/meeting/selectors/getMeetingInstancePage';
import {
  getMeetingListTimelineItems,
  type MeetingListTimelineItem,
} from 'Components/meeting/selectors/getMeetingListTimelineItems';
import {groupMeetingInstancesByDay} from 'Components/meeting/selectors/groupMeetingInstancesByDay';
import type {MeetingInstancesByDay} from 'Components/meeting/selectors/groupMeetingInstancesByDay';
import {isMeetingInstanceVisibleInMeetingList} from 'Components/meeting/selectors/isMeetingInstanceVisibleInMeetingList';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {getDaySectionHeader} from 'Components/meeting/utils/getDaySectionHeader';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

export interface MeetingListProps {
  meetingSeries: MeetingSeries[];
  isLoading: boolean;
  hasLoadError: boolean;
  onRefresh: () => void;
  selfUser: User | undefined;
  scrollElementRef?: RefObject<HTMLElement | null>;
  useMeetingListVirtualizer?: UseMeetingListVirtualizer;
}

const filterVisibleMeetingInstances = (
  meetingInstancesByDay: MeetingInstancesByDay[],
  nowMilliseconds: number,
): MeetingInstancesByDay[] =>
  meetingInstancesByDay
    .map(dayGroup => ({
      ...dayGroup,
      meetingInstances: dayGroup.meetingInstances.filter(meetingInstance =>
        isMeetingInstanceVisibleInMeetingList(meetingInstance, nowMilliseconds),
      ),
    }))
    .filter(dayGroup => isNonEmptyArray(dayGroup.meetingInstances));

const getVisibleDayGroups = (meetingInstancesByDay: MeetingInstancesByDay[]): MeetingInstancesByDay[] =>
  meetingInstancesByDay.filter(dayGroup => isNonEmptyArray(dayGroup.meetingInstances));

const getMeetingDayDescriptionId = (meetingInstance: MeetingInstance): string => {
  const {meetingSeries, start} = meetingInstance;
  return `meeting-day-description-${meetingSeries.qualified_id.domain}-${meetingSeries.qualified_id.id}-${start.getTime()}`;
};

export const isMeetingListItemLastInDay = (nextItem: MeetingListTimelineItem | undefined, hasMore: boolean): boolean =>
  nextItem?.type === 'dayHeader' || (nextItem === undefined && !hasMore);

export const MeetingList = ({
  meetingSeries,
  isLoading,
  hasLoadError,
  onRefresh,
  selfUser,
  scrollElementRef,
  useMeetingListVirtualizer: useMeetingListVirtualizerDependency = useMeetingListVirtualizer,
}: MeetingListProps) => {
  const {translate, wallClock} = useApplicationContext();
  const [nowMilliseconds, setNowMilliseconds] = useState(() => wallClock.currentTimestampInMilliseconds);

  useEffect(() => {
    const id = wallClock.setInterval(
      () => setNowMilliseconds(wallClock.currentTimestampInMilliseconds),
      TIME_IN_MILLIS.SECOND,
    );
    return () => wallClock.clearInterval(id);
  }, [wallClock]);

  const visibleDayStartTimestamp = startOfDay(new Date(nowMilliseconds)).getTime();
  const visibleDayStart = useMemo(() => new Date(visibleDayStartTimestamp), [visibleDayStartTimestamp]);

  const initialMeetingInstancePage = useMemo(
    () => getMeetingInstancePage(meetingSeries, visibleDayStart, INITIAL_MEETING_INSTANCE_COUNT),
    [meetingSeries, visibleDayStart],
  );
  const [pagingState, setPagingState] = useState<{
    sourcePage: MeetingInstancePage;
    combinedPage: MeetingInstancePage;
  }>(() => ({
    sourcePage: initialMeetingInstancePage,
    combinedPage: initialMeetingInstancePage,
  }));
  const meetingInstancePage =
    pagingState.sourcePage === initialMeetingInstancePage ? pagingState.combinedPage : initialMeetingInstancePage;

  useEffect(() => {
    setPagingState({
      sourcePage: initialMeetingInstancePage,
      combinedPage: initialMeetingInstancePage,
    });
  }, [initialMeetingInstancePage]);

  const loadMoreMeetingInstances = useCallback(() => {
    setPagingState(previousPagingState => {
      const currentPage =
        previousPagingState.sourcePage === initialMeetingInstancePage
          ? previousPagingState.combinedPage
          : initialMeetingInstancePage;

      if (!currentPage.hasMore) {
        return previousPagingState;
      }

      const nextPage = getNextMeetingInstancePage(currentPage.cursor, LOAD_MORE_MEETING_INSTANCE_COUNT);

      return {
        sourcePage: initialMeetingInstancePage,
        combinedPage: {
          ...nextPage,
          meetingInstances: [...currentPage.meetingInstances, ...nextPage.meetingInstances],
        },
      };
    });
  }, [initialMeetingInstancePage]);

  const expandedMeetingInstancesByDay = useMemo(
    () => groupMeetingInstancesByDay(meetingInstancePage.meetingInstances),
    [meetingInstancePage.meetingInstances],
  );

  const meetingInstancesByDay = useMemo(
    () => filterVisibleMeetingInstances(expandedMeetingInstancesByDay, nowMilliseconds),
    [expandedMeetingInstancesByDay, nowMilliseconds],
  );

  const visibleDayGroups = useMemo(() => getVisibleDayGroups(meetingInstancesByDay), [meetingInstancesByDay]);
  const timelineItems = useMemo(() => getMeetingListTimelineItems(visibleDayGroups), [visibleDayGroups]);

  const getScrollElement = useCallback(() => scrollElementRef?.current ?? null, [scrollElementRef]);

  const getEstimatedItemHeight = useCallback(
    (itemIndex: number) =>
      timelineItems[itemIndex]?.type === 'dayHeader'
        ? MEETING_DAY_GROUP_SECTION_TOP_PADDING + MEETING_DAY_GROUP_HEADER_HEIGHT
        : MEETING_LIST_ITEM_HEIGHT,
    [timelineItems],
  );

  const getItemKey = useCallback(
    (itemIndex: number) => {
      const item = timelineItems[itemIndex];

      if (item === undefined) {
        return String(itemIndex);
      }

      if (item.type === 'dayHeader') {
        return `day-header-${item.day.toISOString()}`;
      }

      const {meetingSeries, start} = item.meetingInstance;
      return `meeting-${meetingSeries.qualified_id.domain}-${meetingSeries.qualified_id.id}-${start.getTime()}`;
    },
    [timelineItems],
  );

  const listVirtualizer = useMeetingListVirtualizerDependency({
    itemCount: timelineItems.length,
    getScrollElement,
    getEstimatedItemHeight,
    getItemKey,
  });

  useLoadMoreMeetingListItems({
    scrollElementRef,
    virtualizer: listVirtualizer,
    itemCount: timelineItems.length,
    hasMore: meetingInstancePage.hasMore,
    onLoadMore: loadMoreMeetingInstances,
    wallClock,
  });

  const hasVisibleMeetingInstances = visibleDayGroups.length > 0;
  const now = new Date(nowMilliseconds);

  if (isLoading && isNonEmptyArray(meetingSeries)) {
    return (
      <div css={emptyListContainerStyles} data-uie-name="meetings-list-loading">
        <Loading data-uie-name="status-loading" />
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div css={meetingListContainerStyles} data-uie-name="meetings-list-error">
        <p>{translate('meetings.list.loadError')}</p>
        <Button variant={ButtonVariant.TERTIARY} onClick={onRefresh} data-uie-name="do-refresh-meetings">
          {translate('meetings.list.refresh')}
        </Button>
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
          height: `${listVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {listVirtualizer.getVirtualItems().map(virtualItem => {
          const item = timelineItems[virtualItem.index];

          if (item === undefined) {
            return null;
          }

          const previousItem = timelineItems[virtualItem.index - 1];
          const nextItem = timelineItems[virtualItem.index + 1];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={listVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.type === 'dayHeader' ? (
                <div css={meetingDayHeaderStyles} role="heading" aria-level={2}>
                  {getDaySectionHeader(item.day, now, translate)}
                </div>
              ) : (
                <>
                  <span css={screenReaderOnlyStyles} id={getMeetingDayDescriptionId(item.meetingInstance)}>
                    {getDaySectionHeader(item.day, now, translate)}
                  </span>
                  <div
                    css={meetingListItemWrapperStyles}
                    aria-describedby={getMeetingDayDescriptionId(item.meetingInstance)}
                  >
                    <MeetingListItem
                      meetingInstance={item.meetingInstance}
                      nowMilliseconds={nowMilliseconds}
                      selfUser={selfUser}
                      isFirstInDay={previousItem?.type === 'dayHeader'}
                      isLastInDay={isMeetingListItemLastInDay(nextItem, meetingInstancePage.hasMore)}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
