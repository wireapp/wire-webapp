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

import {Button, ButtonVariant, CallIcon} from '@wireapp/react-ui-kit';

import {ClockContext} from 'Components/Meeting/ClockContext';
import {
  joinButtonContainerStyles,
  joinButtonIconStyles,
  joinButtonStyles,
  participatingStatusIconStyles,
  participatingStatusStyles,
  startingSoonStatusStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/MeetingStatus.styles';
import {getCountdownSeconds, getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/MeetingStatusUtil';
import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';

export interface MeetingStatusProps {
  start_date: string;
  end_date: string;
  attending?: boolean;
}

const MeetingStatusComponent = ({start_date, end_date, attending}: MeetingStatusProps) => {
  const nowMs = useContext(ClockContext);

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(nowMs, start_date, end_date, attending),
    [nowMs, start_date, end_date, attending],
  );

  if (meetingStatus === MeetingStatuses.PARTICIPATING) {
    return (
      <div css={participatingStatusStyles}>
        <CallIcon css={participatingStatusIconStyles} /> {t('meetings.meetingStatus.participating')}
      </div>
    );
  }

  if (meetingStatus === MeetingStatuses.ON_GOING) {
    return (
      <div css={joinButtonContainerStyles}>
        <Button css={joinButtonStyles} variant={ButtonVariant.PRIMARY}>
          <CallIcon css={joinButtonIconStyles} /> {t('callJoin')}
        </Button>
      </div>
    );
  }

  if (meetingStatus === MeetingStatuses.STARTING_SOON) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const countdown = useMemo(() => {
      const seconds = getCountdownSeconds(nowMs, start_date);
      return formatSeconds(seconds);
    }, [nowMs, start_date]);
    return <div css={startingSoonStatusStyles}>{t('meetings.meetingStatus.startingIn', {countdown})}</div>;
  }

  return null;
};

export const MeetingStatus = memo(MeetingStatusComponent);
MeetingStatus.displayName = 'MeetingStatus';
