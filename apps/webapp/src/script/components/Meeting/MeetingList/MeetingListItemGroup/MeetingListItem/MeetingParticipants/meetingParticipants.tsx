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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Avatar, AVATAR_SIZE, StackedAvatars} from 'Components/avatar';
import {UserName} from 'Components/UserName';
import type {Conversation} from 'Repositories/entity/Conversation';

import {participantNameStyles, singleParticipantStyles, wrapperStyles} from './meetingParticipants.styles';
import {useMeetingConversation} from './useMeetingConversation';
import {useMeetingParticipants} from './useMeetingParticipants';

interface MeetingParticipantsProps {
  qualifiedConversation: QualifiedId;
  isOngoing?: boolean;
}

interface MeetingParticipantsContentProps {
  conversation: Conversation;
  isOngoing: boolean;
}

const MeetingParticipantsContent = ({conversation, isOngoing}: MeetingParticipantsContentProps) => {
  const participants = useMeetingParticipants(conversation);
  const avatarRingColor = isOngoing ? 'var(--accent-color-highlight)' : 'var(--text-input-background)';

  if (participants.length === 0) {
    return null;
  }

  if (participants.length === 1) {
    const participant = participants[0];

    return (
      <div css={wrapperStyles} data-uie-name="meeting-participants">
        <div css={singleParticipantStyles}>
          <Avatar
            participant={participant}
            avatarSize={AVATAR_SIZE.X_SMALL}
            hideAvailabilityStatus
            noBadge
            className="cursor-default"
          />
          <span css={participantNameStyles}>
            <UserName user={participant} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div css={wrapperStyles} data-uie-name="meeting-participants">
      <StackedAvatars
        participants={participants}
        avatarRingColor={avatarRingColor}
        dataUieName="meeting-participants-avatars"
      />
    </div>
  );
};

export const MeetingParticipants = ({qualifiedConversation, isOngoing = false}: MeetingParticipantsProps) => {
  const conversation = useMeetingConversation(qualifiedConversation);

  if (!conversation) {
    return null;
  }

  return <MeetingParticipantsContent conversation={conversation} isOngoing={isOngoing} />;
};
