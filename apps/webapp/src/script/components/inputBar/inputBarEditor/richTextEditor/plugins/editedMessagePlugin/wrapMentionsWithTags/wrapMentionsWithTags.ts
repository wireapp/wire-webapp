/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {isEmptyArray} from '@sindresorhus/is';

import type {MentionEntity} from '../../../../../../../message/mentionEntity';

/**
 * Wraps mentions in a given text with a <mention> tag.
 * It's useful cause it sets the mentions apart from the rest of the text.
 * Thanks to that, we can differentiate them from the rest of the text, and render them as MentionNodes.
 */
export const wrapMentionsWithTags = (text: string, allMentions: string[]): string => {
  if (isEmptyArray(allMentions)) {
    return text;
  }

  return allMentions.reduce((updatedText, mention) => {
    return updatedText.split(mention).join(`<mention>${mention}</mention>`);
  }, text);
};

/**
 * Wraps the mentions of everyone (`@all`) in a given text with a <mention-everyone> tag.
 * It uses the exact ranges of the mentions, so plain text that reads `@all` stays plain text.
 * Run it before `wrapMentionsWithTags`, while the ranges still match the original text.
 */
export const wrapEveryoneMentionsWithTags = (
  text: string,
  mentions: Pick<MentionEntity, 'isEveryone' | 'startIndex' | 'length'>[],
): string => {
  return mentions
    .filter(mention => {
      return mention.isEveryone;
    })
    .toSorted((mention1, mention2) => {
      return mention2.startIndex - mention1.startIndex;
    })
    .reduce((updatedText, {startIndex, length}) => {
      const endIndex = startIndex + length;
      const mentionText = updatedText.slice(startIndex, endIndex);
      return `${updatedText.slice(0, startIndex)}<mention-everyone>${mentionText}</mention-everyone>${updatedText.slice(endIndex)}`;
    }, text);
};
