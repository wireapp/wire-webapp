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

import React from 'react';

import cx from 'classnames';

import {CallParticipantsListItem} from 'Components/calling/CallParticipantsListItem';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {labelStyles} from './CallingParticipantList.styles';

import {CallingRepository} from '../../../../calling/CallingRepository';
import {Participant} from '../../../../calling/Participant';
import {Conversation} from '../../../../entity/Conversation';
import {ContextMenuEntry, showContextMenu} from '../../../../ui/ContextMenu';

interface CallingParticipantListProps {
  callingRepository: Pick<CallingRepository, 'supportsScreenSharing' | 'sendModeratorMute'>;
  conversation: Conversation;
  isModerator?: boolean;
  isSelfVerified?: boolean;
  participants: Participant[];
  showParticipants?: boolean;
}

export const CallingParticipantList = ({
  callingRepository,
  conversation,
  isModerator,
  isSelfVerified,
  participants,
  showParticipants,
}: CallingParticipantListProps) => {
  const getParticipantContext = (event: React.MouseEvent<HTMLDivElement>, participant: Participant) => {
    event.preventDefault();

    const muteParticipant = {
      click: () => callingRepository.sendModeratorMute(conversation.qualifiedId, [participant]),
      icon: 'mic-off-icon',
      identifier: `moderator-mute-participant`,
      isDisabled: participant.isMuted(),
      label: t('moderatorMenuEntryMute'),
    };

    const muteOthers: ContextMenuEntry = {
      click: () => {
        callingRepository.sendModeratorMute(
          conversation.qualifiedId,
          participants.filter(p => p !== participant),
        );
      },
      icon: 'mic-off-icon',
      identifier: 'moderator-mute-others',
      label: t('moderatorMenuEntryMuteAllOthers'),
    };

    const entries: ContextMenuEntry[] = [muteOthers].concat(!participant.user.isMe ? muteParticipant : []);
    showContextMenu(event, entries, 'participant-moderator-menu');
  };

  return (
    <div
      className={cx('call-ui__participant-list__wrapper', {
        'call-ui__participant-list__wrapper--active': showParticipants,
      })}
    >
      <p css={labelStyles}>{t('videoCallOverlayParticipantsListLabel', participants.length)}</p>
      <FadingScrollbar className="call-ui__participant-list__container">
        <ul className="call-ui__participant-list" data-uie-name="list-call-ui-participants">
          {participants
            .slice()
            .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user))
            .map((participant, index, participantsArray) => (
              <li key={participant.clientId} className="call-ui__participant-list__participant">
                <CallParticipantsListItem
                  key={participant.clientId}
                  callParticipant={participant}
                  isSelfVerified={isSelfVerified}
                  showContextMenu={!!isModerator}
                  onContextMenu={event => getParticipantContext(event, participant)}
                  isLast={participantsArray.length === index}
                />
              </li>
            ))}
        </ul>
      </FadingScrollbar>
    </div>
  );
};
