/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useContext, useMemo, useState} from 'react';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {SearchInput} from 'Components/SearchInput';
import {UserSearchableList} from 'Components/UserSearchableList';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {RootContext} from 'src/script/page/RootProvider';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {participantsSelectionListCss, participantsSelectionSearchCss} from './CreateConversationSteps.styles';

import {useCreateConversation} from '../hooks/useCreateConversation';
import {useCreateConversationModal} from '../hooks/useCreateConversationModal';

export const ParticipantsSelection = () => {
  const mainViewModel = useContext(RootContext);
  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);
  const [participantsInput, setParticipantsInput] = useState<string>('');
  const {isGuestsEnabled, selectedContacts, setSelectedContacts} = useCreateConversationModal();
  const {onSubmit} = useCreateConversation();

  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam', 'isMLSEnabled', 'isProtocolToggleEnabledForUser']);

  const {content: contentViewModel} = mainViewModel!;
  const {
    conversation: conversationRepository,
    search: searchRepository,
    team: teamRepository,
  } = contentViewModel.repositories;

  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const contacts = useMemo(() => {
    if (!isTeam) {
      return userState.connectedUsers();
    }

    if (isGuestsEnabled) {
      return teamState.teamUsers();
    }

    return teamState.teamMembers().sort(sortUsersByPriority);
  }, [isGuestsEnabled, isTeam, teamState, userState]);

  const filteredContacts = contacts.filter(user => user.isAvailable());

  return (
    <>
      <div css={participantsSelectionSearchCss}>
        <SearchInput
          input={participantsInput}
          setInput={setParticipantsInput}
          selectedUsers={selectedContacts}
          placeholder={t('groupCreationParticipantsPlaceholder')}
          onEnter={onSubmit}
        />
      </div>
      <div className="modal__body" css={participantsSelectionListCss}>
        <FadingScrollbar>
          <UserSearchableList
            selfUser={selfUser!}
            users={filteredContacts}
            filter={participantsInput}
            selected={selectedContacts}
            isSelectable
            onUpdateSelectedUsers={setSelectedContacts}
            searchRepository={searchRepository}
            teamRepository={teamRepository}
            conversationRepository={conversationRepository}
            noUnderline
            allowRemoteSearch
            filterRemoteTeamUsers
          />
        </FadingScrollbar>
      </div>
    </>
  );
};
