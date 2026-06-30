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

import {useMemo} from 'react';

import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {createRelativeTimestampFormatter, useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {useApplicationContext} from 'src/script/page/rootProvider';

interface CellsTableDateColumnProps {
  timestamp: number;
}

export const CellsTableDateColumn = ({timestamp}: CellsTableDateColumnProps) => {
  const {translate} = useApplicationContext();
  const relativeTimestampFormatter = useMemo(() => {
    return createRelativeTimestampFormatter({
      justNow: translate('conversationJustNow'),
      today: translate('conversationToday'),
      yesterday: translate('conversationYesterday'),
    });
  }, [translate]);
  const timeAgo = useRelativeTimestamp(timestamp, false, relativeTimestampFormatter);
  return (
    <MessageTime timestamp={timestamp} data-timestamp-type="normal">
      {timeAgo}
    </MessageTime>
  );
};
