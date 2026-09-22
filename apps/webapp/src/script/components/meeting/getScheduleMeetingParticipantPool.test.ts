/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {User} from 'Repositories/entity/User';
import type {TeamState} from 'Repositories/team/TeamState';
import type {UserState} from 'Repositories/user/userState';
import {generateQualifiedIds} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {getScheduleMeetingParticipantPool} from './getScheduleMeetingParticipantPool';

const createUser = (qualifiedId: {id: string; domain: string}, name: string) => {
  const user = new User(qualifiedId.id, qualifiedId.domain, translateForTest);
  user.name(name);
  return user;
};

describe('getScheduleMeetingParticipantPool', () => {
  it('returns only team members when the host is on a team', () => {
    const [teamMemberId, connectedContactId] = generateQualifiedIds(2, 'wire.example');
    const teamMember = createUser(teamMemberId, 'Team Member');
    const connectedContact = createUser(connectedContactId, 'External Contact');

    const teamState = {
      isTeam: () => true,
      teamMembers: () => [teamMember],
      teamUsers: () => [teamMember, connectedContact],
    } as unknown as TeamState;

    const userState = {
      connectedUsers: () => [connectedContact],
    } as unknown as UserState;

    const participants = getScheduleMeetingParticipantPool(userState, teamState);

    expect(participants).toEqual([teamMember]);
  });

  it('returns connected users when the host is not on a team', () => {
    const [connectedContactId] = generateQualifiedIds(1, 'wire.example');
    const connectedContact = createUser(connectedContactId, 'Connected Contact');

    const teamState = {
      isTeam: () => false,
      teamMembers: () => [],
    } as unknown as TeamState;

    const userState = {
      connectedUsers: () => [connectedContact],
    } as unknown as UserState;

    const participants = getScheduleMeetingParticipantPool(userState, teamState);

    expect(participants).toEqual([connectedContact]);
  });
});
