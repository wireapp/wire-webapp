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

/**
 * Wraps mentions in a given text with a <mention> tag.
 * It's useful cause it sets the mentions apart from the rest of the text.
 * Thanks to that, we can differentiate them from the rest of the text, and render them as MentionNodes.
 */
export const wrapMentionsWithTags = (text: string, allMentions: string[]): string => {
  if (!allMentions.length) {
    return text;
  }

  return allMentions.reduce(
    (updatedText, mention) => updatedText.split(mention).join(`<mention>${mention}</mention>`),
    text,
  );
};
