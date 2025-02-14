/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MentionEntity} from '../../../../../message/MentionEntity';

const intoPairs = (xs: number[]) => xs.slice(1).map((x, index) => [xs[index], x]);

const breakAt = (places: number[], str: string) =>
  intoPairs([0, ...places, str.length]).map(([a, b]) => str.substring(a, b));

const breakWhere = (words: MentionEntity[], str: string) =>
  breakAt(
    words.reduce(
      (accumulator: number[], {startIndex, length}) => [...accumulator, startIndex, startIndex + length],
      [],
    ),
    str,
  );

export const createNodes = (mentions: MentionEntity[], str: string) => {
  const sortedMentions = mentions.slice(0).sort(({startIndex: o1}, {startIndex: o2}) => o1 - o2);

  return breakWhere(sortedMentions, str)
    .map((string: string, index: number) =>
      index % 2 == 0 ? {data: string, type: 'text'} : {data: string, type: 'Mention'},
    )
    .filter(({data}) => data.length > 0);
};
