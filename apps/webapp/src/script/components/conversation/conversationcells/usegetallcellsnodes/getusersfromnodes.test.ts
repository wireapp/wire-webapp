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

import {RestNode} from 'cells-sdk-ts';

import {UserRepository} from 'Repositories/user/userrepository';

import {getUsersFromNodes} from './getusersfromnodes';

type FakeUserRepository = jest.Mocked<Pick<UserRepository, 'getUsersById'>>;

const createRestNodeWithOwner = (ownerQualifiedId: string): RestNode => ({
  Path: 'conversation-id@example.com/file.txt',
  Type: 'LEAF',
  Uuid: ownerQualifiedId,
  UserMetadata: [
    {
      Namespace: 'usermeta-owner-uuid',
      JsonValue: JSON.stringify(ownerQualifiedId),
    },
  ],
});

const createRestNodeWithoutOwner = (): RestNode => ({
  Path: 'conversation-id@example.com/file-without-owner.txt',
  Type: 'LEAF',
  Uuid: 'file-without-owner.txt',
});

describe('getUsersFromNodes', () => {
  it('looks up each valid owner id only once', async () => {
    const userRepository: FakeUserRepository = {getUsersById: jest.fn().mockResolvedValue([])};

    await getUsersFromNodes({
      nodes: [
        createRestNodeWithOwner('owner-a@example.com'),
        createRestNodeWithOwner('owner-b@example.com'),
        createRestNodeWithOwner('owner-a@example.com'),
        createRestNodeWithoutOwner(),
        createRestNodeWithOwner('owner-b@example.com'),
      ],
      userRepository: userRepository as unknown as UserRepository,
    });

    expect(userRepository.getUsersById).toHaveBeenCalledWith([
      {id: 'owner-a', domain: 'example.com'},
      {id: 'owner-b', domain: 'example.com'},
    ]);
  });
});
