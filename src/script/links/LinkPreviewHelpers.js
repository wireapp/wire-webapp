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

window.z = window.z || {};
window.z.links = z.links || {};

const codeBlockRegex = /(`+)[^`]*?\1$/gm;

z.links.LinkPreviewHelpers = {
  /**
   * Check if the text contains only one link
   * @param {string} text - Text to parse
   * @returns {boolean} Text contains only a link
   */
  containsOnlyLink(text) {
    const textWithoutCode = text.trim().replace(codeBlockRegex, '');
    const urls = linkify.find(textWithoutCode, 'url');
    return urls.length === 1 && urls[0].value === textWithoutCode;
  },

  /**
   * Get first link and link offset for given text.
   * @param {string} text - Text to parse
   * @returns {Object} Containing link and its offset
   */
  getFirstLinkWithOffset(text) {
    const textWithoutCode = text.trim().replace(codeBlockRegex, '');

    const [firstLink] = linkify.find(textWithoutCode, 'url');

    if (firstLink) {
      const linkOffset = textWithoutCode.indexOf(firstLink.value);
      return {
        offset: linkOffset,
        url: firstLink.value,
      };
    }
  },
};
