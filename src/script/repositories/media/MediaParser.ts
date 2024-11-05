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

import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {getLinksFromHtml} from 'Util/UrlUtil';

import {MediaEmbeds} from './MediaEmbeds';

import {Config} from '../../Config';

export class MediaParser {
  showEmbed: boolean;
  embeds: ((link: HTMLAnchorElement, message: string, themeColor: string) => string)[];

  constructor() {
    this.showEmbed = Config.getConfig().FEATURE.ENABLE_MEDIA_EMBEDS;
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, ({settings}: WebappProperties) => {
      this.showEmbed = settings.previews.send && Config.getConfig().FEATURE.ENABLE_MEDIA_EMBEDS;
    });

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PREVIEWS.SEND, (value: boolean) => {
      this.showEmbed = value && Config.getConfig().FEATURE.ENABLE_MEDIA_EMBEDS;
    });

    this.embeds = [MediaEmbeds.soundcloud, MediaEmbeds.spotify, MediaEmbeds.vimeo, MediaEmbeds.youtube];
  }

  /**
   * Render media embeds.
   * @note Checks message for valid media links and appends an iFrame right after the link
   *
   * @param message Message text
   * @param themeColor Accent color to be applied to the embed
   * @returns Message with rendered media embeds
   */
  readonly renderMediaEmbeds = (message: string, themeColor?: string): string => {
    if (this.showEmbed) {
      getLinksFromHtml<HTMLAnchorElement>(message).forEach(link => {
        this.embeds.forEach(embed => (message = embed(link, message, themeColor)));
      });
    }
    return message;
  };
}

export const mediaParser = new MediaParser();
