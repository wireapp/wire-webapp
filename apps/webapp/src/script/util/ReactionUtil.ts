/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {ReactionMap, UserReactionMap} from 'Repositories/storage';

import {matchQualifiedIds} from './QualifiedId';

function isReactionMap(reactions: UserReactionMap | ReactionMap): reactions is ReactionMap {
  return Array.isArray(reactions);
}

/**
 * Will convert the legacy user reaction map to the new reaction map format.
 * The new map format will allow keeping track of the order the reactions arrived in.
 */
export function userReactionMapToReactionMap(userReactions: UserReactionMap | ReactionMap): ReactionMap {
  if (isReactionMap(userReactions)) {
    return userReactions;
  }
  return Object.entries(userReactions).reduce<ReactionMap>((acc, [userId, reactions]) => {
    reactions.split(',').forEach(reaction => {
      const existingReaction = acc.find(([r]) => r === reaction);
      const qualifiedId = {id: userId, domain: ''};
      if (existingReaction) {
        existingReaction[1].push(qualifiedId);
      } else {
        acc.push([reaction, [qualifiedId]]);
      }
    });
    return acc;
  }, []);
}

export function addReaction(reactions: ReactionMap, reactionsStr: string, userId: QualifiedId) {
  const userReactions = reactionsStr.split(',');

  // First step is to remove all of this user's reactions
  const filteredReactions = reactions.map<ReactionMap[0]>(([reaction, users]) => {
    return [reaction, users.filter(user => !matchQualifiedIds(user, userId))];
  });

  userReactions
    .filter(([reaction]) => !!reaction)
    .forEach(reaction => {
      const existingEntry = filteredReactions.find(([r]) => r === reaction);
      if (existingEntry) {
        existingEntry[1].push(userId);
      } else {
        filteredReactions.push([reaction, [userId]]);
      }
    });
  return filteredReactions.filter(([, users]) => users.length > 0);
}
