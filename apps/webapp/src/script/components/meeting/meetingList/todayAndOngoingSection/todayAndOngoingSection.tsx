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

import {memo, useMemo} from 'react';

import {TodayAndOngoingSectionProps} from 'Components/meeting/meetinglist/meetinglist';
import {
  MeetingGroupBy,
  MeetingListItemGroup,
} from 'Components/meeting/meetinglist/meetinglistitemgroup/meetinglistitemgroup';
import {groupByStartHour} from 'Components/meeting/utils/meetingdatesutil';
import {getOnGoingMeetingsAt} from 'Components/meeting/utils/meetingstatusutil';

const TodayAndOngoingSectionComponent = ({meetingsToday, headerForToday, nowMs}: TodayAndOngoingSectionProps) => {
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
        <MeetingListItemGroup groupBy={MeetingGroupBy.NONE} groupedMeetings={{0: onGoingMeetings}} nowMs={nowMs} />
      )}
      <MeetingListItemGroup header={headerForToday} groupedMeetings={groupedMeetingsToday} nowMs={nowMs} />
    </>
  );
};

export const TodayAndOngoingSection = memo(TodayAndOngoingSectionComponent);
TodayAndOngoingSection.displayName = 'TodayAndOngoingSection';
