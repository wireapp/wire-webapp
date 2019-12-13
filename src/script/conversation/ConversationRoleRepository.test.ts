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

import {createRandomUuid} from 'Util/util';
import {TeamEntity} from '../team/TeamEntity';
import {ConversationRoleRepository} from './ConversationRoleRepository';

declare global {
  interface Window {
    TestFactory: any;
  }
}

describe('ConversationRoleRepository', () => {
  const testFactory = new window.TestFactory();
  let roleRepository: ConversationRoleRepository;

  beforeEach(async () => {
    await testFactory.exposeConversationActors();
    roleRepository = new ConversationRoleRepository(window.TestFactory.conversation_repository);
  });

  describe('constructor', () => {
    it('knows if you are in a team', () => {
      expect(roleRepository.isTeam()).toBe(false);
      window.TestFactory.team_repository.team(new TeamEntity(createRandomUuid()));
      expect(roleRepository.isTeam()).toBe(true);
    });
  });

  describe('loadTeamRoles', () => {
    it('initializes all team roles', async () => {
      spyOn(window.TestFactory.team_repository, 'getTeamConversationRoles').and.returnValue(
        Promise.resolve({
          conversation_roles: ['my-custom-role'],
        }),
      );

      window.TestFactory.team_repository.team(new TeamEntity(createRandomUuid()));
      await roleRepository.loadTeamRoles();
      expect(roleRepository.teamRoles.length).toBe(1);
    });
  });
});
