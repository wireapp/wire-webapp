/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.links = z.links || {};

z.links.LinkPreviewHelpers = {

  /*
  Check if the text contains only one link

  @param {string} text
  */
  contains_only_link(text) {
    text = text.trim();
    const urls = twttr.txt.extractUrls(text);
    return (urls.length === 1) && (urls[0] === text);
  },

  /*
  Get first link and link offset for given text.

   @param {string} text
  */
  get_first_link_with_offset(text) {
    const links = twttr.txt.extractUrls(text);
    const first_link = links[0];

    if (first_link != null) {
      const link_offset = text.indexOf(first_link);
      return [first_link, link_offset];
    }
  },

};
