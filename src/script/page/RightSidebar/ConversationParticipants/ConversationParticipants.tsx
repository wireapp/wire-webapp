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
import cx from 'classnames';

import SearchInput from 'Components/SearchInput';
import UserSearchableList from 'Components/UserSearchableList';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import PanelHeader from '../PanelHeader';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {isServiceEntity} from '../../../guards/Service';
import {PanelParams, PanelViewModel} from '../../../view_model/PanelViewModel';
import {initFadingScrollbar} from '../../../ui/fadingScrollbar';

interface ConversationParticipantsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  togglePanel: (state: string, params: PanelParams) => void;
  highlightedUsers: User[];
  onClose: () => void;
  onBack: () => void;
  isVisible?: boolean;
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
  isVisible = false,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');

  const {
    participating_user_ets: participatingUserEts,
    removed_from_conversation: removedFromConversation,
    selfUser,
  } = useKoSubscribableChildren(activeConversation, [
    'participating_user_ets',
    'removed_from_conversation',
    'selfUser',
  ]);

  const showUser = (userEntity: User) => togglePanel(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});

  const participants = useMemo(() => {
    const users: User[] = participatingUserEts.flatMap(user => {
      const isUser = !isServiceEntity(user);
      return isUser ? [user] : [];
    });

    if (removedFromConversation && selfUser) {
      return [...users, selfUser].sort(sortUsersByPriority);
    }

    return users;
  }, [participatingUserEts, removedFromConversation, selfUser]);

  return (
    <div
      id="conversation-participants"
      className={cx('panel__page conversation-participants', {'panel__page--visible': isVisible})}
    >
      <PanelHeader
        onGoBack={onBack}
        onClose={onClose}
        goBackUie="go-back-conversation-participants"
        title={t('conversationParticipantsTitle')}
      />

      <div className="panel__content conversation-participants__content">
        <SearchInput
          input={searchInput}
          setInput={setSearchInput}
          placeholder={t('conversationParticipantsSearchPlaceholder')}
          forceDark
        />

        <div className="conversation-participants__list panel__content" ref={initFadingScrollbar}>
          {/* TODO: Need to update dataUieName for UserSearchableList */}
          {/*data-uie-name="list-conversation-participants"*/}

          <UserSearchableList
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
            noSelfInteraction
          />
        </div>
      </div>
    </div>
  );
};

export default ConversationParticipants;
