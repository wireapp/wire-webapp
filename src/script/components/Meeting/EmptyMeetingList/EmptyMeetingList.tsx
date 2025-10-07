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

import {Button, ButtonVariant, CalendarIcon, CallIcon} from '@wireapp/react-ui-kit';

import {
  emptyListActionButtonContainerStyles,
  emptyListActionButtonsStyles,
  emptyListHelpStyles,
  emptyListStyles,
} from 'Components/Meeting/EmptyMeetingList/EmptyListStyles';
import {t} from 'Util/LocalizerUtil';

interface EmptyMeetingListProps {
  showCallingButton?: boolean;
  text?: string;
  helperText?: string;
}

export const EmptyMeetingList = ({text, helperText, showCallingButton = true}: EmptyMeetingListProps) => {
  return (
    <div css={emptyListStyles}>
      <div>{text ?? t('meetings.noMeetingsText')}</div>
      <div css={emptyListHelpStyles}>{helperText ?? t('meetings.startMeetingHelp')}</div>
      {showCallingButton && (
        <div css={emptyListActionButtonContainerStyles}>
          <Button variant={ButtonVariant.TERTIARY}>
            <CallIcon css={emptyListActionButtonsStyles} /> Meet Now
          </Button>
          <Button variant={ButtonVariant.TERTIARY}>
            <CalendarIcon css={emptyListActionButtonsStyles} /> Schedule Meeting
          </Button>
        </div>
      )}
    </div>
  );
};
