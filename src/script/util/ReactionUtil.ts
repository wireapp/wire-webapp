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

export interface Reactions {
  [key: string]: string;
}

type ReactionsGroupedByUser = Map<string, string[]>;

export function groupByReactionUsers(reactions: Reactions): ReactionsGroupedByUser {
  const reactionsGroupedByUser = new Map<string, string[]>();

  for (const user in reactions) {
    const userReactions = reactions[user] && reactions[user]?.split(',');

    for (const reaction of userReactions) {
      const users = reactionsGroupedByUser.get(reaction) || [];
      users.push(user);
      reactionsGroupedByUser.set(reaction, users);
    }
  }

  return reactionsGroupedByUser;
}

// Maps to the static server emojis url
export function getEmojiUrl(unicode: string) {
  return `/image/emojis/img-apple-64/${unicode}.png`;
}

export function sortReactionsByUserCount(reactionsList: [string, string[]][]) {
  return reactionsList.sort(
    ([, reactionAUserList], [, reactionBUserList]) => reactionBUserList.length - reactionAUserList.length,
  );
}
