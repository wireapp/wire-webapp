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
  instances: MeetingInstance[];
  nowMs?: number;
}

const MeetingListItemGroupComponent = ({header, instances, nowMs}: MeetingListItemGroupProps) => {
  const {translate} = useApplicationContext();
  const isEmpty = instances.length === 0;

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
        {instances.map(instance => (
          <MeetingListItem
            key={`meeting-list-item-${instance.series.qualified_id.id}-${instance.series.qualified_id.domain}-${instance.start.getTime()}`}
            instance={instance}
            nowMs={nowMs}
          />
        ))}
      </div>
    </section>
  );
};

export const MeetingListItemGroup = memo(MeetingListItemGroupComponent);
MeetingListItemGroup.displayName = 'MeetingListItemGroup';
