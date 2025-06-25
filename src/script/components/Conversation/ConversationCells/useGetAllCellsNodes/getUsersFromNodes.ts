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

import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {RestNode} from 'cells-sdk-ts';

import {UserRepository} from 'src/script/user/UserRepository';

export const getUsersFromNodes = async ({
  nodes,
  userRepository,
}: {
  nodes: RestNode[] | undefined;
  userRepository: UserRepository;
}) => {
  const usersQualifiedIds = nodes
    ?.map(node => {
      const userQualifiedIdJson = node.UserMetadata?.find(
        metadata => metadata.Namespace === 'usermeta-owner-uuid',
      )?.JsonValue;

      if (!userQualifiedIdJson) {
        return null;
      }

      const userQualifiedId = JSON.parse(userQualifiedIdJson) as string;

      return userQualifiedId;
    })
    .filter(Boolean);

  const users = await userRepository.getUsersById(
    usersQualifiedIds?.map(userQualifiedId => parseQualifiedId(userQualifiedId as string)),
  );

  return users;
};
