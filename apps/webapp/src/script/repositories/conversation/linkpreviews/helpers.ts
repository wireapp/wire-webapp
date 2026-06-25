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

import Linkify from 'linkify-it';

// Matches with a fenced code block (```), whether it is closed or not
const codeBlockRegex = /(`{3,})([\s\S]*?)(?:\1|$)/g;
// Matches with inline code, even if it opens or closes on a different line
const inlineCodeRegex = /(`+)(.*?)\1/gs;

const linkify = new Linkify();

/**
 * Check if the text contains only one link
 * @param text Text to parse
 * @returns Text contains only a link
 */
export const containsOnlyLink = (text: string): boolean => {
  const textWithoutCode = text.trim().replace(codeBlockRegex, '').replace(inlineCodeRegex, ``);

  const urls = linkify.match(textWithoutCode) || [];
  return urls.length === 1 && urls[0].raw === textWithoutCode;
};

/**
 * Get first link and link offset for given text.
 * @param text Text to parse
 * @returns Containing link and its offset
 */
export const getFirstLinkWithOffset = (text: string): {offset: number; url: string} | undefined => {
  const textWithoutCode = text.trim().replace(codeBlockRegex, '').replace(inlineCodeRegex, ``);

  const links = linkify.match(textWithoutCode) || [];
  const [firstLink] = links.filter(link => ['http:', 'https:', ''].includes(link.schema));

  return firstLink
    ? {
        offset: firstLink.index,
        url: firstLink.raw,
      }
    : undefined;
};
