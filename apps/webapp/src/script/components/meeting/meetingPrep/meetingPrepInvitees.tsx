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

import {type ReactElement, useCallback, useId, useRef, useState} from 'react';

import {type Maybe} from 'true-myth';

import {
  meetingPrepInviteeItemsStyles,
  meetingPrepInviteeItemStyles,
  meetingPrepInviteesCloseStyles,
  meetingPrepInviteesHeadStyles,
  meetingPrepInviteesListStyles,
  meetingPrepInviteesRootStyles,
  meetingPrepInviteesTitleStyles,
  meetingPrepInviteesTriggerStyles,
  meetingPrepInviteeTagStyles,
} from './meetingPrepInvitees.styles';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {useCloseOnEscapeOrOutsidePress} from '../../../hooks/useCloseOnEscapeOrOutsidePress';
import {useApplicationContext} from '../../../page/rootProvider';
import type {User} from '../../../repositories/entity/User';
import {ChevronDownIcon} from '../../../uiKit/dataDisplay/icon/chevronDownIcon';
import {CloseIcon} from '../../../uiKit/dataDisplay/icon/closeIcon';
import {matchQualifiedIds} from '../../../util/qualifiedId';
import {Avatar, AVATAR_SIZE, StackedAvatars} from '../../avatar';

interface MeetingPrepInviteesProps {
  readonly invitees: readonly User[];
  readonly organizerId: Maybe<QualifiedId>;
}

/**
 * The invitee row of the green room: stacked avatars and a count. It opens the list of invitees,
 * with the organizer marked when the entry point knows who that is.
 */
export const MeetingPrepInvitees = ({invitees, organizerId}: MeetingPrepInviteesProps): ReactElement => {
  const {translate} = useApplicationContext();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const closeList = useCallback((): void => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  const dismissList = useCallback((): void => {
    setIsOpen(false);
  }, []);

  // Inside the green room modal: with focus in the list, Escape closes the list only.
  useCloseOnEscapeOrOutsidePress(rootRef, isOpen, closeList, dismissList, {
    captureEscapeWhenFocused: true,
    closeOnFocusOut: true,
  });

  const isOrganizer = (invitee: User): boolean => {
    return organizerId.mapOr(false, id => {
      return matchQualifiedIds(invitee.qualifiedId, id);
    });
  };

  // tabIndex -1: a click on a name or the title keeps focus in the list, so Escape still closes only the list.
  return (
    <div ref={rootRef} tabIndex={-1} css={meetingPrepInviteesRootStyles}>
      <button
        ref={triggerRef}
        type="button"
        css={meetingPrepInviteesTriggerStyles}
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => {
          triggerRef.current?.focus();
          setIsOpen(open => {
            return !open;
          });
        }}
        data-uie-name="meeting-prep-invitees"
      >
        <StackedAvatars participants={[...invitees]} dataUieName="meeting-prep-invitees-avatars" />
        <span>{translate('meetings.prep.invited', {count: invitees.length})}</span>
        <ChevronDownIcon width={12} height={12} color="currentColor" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={listId}
          role="region"
          aria-labelledby={`${listId}-title`}
          css={meetingPrepInviteesListStyles}
          data-uie-name="meeting-prep-invitee-list"
        >
          <div css={meetingPrepInviteesHeadStyles}>
            <h3 id={`${listId}-title`} css={meetingPrepInviteesTitleStyles}>
              {translate('meetings.prep.inviteesTitle', {count: invitees.length})}
            </h3>
            <button
              type="button"
              css={meetingPrepInviteesCloseStyles}
              aria-label={translate('meetings.prep.closeInvitees')}
              onClick={closeList}
            >
              <CloseIcon color="var(--foreground-fade-56)" width={12} height={12} aria-hidden="true" />
            </button>
          </div>
          <ul css={meetingPrepInviteeItemsStyles}>
            {invitees.map(invitee => {
              return (
                <li key={`${invitee.qualifiedId.id}@${invitee.qualifiedId.domain}`} css={meetingPrepInviteeItemStyles}>
                  <Avatar participant={invitee} avatarSize={AVATAR_SIZE.X_SMALL} hideAvailabilityStatus />
                  <span>{invitee.name()}</span>
                  {isOrganizer(invitee) && (
                    <span css={meetingPrepInviteeTagStyles}>{translate('meetings.participant.organizer')}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
