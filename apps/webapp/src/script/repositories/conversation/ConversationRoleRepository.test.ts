/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {DefaultConversationRoleName as DefaultRole} from '@wireapp/api-client/lib/conversation/';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamEntity} from 'Repositories/team/TeamEntity';
import {createUuid} from 'Util/uuid';

import {ConversationRoleRepository, Permissions} from './ConversationRoleRepository';

import {TestFactory} from '../../../../test/helper/TestFactory';

describe('ConversationRoleRepository', () => {
  const testFactory = new TestFactory();
  let roleRepository: ConversationRoleRepository;

  beforeEach(async () => {
    await testFactory.exposeConversationActors();
    roleRepository = new ConversationRoleRepository(
      testFactory.team_repository,
      testFactory.conversation_service,
      testFactory.user_repository['userState'],
      testFactory.team_repository['teamState'],
    );
  });

  describe('constructor', () => {
    it('knows if you are in a team', () => {
      expect(roleRepository['teamState'].isTeam()).toBe(false);
      testFactory.team_repository['teamState'].team(new TeamEntity(createUuid()));

      expect(roleRepository['teamState'].isTeam()).toBe(true);
    });
  });

  describe('loadTeamRoles', () => {
    it('initializes all team roles', async () => {
      spyOn(testFactory.team_repository, 'getTeamConversationRoles').and.returnValue(
        Promise.resolve({
          conversation_roles: [
            {
              actions: [Permissions.leaveConversation],
              conversation_role: DefaultRole.WIRE_MEMBER,
            },
          ],
        }),
      );

      testFactory.team_repository['teamState'].team(new TeamEntity(createUuid()));
      await roleRepository.loadTeamRoles();

      expect(roleRepository.teamRoles.length).toBe(1);
    });
  });

  describe('canAddParticipants', () => {
    it('checks if a user can add participants to a group', async () => {
      const conversationEntity = new Conversation(createUuid());
      const userEntity = new User(createUuid(), null);
      conversationEntity.participating_user_ets.push(userEntity);

      let canAddParticipants = roleRepository.canAddParticipants(conversationEntity, userEntity);

      expect(canAddParticipants).toBe(false);

      conversationEntity.roles({
        [userEntity.id]: DefaultRole.WIRE_ADMIN,
      });

      canAddParticipants = roleRepository.canAddParticipants(conversationEntity, userEntity);

      expect(canAddParticipants).toBe(true);
    });
  });
});
