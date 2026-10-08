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

import {MentionEntity} from '../../../../../message/mentionEntity';

const mentionSegmentCycleLength = 2;

const intoPairs = (positions: number[]) => {
  return positions.slice(1).map((endPosition, positionIndex) => {
    return [positions[positionIndex], endPosition];
  });
};

const breakAt = (positions: number[], text: string) => {
  return intoPairs([0, ...positions, text.length]).map(([startPosition, endPosition]) => {
    return text.substring(startPosition, endPosition);
  });
};

const breakWhere = (words: MentionEntity[], text: string) => {
  return breakAt(
    words.reduce((accumulator: number[], {startIndex, length}) => {
      return [...accumulator, startIndex, startIndex + length];
    }, []),
    text,
  );
};

export const createNodes = (mentions: MentionEntity[], text: string) => {
  const sortedMentions = mentions.toSorted(({startIndex: o1}, {startIndex: o2}) => {
    return o1 - o2;
  });

  return breakWhere(sortedMentions, text)
    .map((string: string, index: number) => {
      return index % mentionSegmentCycleLength == 0 ? {data: string, type: 'text'} : {data: string, type: 'Mention'};
    })
    .filter(({data}) => {
      return data.length > 0;
    });
};
