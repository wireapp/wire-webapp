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

import {getLinksFromHtml} from 'Util/UrlUtil';

import {MediaEmbeds} from './MediaEmbeds';
import {WebAppEvents} from '../event/WebApp';
import {amplify} from 'amplify';

class MediaParser {
  constructor() {
    this.renderMediaEmbeds = this.renderMediaEmbeds.bind(this);
    this.showEmbed = true;
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, ({settings}) => {
      this.showEmbed = settings.previews.send;
    });

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PREVIEWS.SEND, value => {
      this.showEmbed = value;
    });

    this.embeds = [MediaEmbeds.soundcloud, MediaEmbeds.spotify, MediaEmbeds.vimeo, MediaEmbeds.youtube];
  }

  /**
   * Render media embeds.
   * @note Checks message for valid media links and appends an iFrame right after the link
   *
   * @param {string} message Message text
   * @param {string} themeColor Accent color to be applied to the embed
   * @returns {string} Message with rendered media embeds
   */
  renderMediaEmbeds(message, themeColor) {
    if (this.showEmbed) {
      getLinksFromHtml(message).forEach(link => {
        this.embeds.forEach(embed => (message = embed(link, message, themeColor)));
      });
    }
    return message;
  }
}

export const mediaParser = new MediaParser();
