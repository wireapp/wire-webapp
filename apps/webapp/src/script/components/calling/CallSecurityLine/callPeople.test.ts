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

import {Participant} from 'Repositories/calling/Participant';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {diffCallPeople, getCallPeople} from './callPeople';

const createUser = (id: string, name: string, isMe = false) => {
  const user = new User(id, 'wire.test', translateForTest);
  user.name(name);
  user.isMe = isMe;
  return user;
};

describe('getCallPeople', () => {
  it('counts a person on two devices once and leaves me out', () => {
    const me = createUser('me', 'Me', true);
    const alice = createUser('alice', 'Alice');

    const people = getCallPeople([
      new Participant(me, 'my-laptop'),
      new Participant(alice, 'alice-laptop'),
      new Participant(alice, 'alice-phone'),
    ]);

    expect([...people.values()]).toEqual([{key: 'alice@wire.test', name: 'Alice'}]);
  });
});

describe('diffCallPeople', () => {
  it('returns who joined and who left', () => {
    const alice = createUser('alice', 'Alice');
    const bob = createUser('bob', 'Bob');
    const carol = createUser('carol', 'Carol');

    const change = diffCallPeople(
      getCallPeople([new Participant(alice, 'a'), new Participant(bob, 'b')]),
      getCallPeople([new Participant(bob, 'b'), new Participant(carol, 'c')]),
    );

    expect(change).toEqual({
      joined: [{key: 'carol@wire.test', name: 'Carol'}],
      left: [{key: 'alice@wire.test', name: 'Alice'}],
    });
  });

  it('sees no change when a person adds a second device', () => {
    const alice = createUser('alice', 'Alice');

    const change = diffCallPeople(
      getCallPeople([new Participant(alice, 'laptop')]),
      getCallPeople([new Participant(alice, 'laptop'), new Participant(alice, 'phone')]),
    );

    expect(change).toEqual({joined: [], left: []});
  });
});
