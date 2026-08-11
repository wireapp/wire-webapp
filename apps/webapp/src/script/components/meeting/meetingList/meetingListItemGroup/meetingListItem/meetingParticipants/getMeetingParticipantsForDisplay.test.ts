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
import {translateForTest} from 'Util/test/translateForTest';

import {getMeetingParticipantsForDisplay} from './getMeetingParticipantsForDisplay';

const createUser = (id: string, name: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  return user;
};

describe('getMeetingParticipantsForDisplay', () => {
  it('places the self user first when they are in the participants list', () => {
    const selfUser = createUser('self', 'Kim Organizer');
    const otherUser = createUser('other', 'Jaqueline Olaho');

    expect(getMeetingParticipantsForDisplay([otherUser, selfUser], selfUser)).toEqual([selfUser, otherUser]);
  });

  it('prepends the self user when they are not in the participants list', () => {
    const selfUser = createUser('self', 'Kim Organizer');
    const otherUser = createUser('other', 'Jaqueline Olaho');

    expect(getMeetingParticipantsForDisplay([otherUser], selfUser)).toEqual([selfUser, otherUser]);
  });

  it('returns only the self user when there are no other participants', () => {
    const selfUser = createUser('self', 'Kim Organizer');

    expect(getMeetingParticipantsForDisplay([], selfUser)).toEqual([selfUser]);
  });
});
