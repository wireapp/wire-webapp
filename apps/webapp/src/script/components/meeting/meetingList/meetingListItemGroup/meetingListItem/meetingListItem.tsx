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

import {memo, useMemo, type FunctionComponent} from 'react';

import {formatMeetingTimeRange} from './formatMeetingTimeRange';
import {MeetingAction} from './meetingAction/meetingAction';
import {
  badgeWrapperStyles,
  calendarIconStyles,
  firstMeetingListItemStyles,
  itemStyles,
  lastMeetingListItemStyles,
  leftStyles,
  MEETING_LIST_ITEM_ONGOING_ATTR,
  metaStyles,
  onGoingMeetingStyles,
  rightStyles,
  titleStyles,
} from './meetingListItem.styles';
import {MeetingParticipants} from './meetingParticipants/meetingParticipants';
import {MeetingStatus} from './meetingStatus/meetingStatus';

import {useApplicationContext} from '../../../../../page/rootProvider';
import type {User} from '../../../../../repositories/entity/User';
import {CalendarIcon} from '../../../../../uiKit/dataDisplay/icon/calendarIcon';
import {useMeetingPrepModal} from '../../../meetingPrep/useMeetingPrepModal';
import {SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS} from '../../../scheduleMeetingModal/scheduleMeetingRecurrence';
import type {MeetingInstance} from '../../../types/meetingInstance';
import {useJoinMeetingCall} from '../../../useJoinMeetingCall';
import {
  getMeetingTemporalStatusAt,
  isAttendingMeetingInstance,
  isMeetingListItemOngoing,
} from '../../../utils/meetingStatusUtil';

interface MeetingListItemProps {
  meetingInstance: MeetingInstance;
  selfUser: User | undefined;
  nowMilliseconds?: number;
  isFirstInDay?: boolean;
  isLastInDay?: boolean;
}

const MeetingListItemComponent: FunctionComponent<MeetingListItemProps> = ({
  meetingInstance,
  selfUser,
  nowMilliseconds: providedNowMilliseconds,
  isFirstInDay = false,
  isLastInDay = false,
}: MeetingListItemProps) => {
  const {meetingSeries, start, end} = meetingInstance;
  const {title, recurrence} = meetingSeries;
  const {translate, clock} = useApplicationContext();
  const nowMilliseconds = providedNowMilliseconds ?? clock.currentUnixEpochMilliseconds;
  const {isJoinDisabled, isCallActive: isConversationCallActive} = useJoinMeetingCall(
    meetingSeries.qualified_conversation,
  );

  const now = useMemo(() => {
    return new Date(nowMilliseconds);
  }, [nowMilliseconds]);

  const temporalStatus = useMemo(() => {
    return getMeetingTemporalStatusAt(now, start, end);
  }, [now, start, end]);
  const isCallActive = isAttendingMeetingInstance(isConversationCallActive, temporalStatus);

  const openPrep = (): void => {
    useMeetingPrepModal.getState().open({
      meetingTitle: title,
      meetingStartTime: start.toISOString(),
      meetingEndTime: end.toISOString(),
      qualifiedOrganizerId: meetingSeries.qualified_creator,
      qualifiedMeetingId: meetingSeries.qualified_id,
      qualifiedConversationId: meetingSeries.qualified_conversation,
    });
  };

  const time = formatMeetingTimeRange(start, end);

  const isOngoing = isMeetingListItemOngoing(temporalStatus, isCallActive);

  return (
    <div
      css={[
        itemStyles,
        isFirstInDay && firstMeetingListItemStyles,
        isLastInDay && lastMeetingListItemStyles,
        isOngoing && onGoingMeetingStyles,
      ]}
      data-uie-name="item-meeting"
      data-uie-value={title}
      {...(isOngoing ? {[MEETING_LIST_ITEM_ONGOING_ATTR]: ''} : {})}
    >
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
        <MeetingParticipants
          qualifiedConversation={meetingSeries.qualified_conversation}
          qualifiedCreator={meetingSeries.qualified_creator}
          isOngoing={isOngoing}
        />
        <MeetingStatus
          temporalStatus={temporalStatus}
          joinMeeting={openPrep}
          isJoinDisabled={isJoinDisabled}
          isCallActive={isCallActive}
        />
        <MeetingAction
          meetingInstance={meetingInstance}
          selfUser={selfUser}
          joinMeeting={openPrep}
          isJoinDisabled={isJoinDisabled}
        />
      </div>
    </div>
  );
};

export const MeetingListItem = memo(MeetingListItemComponent);
MeetingListItem.displayName = 'MeetingListItem';
