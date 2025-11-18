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

import {memo, useContext, useMemo} from 'react';

import {ClockContext} from 'Components/Meeting/ClockContext';
import {MeetingTabsTitle, TodayAndOngoingSectionProps} from 'Components/Meeting/MeetingList/MeetingList';
import {MeetingListItemGroup} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup';
import {groupByStartHour} from 'Components/Meeting/utils/MeetingDatesUtil';
import {getOnGoingMeetingsAt} from 'Components/Meeting/utils/MeetingStatusUtil';

const TodayAndOngoingSectionComponent = ({
  meetingsToday,
  headerForOnGoing,
  headerForToday,
}: TodayAndOngoingSectionProps) => {
  const nowMs = useContext(ClockContext);

  const onGoingMeetings = useMemo(() => getOnGoingMeetingsAt(meetingsToday, nowMs), [meetingsToday, nowMs]);
  const ongoingIds = useMemo(() => new Set(onGoingMeetings.map(meeting => meeting.conversation_id)), [onGoingMeetings]);

  // Exclude ongoing items from today's grouped list
  const todayNotOngoing = useMemo(
    () => meetingsToday.filter(meeting => !ongoingIds.has(meeting.conversation_id)),
    [meetingsToday, ongoingIds],
  );
  const groupedMeetingsToday = useMemo(() => groupByStartHour(todayNotOngoing), [todayNotOngoing]);

  return (
    <>
      {onGoingMeetings.length > 0 && (
        <MeetingListItemGroup
          header={headerForOnGoing}
          view={MeetingTabsTitle.PAST}
          groupedMeetings={{0: onGoingMeetings}}
        />
      )}
      <MeetingListItemGroup header={headerForToday} groupedMeetings={groupedMeetingsToday} />
    </>
  );
};

export const TodayAndOngoingSection = memo(TodayAndOngoingSectionComponent);
TodayAndOngoingSection.displayName = 'TodayAndOngoingSection';
