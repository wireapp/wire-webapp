/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import cx from 'classnames';

import {useRelativeTimestamp} from 'src/script/hooks/useRelativeTimestamp';

import {Marker} from '../../utils/messagesGroup';
import {MessageTime} from '../MessageTime';

const classes: Record<Marker['type'], string> = {
  day: 'message-timestamp-visible message-timestamp-day',
  hour: 'message-timestamp-visible',
  unread: 'message-timestamp-visible message-timestamp-unread',
};

export function MarkerComponent({marker}: {marker: Marker}) {
  const timeAgo = useRelativeTimestamp(marker.timestamp);
  const timeAgoDay = useRelativeTimestamp(marker.timestamp, true);

  return (
    <div className={cx('message-header message-timestamp', classes[marker.type])}>
      <div className="message-header-icon">
        <span className="message-unread-dot" />
      </div>

      <h3 className="message-header-label">
        <MessageTime timestamp={marker.timestamp} className="label-xs" data-timestamp-type="normal">
          {timeAgo}
        </MessageTime>

        <MessageTime timestamp={marker.timestamp} data-timestamp-type="day" className="label-bold-xs">
          {timeAgoDay}
        </MessageTime>
      </h3>
    </div>
  );
}
