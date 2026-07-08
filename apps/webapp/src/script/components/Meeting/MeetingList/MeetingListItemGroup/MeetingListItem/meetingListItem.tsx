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

import {CalendarIcon} from '@wireapp/react-ui-kit';

import {meetingInstanceToLegacyMeeting} from 'Components/Meeting/meetingInstanceToLegacyMeeting';
import {MeetingAction} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction';
import {
  badgeWrapperStyles,
  calendarIconStyles,
  itemStyles,
  leftStyles,
  metaStyles,
  onGoingMeetingStyles,
  rightStyles,
  titleStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/meetingListItem.styles';
import {MeetingParticipants} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingParticipants/meetingParticipants';
import {MeetingStatus} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/MeetingStatus';
import {SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/meetingStatusUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatLocale} from 'Util/timeUtil';

interface MeetingListItemProps {
  instance: MeetingInstance;
  nowMs?: number;
}

const MeetingListItemComponent = ({instance, nowMs}: MeetingListItemProps) => {
  const {series, start, end} = instance;
  const {title, recurrence, attending} = series;
  const {translate, wallClock} = useApplicationContext();
  const timestamp = nowMs ?? wallClock.currentTimestampInMilliseconds;

  const startDateIso = start.toISOString();
  const endDateIso = end.toISOString();

  const time = useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const isPast = timestamp > endMs;
    const isOngoing = timestamp >= startMs && timestamp < endMs;

    if (isPast) {
      const dayOfWeek = formatLocale(start, 'EEEE');
      const month = formatLocale(start, 'MMMM');
      const day = formatLocale(start, 'd');
      const startedAtTime = formatLocale(start, 'h:mm a');
      return `${dayOfWeek}, ${month} ${day} • ${translate('meetings.meetingStatus.startedAt', {time: startedAtTime})}`;
    }

    if (isOngoing) {
      const startedAtTime = formatLocale(start, 'h:mm a');
      return translate('meetings.meetingStatus.startedAt', {time: startedAtTime});
    }

    const sameMeridiem = formatLocale(start, 'a') === formatLocale(end, 'a');
    return sameMeridiem
      ? `${formatLocale(start, 'h:mm')} – ${formatLocale(end, 'h:mm a')}`
      : `${formatLocale(start, 'h:mm a')} – ${formatLocale(end, 'h:mm a')}`;
  }, [end, start, timestamp, translate]);

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(timestamp, startDateIso, endDateIso, attending),
    [timestamp, startDateIso, endDateIso, attending],
  );

  const isOngoing = meetingStatus === MeetingStatuses.ON_GOING || meetingStatus === MeetingStatuses.PARTICIPATING;
  const meeting = useMemo(() => meetingInstanceToLegacyMeeting(instance), [instance]);

  return (
    <div css={[itemStyles, isOngoing && onGoingMeetingStyles]}>
      <div css={leftStyles}>
        <div css={calendarIconStyles}>
          <CalendarIcon />
        </div>
        <div>
          <div css={titleStyles}>{title}</div>
          <div css={metaStyles}>
            {time}
            {recurrence !== 'doesNotRepeat' && (
              <div css={badgeWrapperStyles}>
                <span>{translate(SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS[recurrence])}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div css={rightStyles}>
        <MeetingParticipants qualifiedConversation={series.qualified_conversation} isOngoing={isOngoing} />
        <MeetingStatus start_date={startDateIso} end_date={endDateIso} attending={attending} nowMs={timestamp} />
        <MeetingAction meeting={meeting} />
      </div>
    </div>
  );
};

export const MeetingListItem = memo(MeetingListItemComponent);
MeetingListItem.displayName = 'MeetingListItem';
