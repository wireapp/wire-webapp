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

import {memo} from 'react';

import {set} from 'date-fns';

import {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {MeetingListItem} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingListItem';
import {
  hourLabelStyles,
  sectionHeaderStyles,
  sectionStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup.styles';
import {useApplicationContext} from 'src/script/page/rootProvider';

interface MeetingListItemGroupProps {
  header?: string;
  groupedMeetings: Record<number, Meeting[]>;
  groupBy?: MeetingGroupBy;
  nowMs?: number;
}

export enum MeetingGroupBy {
  NONE = 'none',
  HOUR = 'hour',
}

const MeetingListItemGroupComponent = ({
  header,
  groupedMeetings,
  groupBy = MeetingGroupBy.HOUR,
  nowMs,
}: MeetingListItemGroupProps) => {
  const {translate} = useApplicationContext();
  const formatHourLabel = (date: string) =>
    set(new Date(date), {minutes: 0, seconds: 0, milliseconds: 0}).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  // Sort by hour key
  const groups = Object.entries(groupedMeetings).toSorted(([meetingA], [meetingB]) => +meetingA - +meetingB);
  const nonEmptyGroups = groups.filter(([, items]) => items?.length !== 0 && !Number.isNaN(items?.length));
  const isEmpty = nonEmptyGroups.length === 0;

  if (isEmpty) {
    return (
      <section css={sectionStyles}>
        {header !== undefined && header !== '' && <div css={sectionHeaderStyles}>{header}</div>}
        <span className="subline">{translate('meetings.noScheduledMeetings')}</span>
      </section>
    );
  }

  return (
    <section css={sectionStyles}>
      {header !== undefined && header !== '' && <div css={sectionHeaderStyles}>{header}</div>}

      {groupBy === MeetingGroupBy.NONE && (
        <div>
          {nonEmptyGroups.flatMap(([, items]) =>
            items.map(item => (
              <MeetingListItem key={`meeting-list-item-${item.title}-${item.start_date}`} nowMs={nowMs} {...item} />
            )),
          )}
        </div>
      )}

      {groupBy === MeetingGroupBy.HOUR &&
        nonEmptyGroups.map(([key, items]) => (
          <div key={`meeting-list-item-group-header-${key}`}>
            <div css={hourLabelStyles}>
              <time>{formatHourLabel(items[0].start_date)}</time>
            </div>
            <div>
              {items.map(item => (
                <MeetingListItem key={`meeting-list-item-${item.title}-${item.start_date}`} nowMs={nowMs} {...item} />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
};

export const MeetingListItemGroup = memo(MeetingListItemGroupComponent);
MeetingListItemGroup.displayName = 'MeetingListItemGroup';
