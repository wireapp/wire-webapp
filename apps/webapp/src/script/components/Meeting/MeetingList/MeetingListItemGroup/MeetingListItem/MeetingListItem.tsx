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

import {CalendarIcon, CallIcon} from '@wireapp/react-ui-kit';

import {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {MeetingAction} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction';
import {
  badgeWrapperStyles,
  callingIconStyles,
  itemStyles,
  leftStyles,
  metaStyles,
  onGoingMeetingStyles,
  rightStyles,
  titleStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingListItem.styles';
import {MeetingStatus} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/MeetingStatus';
import {SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import {getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/MeetingStatusUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatLocale} from 'Util/timeUtil';

interface MeetingListItemProps extends Meeting {
  nowMs?: number;
}

const MeetingListItemComponent = ({
  title,
  start_date,
  end_date,
  recurrence,
  attending,
  nowMs,
}: MeetingListItemProps) => {
  const {translate} = useApplicationContext();
  const timestamp = nowMs ?? Date.now();

  const {time, showCalendarIcon} = useMemo(() => {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const isPast = timestamp > endMs;
    const isOngoing = timestamp >= startMs && timestamp < endMs;

    if (isPast) {
      const dayOfWeek = formatLocale(start, 'EEEE');
      const month = formatLocale(start, 'MMMM');
      const day = formatLocale(start, 'd');
      const time = formatLocale(start, 'h:mm a');
      return {
        time: `${dayOfWeek}, ${month} ${day} • ${translate('meetings.meetingStatus.startedAt', {time})}`,
        showCalendarIcon: false,
      };
    }

    if (isOngoing) {
      const time = formatLocale(start, 'h:mm a');
      return {
        time: translate('meetings.meetingStatus.startedAt', {time}),
        showCalendarIcon: false,
      };
    }

    const sameMeridiem = formatLocale(start, 'a') === formatLocale(end, 'a');
    const timeRange = sameMeridiem
      ? `${formatLocale(start, 'h:mm')} – ${formatLocale(end, 'h:mm a')}`
      : `${formatLocale(start, 'h:mm a')} – ${formatLocale(end, 'h:mm a')}`;
    return {
      time: timeRange,
      showCalendarIcon: true,
    };
  }, [end_date, start_date, timestamp, translate]);

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(timestamp, start_date, end_date, attending),
    [timestamp, start_date, end_date, attending],
  );

  const isOngoing = meetingStatus === MeetingStatuses.ON_GOING || meetingStatus === MeetingStatuses.PARTICIPATING;

  return (
    <div css={[itemStyles, isOngoing && onGoingMeetingStyles]}>
      <div css={leftStyles}>
        <div css={callingIconStyles}>
          <CallIcon />
        </div>
        <div>
          <div css={titleStyles}>{title}</div>
          <div css={metaStyles}>
            {showCalendarIcon && <CalendarIcon css={{marginRight: '4px'}} height={12} />}
            {time}
            {recurrence && (
              <div css={badgeWrapperStyles}>
                <span>{translate(SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS[recurrence])}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div css={rightStyles}>
        <MeetingStatus start_date={start_date} end_date={end_date} attending={attending} nowMs={timestamp} />
        <MeetingAction />
      </div>
    </div>
  );
};

export const MeetingListItem = memo(MeetingListItemComponent);
MeetingListItem.displayName = 'MeetingListItem';
