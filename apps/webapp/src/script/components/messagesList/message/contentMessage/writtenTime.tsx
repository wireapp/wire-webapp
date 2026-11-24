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

import {useMemo, type FunctionComponent} from 'react';

import {writtenTime} from './pendingClock.styles';

import {createRelativeTimestampFormatter, useRelativeTimestamp} from '../../../../hooks/useRelativeTimestamp';
import {useApplicationContext} from '../../../../page/rootProvider';
import {TIME_IN_MILLIS, fromUnixTime, isYoungerThan1Hour} from '../../../../util/timeUtil';

/** A message sent at least this long after it was written says when it was written */
const writtenTimeShownAfterMinutes = 5;
export const WRITTEN_TIME_SHOWN_AFTER_MILLISECONDS = writtenTimeShownAfterMinutes * TIME_IN_MILLIS.MINUTE;

interface WrittenTimeProps {
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

export const WrittenTime: FunctionComponent<WrittenTimeProps> = ({timestamp}) => {
  const {translate} = useApplicationContext();
  const formatter = useMemo(() => {
    return createRelativeTimestampFormatter({
      justNow: translate('conversationJustNow'),
      today: translate('conversationToday'),
      yesterday: translate('conversationYesterday'),
    });
  }, [translate]);
  const time = useRelativeTimestamp(timestamp, false, formatter);
  const isRelative = isYoungerThan1Hour(fromUnixTime(timestamp / TIME_IN_MILLIS.SECOND));
  const label = translate(isRelative ? 'outboxWrittenTimeAgo' : 'outboxWrittenTimeAt', {time});

  return (
    <span css={writtenTime} data-uie-name="status-message-written-time">
      {label}
    </span>
  );
};
