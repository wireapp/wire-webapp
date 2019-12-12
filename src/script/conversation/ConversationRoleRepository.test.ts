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

declare global {
  interface Window {
    TestFactory: any;
  }
}

import {TestFactory} from '../../../test/api/TestFactory';
import {ConversationRoleRepository} from './ConversationRoleRepository';

describe('ConversationRoleRepository', () => {
  const testFactory = new TestFactory();
  let roleRepository: ConversationRoleRepository;

  beforeEach(async () => {
    await testFactory.exposeConversationActors();
    roleRepository = new ConversationRoleRepository(window.TestFactory.conversation_repository);
  });

  describe('constructor', () => {
    it('knows if you are in a team', () => {
      expect(roleRepository.isTeam()).toBe(false);
    });
  });

  describe('loadTeamRoles', () => {
    it('initializes all team members with their roles', async () => {
      spyOn(window.TestFactory.team_repository.teamService, 'getTeamConversationRoles').and.returnValue(
        Promise.resolve({
          conversation_roles: ['test'],
        }),
      );

      window.TestFactory.team_repository.team({
        id: '1337',
        members: ko.observable({}),
      });
      await roleRepository.loadTeamRoles();
      expect(roleRepository.teamRoles.length).toBe(1);
    });
  });
});
