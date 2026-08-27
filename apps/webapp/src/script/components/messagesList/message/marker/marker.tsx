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

import {useLayoutEffect, useMemo, useRef} from 'react';

import {SerializedStyles, css} from '@emotion/react';

import {TabIndex} from '@wireapp/react-ui-kit';

import {ScrollToElement} from 'Components/messagesList/message/types';
import {createRelativeTimestampFormatter, useRelativeTimestamp} from 'src/script/hooks/useRelativeTimestamp';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {dayMarkerStyle, baseMarkerStyle, notVirtualizedMarkerStyle} from './marker.styles';
import {getMessagesGroupLabel} from './marker.utils';

import {Config} from '../../../../Config';
import {Marker} from '../../utils/messagesGroup';
import {MessageTime} from '../messageTime';

const markerStyles: Partial<Record<Marker['type'], SerializedStyles>> = {
  day: dayMarkerStyle,
};

interface Props {
  marker: Marker;
  scrollTo?: ScrollToElement;
  measureElement?: (element: HTMLElement | null) => void;
  index?: number;
}

export const MarkerComponent = ({marker, scrollTo, measureElement, index}: Props) => {
  const {translate} = useApplicationContext();
  const elementRef = useRef<HTMLDivElement | null>(null);

  const isDay = marker.type === 'day';
  const relativeTimestampFormatter = useMemo(() => {
    return createRelativeTimestampFormatter({
      justNow: translate('conversationJustNow'),
      today: translate('conversationToday'),
      yesterday: translate('conversationYesterday'),
    });
  }, [translate]);
  const messageGroupLabelFormatter = useMemo(() => {
    return (timestamp: number, isTimestampDay: boolean) => {
      if (isTimestampDay) {
        return getMessagesGroupLabel(timestamp, {
          today: translate('conversationToday'),
          yesterday: translate('conversationYesterday'),
        });
      }

      return relativeTimestampFormatter(timestamp, false);
    };
  }, [relativeTimestampFormatter, translate]);
  const timeAgo = useRelativeTimestamp(marker.timestamp, isDay, messageGroupLabelFormatter);

  const isVirtualizedMessagesListEnabled = Config.getConfig().FEATURE.ENABLE_VIRTUALIZED_MESSAGES_LIST;

  const style = css`
    ${baseMarkerStyle} ${markerStyles[marker.type]} ${isVirtualizedMessagesListEnabled ? notVirtualizedMarkerStyle : ''}
  `;

  useLayoutEffect(() => {
    if (!isVirtualizedMessagesListEnabled && marker.type === 'unread' && elementRef.current) {
      scrollTo?.({element: elementRef.current}, true);
    }
  }, [isVirtualizedMessagesListEnabled, marker.type, scrollTo]);

  return (
    <div
      className="message-header"
      css={style}
      data-index={index}
      ref={ref => {
        measureElement?.(ref);
        elementRef.current = ref;
      }}
    >
      <div className="message-header-icon">
        {marker.type === 'unread' && (
          <span
            className="message-unread-dot dot-md"
            role="img"
            aria-label={translate('accessibility.unreadMessagesSeparator')}
            tabIndex={TabIndex.FOCUSABLE}
            title={translate('accessibility.unreadMessagesSeparator')}
          />
        )}
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
