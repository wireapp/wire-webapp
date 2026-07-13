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
import {useJoinMeetingCall} from 'Components/Meeting/useJoinMeetingCall';
import {getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/meetingStatusUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatLocale} from 'Util/timeUtil';

interface MeetingListItemProps {
  meetingInstance: MeetingInstance;
  nowMilliseconds?: number;
}

const MeetingListItemComponent = ({
  meetingInstance,
  nowMilliseconds: providedNowMilliseconds,
}: MeetingListItemProps) => {
  const {meetingSeries, start, end} = meetingInstance;
  const {title, recurrence} = meetingSeries;
  const {translate, wallClock} = useApplicationContext();
  const nowMilliseconds = providedNowMilliseconds ?? wallClock.currentTimestampInMilliseconds;
  const {isCallActive} = useJoinMeetingCall(meetingSeries.qualified_conversation);

  const startDateIso = start.toISOString();
  const endDateIso = end.toISOString();

  const time = useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const isPast = nowMilliseconds > endMs;
    const isOngoing = nowMilliseconds >= startMs && nowMilliseconds < endMs;

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
  }, [end, start, nowMilliseconds, translate]);

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(nowMilliseconds, startDateIso, endDateIso, isCallActive),
    [nowMilliseconds, startDateIso, endDateIso, isCallActive],
  );

  const isOngoing = meetingStatus === MeetingStatuses.ON_GOING || meetingStatus === MeetingStatuses.PARTICIPATING;

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
        <MeetingParticipants qualifiedConversation={meetingSeries.qualified_conversation} isOngoing={isOngoing} />
        <MeetingStatus
          qualifiedConversation={meetingSeries.qualified_conversation}
          start_date={startDateIso}
          end_date={endDateIso}
          nowMilliseconds={nowMilliseconds}
        />
        <MeetingAction meetingInstance={meetingInstance} />
      </div>
    </div>
  );
};

export const MeetingListItem = memo(MeetingListItemComponent);
MeetingListItem.displayName = 'MeetingListItem';
