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

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {createConversation, mountComponent} from 'src/script/auth/util/test/TestUtil';
import {AddParticipants} from './addParticipants';
import {TeamState} from 'Repositories/team/TeamState';
import ko from 'knockout';
import {UserState} from 'Repositories/user/UserState';
import {User} from 'Repositories/entity/User';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {IntegrationMapper} from 'Repositories/integration/IntegrationMapper';
import {ROLE} from 'Repositories/user/UserPermission';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {mockStoreFactory} from 'src/script/auth/util/test/mockStoreFactory';
import {initialRootState} from 'src/script/auth/module/reducer';

describe('addParticipants', () => {
  it('renders', () => {
    // Arrange
    const conversation = createConversation(CONVERSATION_TYPE.REGULAR, CONVERSATION_PROTOCOL.MLS);
    const teamState: Partial<TeamState> = {
      isTeam: ko.pureComputed(() => false),
      teamMembers: ko.pureComputed((): User[] => []),
      teamUsers: ko.pureComputed((): User[] => []),
    };
    const conversationRepository: Partial<ConversationRepository> = {};
    const searchRepository: Partial<SearchRepository> = {
      normalizeQuery: query => ({query, isHandleQuery: true}),
      searchUserInSet: (_term, users) => users,
    };
    const integrationRepository: Partial<IntegrationRepository> = {
      services: ko.observableArray([]),
      mapServiceFromUser: IntegrationMapper.mapServiceFromUser,
      searchForServices: jest.fn(),
    };
    const teamRepository: Partial<TeamRepository> = {
      filterRemoteDomainUsers: jest.fn(),
    };
    const userState: Partial<UserState> = {
      connectedUsers: ko.pureComputed((): User[] => []),
    };
    const selfUser: Partial<User> = {
      teamRole: ko.observable(ROLE.OWNER),
    };

    // Act
    mountComponent(
      <AddParticipants
        activeConversation={conversation}
        onBack={jest.fn()}
        onClose={jest.fn()}
        conversationRepository={conversationRepository as ConversationRepository}
        integrationRepository={integrationRepository as IntegrationRepository}
        searchRepository={searchRepository as SearchRepository}
        togglePanel={jest.fn()}
        teamRepository={teamRepository as TeamRepository}
        teamState={teamState as TeamState}
        userState={userState as UserState}
        selfUser={selfUser as User}
      />,
      mockStoreFactory()(initialRootState),
    );
  });
});
