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

import {useMemo, useState} from 'react';

import {container} from 'tsyringe';

import {FadingScrollbar} from 'Components/fadingScrollbar';
import {SearchInput} from 'Components/searchInput';
import {UserSearchableList} from 'Components/userSearchableList';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {sortUsersByPriority} from 'Util/stringUtil';

import {participantsSelectionListCss, participantsSelectionSearchCss} from './createConversationSteps.styles';

import {useCreateConversation} from '../hooks/useCreateConversation';
import {useCreateConversationModal} from '../hooks/useCreateConversationModal';
import {getNonFederatingParticipantsModalCopy} from '../utils';

export const ParticipantsSelection = () => {
  const {mainViewModel, translate} = useApplicationContext();
  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);
  const [participantsInput, setParticipantsInput] = useState<string>('');
  const {isGuestsEnabled, selectedContacts, setSelectedContacts} = useCreateConversationModal();
  const nonFederatingParticipantsModalCopy = getNonFederatingParticipantsModalCopy(translate);
  const {onSubmit} = useCreateConversation(nonFederatingParticipantsModalCopy);

  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam', 'isMLSEnabled', 'isProtocolToggleEnabledForUser']);

  const contentViewModel = mainViewModel.content;
  const conversationRepository = contentViewModel.repositories.conversation;
  const searchRepository = contentViewModel.repositories.search;
  const teamRepository = contentViewModel.repositories.team;

  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const contacts = useMemo(() => {
    if (!isTeam) {
      return userState.connectedUsers();
    }

    if (isGuestsEnabled) {
      return teamState.teamUsers();
    }

    return teamState.teamMembers().toSorted(sortUsersByPriority);
  }, [isGuestsEnabled, isTeam, teamState, userState]);

  const filteredContacts = contacts.filter(user => user.isAvailable());

  return (
    <>
      <div css={participantsSelectionSearchCss}>
        <SearchInput
          input={participantsInput}
          setInput={setParticipantsInput}
          selectedUsers={selectedContacts}
          placeholder={translate('groupCreationParticipantsPlaceholder')}
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
