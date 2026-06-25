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
} from 'Components/meeting/emptymeetinglist/emptyliststyles';
import {useMeetingActions} from 'Components/meeting/usemeetingactions';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const EmptyMeetingList = () => {
  const {translate} = useApplicationContext();
  const {handleMeetNow, handleScheduleMeeting} = useMeetingActions();

  return (
    <div css={emptyListStyles} data-uie-name="empty-meetings-list">
      <p css={emptyListHeadingStyles}>{translate('meetings.noMeetingsText')}</p>
      <p css={emptyListBodyStyles}>{translate('meetings.startMeetingHelp')}</p>
      <div css={emptyListActionButtonContainerStyles}>
        <Button variant={ButtonVariant.TERTIARY} onClick={handleMeetNow} data-uie-name="meet-now">
          <CallIcon css={emptyListActionButtonsStyles} /> {translate('meetings.action.meetNow')}
        </Button>
        <Button variant={ButtonVariant.TERTIARY} onClick={handleScheduleMeeting} data-uie-name="schedule-meeting">
          <CalendarIcon css={emptyListActionButtonsStyles} /> {translate('meetings.action.scheduleMeeting')}
        </Button>
      </div>
    </div>
  );
};
