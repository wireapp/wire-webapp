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

import {computeParticipantDiff} from './computeMeetingParticipantDiff';

const createUser = (id: string, domain = 'example.com') => {
  const user = new User(id, domain, translateForTest);
  user.name(`User ${id}`);
  return user;
};

describe('computeParticipantDiff', () => {
  it('returns empty diff when both sides are empty', () => {
    const result = computeParticipantDiff([], []);

    expect(result.usersToAdd).toEqual([]);
    expect(result.userIdsToRemove).toEqual([]);
  });

  it('returns users to add when selected users are new', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');

    const result = computeParticipantDiff([], [alice, bob]);

    expect(result.usersToAdd).toEqual([alice, bob]);
    expect(result.userIdsToRemove).toEqual([]);
  });

  it('returns user ids to remove when selected users are empty', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');

    const result = computeParticipantDiff([alice, bob], []);

    expect(result.usersToAdd).toEqual([]);
    expect(result.userIdsToRemove).toEqual([alice.qualifiedId, bob.qualifiedId]);
  });

  it('returns both additions and removals when participants change', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');
    const charlie = createUser('charlie');

    const result = computeParticipantDiff([alice, bob], [bob, charlie]);

    expect(result.usersToAdd).toEqual([charlie]);
    expect(result.userIdsToRemove).toEqual([alice.qualifiedId]);
  });

  it('returns empty diff when selected users match original users', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');

    const result = computeParticipantDiff([alice, bob], [alice, bob]);

    expect(result.usersToAdd).toEqual([]);
    expect(result.userIdsToRemove).toEqual([]);
  });

  it('treats users with the same id but different domains as distinct', () => {
    const aliceOnExample = createUser('alice', 'example.com');
    const aliceOnWire = createUser('alice', 'wire.com');

    const addResult = computeParticipantDiff([aliceOnExample], [aliceOnWire]);
    expect(addResult.usersToAdd).toEqual([aliceOnWire]);
    expect(addResult.userIdsToRemove).toEqual([aliceOnExample.qualifiedId]);

    const removeResult = computeParticipantDiff([aliceOnWire], [aliceOnExample]);
    expect(removeResult.usersToAdd).toEqual([aliceOnExample]);
    expect(removeResult.userIdsToRemove).toEqual([aliceOnWire.qualifiedId]);
  });
});
