/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {User} from '../entity/User';
import {MentionEntity} from '../message/MentionEntity';

export const findMentionAtPosition = (position: number, mentions: MentionEntity[]) =>
  mentions.find(({startIndex, endIndex}) => position > startIndex && position < endIndex);

export const getMentionCandidate = (
  currentMentions: MentionEntity[],
  selectionStart: number,
  selectionEnd: number,
  value: string,
) => {
  const textInSelection = value.substring(selectionStart, selectionEnd);
  const wordBeforeSelection = value.substring(0, selectionStart).replace(/[^]*\s/, '');
  const isSpaceSelected = /\s/.test(textInSelection);

  const startOffset = wordBeforeSelection.length ? wordBeforeSelection.length - 1 : 1;
  const isSelectionStartMention = findMentionAtPosition(selectionStart - startOffset, currentMentions);
  const isSelectionEndMention = findMentionAtPosition(selectionEnd, currentMentions);
  const isOverMention = isSelectionStartMention || isSelectionEndMention;
  const isOverValidMentionString = /^@\S*$/.test(wordBeforeSelection);

  if (!isSpaceSelected && !isOverMention && isOverValidMentionString) {
    const wordAfterSelection = value.substring(selectionEnd).replace(/\s[^]*/, '');

    const term = `${wordBeforeSelection.replace(/^@/, '')}${textInSelection}${wordAfterSelection}`;
    const startIndex = selectionStart - wordBeforeSelection.length;
    return {startIndex, term};
  }

  return undefined;
};

export const detectMentionEdgeDeletion = (
  textarea: HTMLTextAreaElement,
  currentMentions: MentionEntity[],
  selectionStart: number,
  selectionEnd: number,
  lengthDifference: number,
) => {
  const hadSelection = selectionStart !== selectionEnd;

  if (hadSelection || lengthDifference >= 0) {
    return null;
  }

  const currentSelectionStart = textarea.selectionStart;
  const forwardDeleted = currentSelectionStart === selectionStart;
  const checkPosition = forwardDeleted ? currentSelectionStart + 1 : currentSelectionStart;

  return findMentionAtPosition(checkPosition, currentMentions);
};

export const updateMentionRanges = (
  currentMentions: MentionEntity[],
  start: number,
  end: number,
  difference: number,
): MentionEntity[] => {
  const remainingMentions = currentMentions.filter(({startIndex, endIndex}) => endIndex <= start || startIndex >= end);

  return remainingMentions.map(mention => {
    if (mention.startIndex >= end) {
      return new MentionEntity(mention.startIndex + difference, mention.length, mention.userId, mention.domain);
    }

    return mention;
  });
};

export const createMentionEntity = (
  userEntity: User,
  editedMention?: {startIndex: number; term: string},
): MentionEntity | null => {
  const mentionLength = userEntity.name().length + 1;

  if (typeof editedMention?.startIndex === 'number') {
    return new MentionEntity(editedMention.startIndex, mentionLength, userEntity.id, userEntity.domain);
  }

  return null;
};
