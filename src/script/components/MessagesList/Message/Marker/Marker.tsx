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

import {useLayoutEffect} from 'react';

import {SerializedStyles, css} from '@emotion/react';

import {useRelativeTimestamp} from 'src/script/hooks/useRelativeTimestamp';

import {dayMarkerStyle, baseMarkerStyle} from './Marker.styles';
import {getMessagesGroupLabel} from './utils';

import {Marker} from '../../utils/messagesGroup';
import {MessageTime} from '../MessageTime';

const markerStyles: Partial<Record<Marker['type'], SerializedStyles>> = {
  day: dayMarkerStyle,
};

interface Props {
  marker: Marker;
  scrollTo: (isUnread: boolean) => void;
}

export const MarkerComponent = ({marker, scrollTo}: Props) => {
  const isDay = marker.type === 'day';
  const timeAgo = useRelativeTimestamp(marker.timestamp, isDay, isDay ? getMessagesGroupLabel : undefined);

  const style = css`
    ${baseMarkerStyle} ${markerStyles[marker.type]}
  `;

  useLayoutEffect(() => {
    if (marker.type === 'unread') {
      scrollTo(true);
    }
  }, []);

  return (
    <div className="message-header" css={style}>
      <div className="message-header-icon">
        {marker.type === 'unread' && <span className="message-unread-dot dot-md" />}
      </div>

      <h3 className="message-header-label">
        <MessageTime
          timestamp={marker.timestamp}
          data-timestamp-type={isDay ? 'day' : 'normal'}
          className={isDay ? 'label-bold-xs' : 'label-xs'}
        >
          {timeAgo}
        </MessageTime>
      </h3>
    </div>
  );
};
