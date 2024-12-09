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

import React, {useMemo} from 'react';

import cx from 'classnames';

import {Tooltip} from '@wireapp/react-ui-kit';

import {CallParticipantsListItem} from 'Components/calling/CallParticipantsListItem';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {labelStyles, labelWithIconStyles} from './CallingParticipantList.styles';

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
  handRaisedParticipants: Participant[];
  showParticipants?: boolean;
}

export const CallingParticipantList = ({
  callingRepository,
  conversation,
  isModerator,
  isSelfVerified,
  participants,
  handRaisedParticipants,
  showParticipants,
}: CallingParticipantListProps) => {
  const getParticipantContext = (event: React.MouseEvent<HTMLDivElement>, participant: Participant) => {
    event.preventDefault();

    const muteParticipant = {
      click: () => callingRepository.sendModeratorMute(conversation.qualifiedId, [participant]),
      icon: Icon.MicOffIcon,
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
      icon: Icon.MicOffIcon,
      identifier: 'moderator-mute-others',
      label: t('moderatorMenuEntryMuteAllOthers'),
    };

    const entries: ContextMenuEntry[] = [muteOthers].concat(!participant.user.isMe ? muteParticipant : []);
    showContextMenu({event, entries, identifier: 'participant-moderator-menu'});
  };

  const participantsList = useMemo(() => {
    return participants
      .slice()
      .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user));
  }, [participants]);

  return (
    <div
      className={cx('call-ui__participant-list__wrapper', {
        'call-ui__participant-list__wrapper--active': showParticipants,
      })}
    >
      <FadingScrollbar className="call-ui__participant-list__container">
        {handRaisedParticipants.length > 0 && (
          <>
            <p css={labelWithIconStyles}>
              {t('videoCallOverlayParticipantsRaisedHandListLabel', {count: handRaisedParticipants.length})}
              <Tooltip body={t('videoCallParticipantRaisedSortByTime')} data-uie-name="hand-sort-info">
                <Icon.InfoIcon />
              </Tooltip>
            </p>
            <ul className="call-ui__participant-list" data-uie-name="list-call-ui-participants">
              {handRaisedParticipants.map((participant, index, participantsArray) => (
                <li key={participant.clientId} className="call-ui__participant-list__participant">
                  <CallParticipantsListItem
                    handRaisedAt={participant.handRaisedAt()}
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
          </>
        )}
        <p css={labelStyles}>{t('videoCallOverlayParticipantsListLabel', {count: participants.length})}</p>
        <ul className="call-ui__participant-list" data-uie-name="list-call-ui-participants">
          {participantsList.map((participant, index, participantsArray) => (
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
