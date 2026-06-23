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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {RestNode} from 'cells-sdk-ts';

import {UserRepository} from 'Repositories/user/userRepository';

import {getUserQualifiedIdFromNode} from '../common/getUserQualifiedIdFromNode/getUserQualifiedIdFromNode';

const getQualifiedIdKey = ({domain, id}: QualifiedId): string => `${domain}/${id}`;

const isQualifiedId = (userId: QualifiedId | null): userId is QualifiedId => userId !== null;

const getUniqueQualifiedIds = (userIds: QualifiedId[]): QualifiedId[] => {
  const uniqueUserIds = new Map<string, QualifiedId>();

  userIds.forEach(userId => {
    const key = getQualifiedIdKey(userId);

    if (!uniqueUserIds.has(key)) {
      uniqueUserIds.set(key, userId);
    }
  });

  return Array.from(uniqueUserIds.values());
};

export const getUsersFromNodes = async ({
  nodes,
  userRepository,
}: {
  nodes: RestNode[];
  userRepository: UserRepository;
}) => {
  if (!nodes?.length) {
    return [];
  }

  const userIds = nodes.map(node => getUserQualifiedIdFromNode(node)).filter(isQualifiedId);

  return userRepository.getUsersById(getUniqueQualifiedIds(userIds));
};
