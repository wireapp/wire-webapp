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

import {Button, ButtonVariant, CalendarIcon, CallIcon} from '@wireapp/react-ui-kit';

import {
  emptyListActionButtonContainerStyles,
  emptyListActionButtonsStyles,
  emptyListBodyStyles,
  emptyListHeadingStyles,
  emptyListStyles,
} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {useMeetingActions} from 'Components/Meeting/useMeetingActions';
import {t} from 'Util/localizerUtil';

export const EmptyMeetingList = () => {
  const {handleMeetNow, handleScheduleMeeting} = useMeetingActions();

  return (
    <div css={emptyListStyles} data-uie-name="empty-meetings-list">
      <p css={emptyListHeadingStyles}>{t('meetings.noMeetingsText')}</p>
      <p css={emptyListBodyStyles}>{t('meetings.startMeetingHelp')}</p>
      <div css={emptyListActionButtonContainerStyles}>
        <Button variant={ButtonVariant.TERTIARY} onClick={handleMeetNow} data-uie-name="meet-now">
          <CallIcon css={emptyListActionButtonsStyles} /> {t('meetings.action.meetNow')}
        </Button>
        <Button variant={ButtonVariant.TERTIARY} onClick={handleScheduleMeeting} data-uie-name="schedule-meeting">
          <CalendarIcon css={emptyListActionButtonsStyles} /> {t('meetings.action.scheduleMeeting')}
        </Button>
      </div>
    </div>
  );
};
