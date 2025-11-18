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

import {memo} from 'react';

import {set} from 'date-fns';

import {Meeting, MeetingTabsTitle} from 'Components/Meeting/MeetingList/MeetingList';
import {MeetingListItem} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingListItem';
import {
  hourLabelStyles,
  sectionHeaderStyles,
  sectionStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItemGroup.styles';
import {MeetingTab} from 'Components/Meeting/MeetingList/MeetingTabs/MeetingTabs';
import {t} from 'Util/LocalizerUtil';

interface MeetingListItemGroupProps {
  header?: string;
  groupedMeetings: Record<number, Meeting[]>;
  view?: MeetingTab;
}

export enum MeetingGroupBy {
  NONE = 'none',
  HOUR = 'hour',
}

const MeetingListItemGroupComponent = ({
  header,
  groupedMeetings,
  view = MeetingTabsTitle.NEXT,
}: MeetingListItemGroupProps) => {
  const groupBy = view === MeetingTabsTitle.PAST ? MeetingGroupBy.NONE : MeetingGroupBy.HOUR;

  const formatHourLabel = (date: string) =>
    set(new Date(date), {minutes: 0, seconds: 0, milliseconds: 0}).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  // Sort by hour key
  const groups = Object.entries(groupedMeetings).sort(([meetingA], [meetingB]) => +meetingA - +meetingB);
  const nonEmptyGroups = groups.filter(([, items]) => items?.length);
  const isEmpty = nonEmptyGroups.length === 0;

  if (isEmpty) {
    return (
      <section css={sectionStyles}>
        {header && <div css={sectionHeaderStyles}>{header}</div>}
        <span className="subline">{t('meetings.noScheduledMeetings')}</span>
      </section>
    );
  }

  return (
    <section css={sectionStyles}>
      {header && <div css={sectionHeaderStyles}>{header}</div>}

      {groupBy === MeetingGroupBy.NONE && (
        <div>
          {nonEmptyGroups.flatMap(([, items]) =>
            items.map(item => <MeetingListItem key={`meeting-list-item-${item.title}-${item.start_date}`} {...item} />),
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
                <MeetingListItem key={`meeting-list-item-${item.title}-${item.start_date}`} {...item} />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
};

export const MeetingListItemGroup = memo(MeetingListItemGroupComponent);
MeetingListItemGroup.displayName = 'MeetingListItemGroup';
