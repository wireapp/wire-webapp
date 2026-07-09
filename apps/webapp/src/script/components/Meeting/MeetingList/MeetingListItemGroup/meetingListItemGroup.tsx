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

import {MeetingListItem} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/meetingListItem';
import {
  listStyles,
  sectionHeaderStyles,
  sectionStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/meetingListItemGroup.styles';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {useApplicationContext} from 'src/script/page/rootProvider';

interface MeetingListItemGroupProps {
  header?: string;
  meetingInstances: MeetingInstance[];
  nowMilliseconds?: number;
}

const MeetingListItemGroupComponent = ({header, meetingInstances, nowMilliseconds}: MeetingListItemGroupProps) => {
  const {translate} = useApplicationContext();
  const isEmpty = meetingInstances.length === 0;

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

      <div css={listStyles}>
        {meetingInstances.map(meetingInstance => (
          <MeetingListItem
            key={`meeting-list-item-${meetingInstance.meetingSeries.qualified_id.id}-${meetingInstance.meetingSeries.qualified_id.domain}-${meetingInstance.start.getTime()}`}
            meetingInstance={meetingInstance}
            nowMilliseconds={nowMilliseconds}
          />
        ))}
      </div>
    </section>
  );
};

export const MeetingListItemGroup = memo(MeetingListItemGroupComponent);
MeetingListItemGroup.displayName = 'MeetingListItemGroup';
