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
import {resolve, graph} from '../config/appResolver';
import {Config} from '../Config';
import {SelfService} from '@wireapp/core/dist/self';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';

class MediaParser {
  constructor() {
    this.renderMediaEmbeds = this.renderMediaEmbeds.bind(this);
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });
    const selfService = new SelfService(this.backendClient);
    const propertiesRepository = new PropertiesRepository(new PropertiesService(this.backendClient), selfService);
    const showEmbed = propertiesRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND);

    this.embeds = showEmbed
      ? [MediaEmbeds.soundcloud, MediaEmbeds.spotify, MediaEmbeds.vimeo, MediaEmbeds.youtube]
      : [];
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
    getLinksFromHtml(message).forEach(link => {
      this.embeds.forEach(embed => (message = embed(link, message, themeColor)));
    });

    return message;
  }
}

export const mediaParser = new MediaParser();
