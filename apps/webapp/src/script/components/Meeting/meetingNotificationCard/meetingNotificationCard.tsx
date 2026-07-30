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

import {
  actionsStyles,
  actionStyles,
  containerStyles,
  metadataStyles,
  titleStyles,
  viewActionStyles,
} from './meetingNotificationCard.styles';

import type {MeetingNotificationKind} from '../meetingNotificationStore/meetingNotificationStore';

interface MeetingNotificationCardProps {
  kind: MeetingNotificationKind;
  count: number;
  meetingTitles: string[];
  onDismiss: () => void;
  onView: () => void;
}

const getTitle = (kind: MeetingNotificationKind, count: number, meetingTitle: string): string => {
  if (count === 1) {
    return `${kind === 'invite' ? 'Invitation' : kind === 'update' ? 'Update' : 'Canceled'}: ${meetingTitle}`;
  }

  return kind === 'invite'
    ? `Invite: ${count} New Meetings`
    : `${kind === 'update' ? 'Update' : 'Canceled'}: ${count} Meetings`;
};

export const MeetingNotificationCard = ({
  kind,
  count,
  meetingTitles,
  onDismiss,
  onView,
}: MeetingNotificationCardProps) => {
  const visibleTitles = meetingTitles.slice(0, 3);
  const overflowCount = meetingTitles.length - visibleTitles.length;

  return (
    <div css={containerStyles} role="status" aria-live="polite" data-uie-name="meeting-notification-card">
      <div css={titleStyles}>{getTitle(kind, count, meetingTitles[0] ?? 'Meeting Title')}</div>
      <div css={metadataStyles}>
        {visibleTitles.join(', ')}
        {overflowCount > 0 ? ` +${overflowCount} more` : ''}
      </div>
      <div css={actionsStyles}>
        <button type="button" css={actionStyles} onClick={onDismiss}>
          Dismiss
        </button>
        <button type="button" css={viewActionStyles} onClick={onView}>
          View
        </button>
      </div>
    </div>
  );
};
