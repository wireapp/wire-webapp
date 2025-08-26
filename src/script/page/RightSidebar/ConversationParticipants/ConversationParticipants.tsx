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

import {FC, useMemo, useState} from 'react';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {SearchInput} from 'Components/SearchInput';
import {UserSearchableList} from 'Components/UserSearchableList';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {isServiceEntity} from '../../../guards/Service';
import {PanelHeader} from '../PanelHeader';
import {PanelEntity, PanelState} from '../RightSidebar';

interface ConversationParticipantsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  togglePanel: (state: PanelState, entity: PanelEntity, addMode?: boolean) => void;
  highlightedUsers: User[];
  onClose: () => void;
  onBack: () => void;
}

const ConversationParticipants: FC<ConversationParticipantsProps> = ({
  activeConversation,
  conversationRepository,
  searchRepository,
  teamRepository,
  togglePanel,
  onClose,
  onBack,
  highlightedUsers,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const {
    participating_user_ets: participatingUserEts,
    isSelfUserRemoved,
    selfUser,
  } = useKoSubscribableChildren(activeConversation, ['participating_user_ets', 'isSelfUserRemoved', 'selfUser']);

  const showUser = (userEntity: User) => togglePanel(PanelState.GROUP_PARTICIPANT_USER, userEntity);

  const participants = useMemo(() => {
    const users: User[] = participatingUserEts.flatMap(user => {
      const isUser = !isServiceEntity(user);
      return isUser ? [user] : [];
    });

    if (!isSelfUserRemoved && selfUser) {
      return [...users, selfUser].sort(sortUsersByPriority);
    }

    return users;
  }, [participatingUserEts, isSelfUserRemoved, selfUser]);

  return (
    <div id="conversation-participants" className="panel__page conversation-participants">
      <PanelHeader
        onGoBack={onBack}
        onClose={onClose}
        goBackUie="go-back-conversation-participants"
        title={t('conversationParticipantsTitle')}
        shouldFocusFirstButton={false}
      />

      <div className="panel__content conversation-participants__content">
        <div style={{padding: '0 12px'}}>
          <SearchInput
            input={searchInput}
            setInput={setSearchInput}
            placeholder={t('conversationParticipantsSearchPlaceholder')}
            forceDark
          />
        </div>

        <FadingScrollbar className="conversation-participants__list panel__content">
          <UserSearchableList
            dataUieName="list-conversation-participants"
            users={participants}
            filter={searchInput}
            highlightedUsers={highlightedUsers}
            onClick={showUser}
            noUnderline
            searchRepository={searchRepository}
            teamRepository={teamRepository}
            conversationRepository={conversationRepository}
            conversation={activeConversation}
            selfFirst={false}
            selfUser={selfUser}
            noSelfInteraction
          />
        </FadingScrollbar>
      </div>
    </div>
  );
};

export {ConversationParticipants};
