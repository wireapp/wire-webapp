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

'use strict';

window.z = window.z || {};
window.z.media = z.media || {};

class MediaParser {
  constructor() {
    this.renderMediaEmbeds = this.renderMediaEmbeds.bind(this);

    this.embeds = [
      z.media.MediaEmbeds.soundcloud,
      z.media.MediaEmbeds.spotify,
      z.media.MediaEmbeds.vimeo,
      z.media.MediaEmbeds.youtube,
    ];
  }

  /**
   * Render media embeds.
   * @note Checks message for valid media links and appends an iFrame right after the link
   *
   * @param {string} message - Message text
   * @param {string} theme_color - Accent color to be applied to the embed
   * @returns {string} Message with rendered media embeds
   */
  renderMediaEmbeds(message, theme_color) {
    z.util.URLUtil.getLinksFromHtml(message).forEach(link => {
      this.embeds.forEach(embed => (message = embed(link, message, theme_color)));
    });

    return message;
  }
}

z.media.MediaParser = new MediaParser();
