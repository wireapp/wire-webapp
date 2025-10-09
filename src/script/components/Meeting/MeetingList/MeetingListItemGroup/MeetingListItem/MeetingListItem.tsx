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

import {CalendarIcon, CallIcon} from '@wireapp/react-ui-kit';

import {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {MeetingAction} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction';
import {
  badgeWrapperStyles,
  callingIconStyles,
  itemStyles,
  leftStyles,
  metaStyles,
  rightStyles,
  titleStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingListItem.styles';
import {formatLocale} from 'Util/TimeUtil';

export const MeetingListItem = ({title, start_date, end_date, schedule}: Meeting) => {
  const start = new Date(start_date);
  const end = new Date(end_date);

  const sameMeridiem = formatLocale(start, 'a') === formatLocale(end, 'a');

  const time = sameMeridiem
    ? `${formatLocale(start, 'h:mm')} – ${formatLocale(end, 'h:mm a')}`
    : `${formatLocale(start, 'h:mm a')} – ${formatLocale(end, 'h:mm a')}`;

  return (
    <div css={itemStyles}>
      <div css={leftStyles}>
        <div css={callingIconStyles}>
          <CallIcon />
        </div>
        <div>
          <div css={titleStyles}>{title}</div>
          <div css={metaStyles}>
            <CalendarIcon css={{marginRight: '4px'}} height={12} /> {time}
            {schedule && (
              <div css={badgeWrapperStyles}>
                <span>{schedule}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div css={rightStyles}>
        <MeetingAction />
      </div>
    </div>
  );
};
