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

import * as Icon from 'Components/Icon';
import {ServiceList} from 'Components/ServiceList';
import {UserList} from 'Components/UserList';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {t} from 'Util/LocalizerUtil';

interface ConversationDetailsParticipantsProps {
  activeConversation: Conversation;
  allUsersCount: number;
  conversationRepository: ConversationRepository;
  selfUser: User;
  serviceParticipants: ServiceEntity[];
  showAllParticipants: () => void;
  showService: (service: ServiceEntity) => void;
  showUser: (user: User) => void;
  userParticipants: User[];
}

export const ConversationDetailsParticipants = ({
  activeConversation,
  allUsersCount,
  conversationRepository,
  selfUser,
  serviceParticipants,
  showAllParticipants,
  showService,
  showUser,
  userParticipants,
}: ConversationDetailsParticipantsProps) => {
  return (
    <div className="conversation-details__participants">
      {!!userParticipants.length && (
        <>
          <div className="user-list-wrapper" data-uie-name="list-users">
            <UserList
              users={userParticipants}
              onClick={showUser}
              noUnderline
              conversationRepository={conversationRepository}
              conversation={activeConversation}
              truncate
              showEmptyAdmin
              selfUser={selfUser}
              noSelfInteraction
              filterDeletedUsers={false}
            />
          </div>

          {allUsersCount > 0 && (
            <button
              type="button"
              className="panel__action-item panel__action-item--no-border"
              onClick={showAllParticipants}
              data-uie-name="go-conversation-participants"
            >
              <span className="panel__action-item__icon">
                <Icon.PeopleIcon />
              </span>

              <span className="panel__action-item__text">
                {t('conversationDetailsActionConversationParticipants', {number: allUsersCount})}
              </span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          )}
        </>
      )}

      {!!serviceParticipants.length && (
        <div className="service-list-wrapper">
          <h3 className="conversation-details__list-head" data-uie-name="label-conversation-services">
            {t('conversationDetailsServices')}
          </h3>

          <ServiceList services={serviceParticipants} onServiceClick={showService} dataUieName="list-services" />
        </div>
      )}
    </div>
  );
};
