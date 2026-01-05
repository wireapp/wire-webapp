/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC} from 'react';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {t} from 'Util/LocalizerUtil';

interface GroupDetailsProps {
  userParticipants: User[];
  serviceParticipants: ServiceEntity[];
  allUsersCount: number;
  isTeam?: boolean;
  isChannel?: boolean;
}

const GroupDetails: FC<GroupDetailsProps> = ({
  userParticipants,
  serviceParticipants,
  allUsersCount,
  isTeam = false,
  isChannel = false,
}) => {
  const hasMultipleUserParticipants = userParticipants.length > 1;
  const participantsUserText = hasMultipleUserParticipants
    ? t('conversationDetailsParticipantsUsersMany')
    : t('conversationDetailsParticipantsUsersOne');

  const hasMultipleServiceParticipants = serviceParticipants.length > 1;
  const participantsServiceText = hasMultipleServiceParticipants
    ? t('conversationDetailsParticipantsServicesMany')
    : t('conversationDetailsParticipantsServicesOne');

  return (
    <>
      <div className="conversation-details__participant_count">
        {!!userParticipants.length && (
          <span className="conversation-details__participant_count__user">
            <span className="conversation-details__participant_count__number" data-uie-name="status-user-count">
              {allUsersCount || userParticipants.length}
            </span>
            &nbsp;
            <span className="conversation-details__participant_count__text">{participantsUserText}</span>
          </span>
        )}

        {!!serviceParticipants.length && (
          <span className="conversation-details__participant_count__service">
            <span className="conversation-details__participant_count__number" data-uie-name="status-service-count">
              {serviceParticipants.length}
            </span>
            &nbsp;
            <span className="conversation-details__participant_count__text">{participantsServiceText}</span>
          </span>
        )}
      </div>

      {isTeam && (
        <p
          className="panel__info-text conversation-details__group-size-info"
          data-uie-name="status-group-size-info-conversation-details"
        >
          {t(isChannel ? 'channelSizeInfo' : 'groupSizeInfo', {
            count: isChannel
              ? ConversationRepository.CONFIG.CHANNEL.MAX_SIZE
              : ConversationRepository.CONFIG.GROUP.MAX_SIZE,
          })}
        </p>
      )}
    </>
  );
};

export {GroupDetails};
