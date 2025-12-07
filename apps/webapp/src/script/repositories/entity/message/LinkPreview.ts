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

import type {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {obfuscate} from 'Util/StringUtil';

import type {ITweet} from '@wireapp/protocol-messaging';

export type LinkPreviewData = {
  image?: AssetRemoteData;
  title?: string;
  tweet?: ITweet;
  url?: string;
};
export class LinkPreview {
  public url: string;
  public title: string;
  public image?: AssetRemoteData;
  public tweet?: ITweet;

  constructor({title = '', url = '', tweet, image}: LinkPreviewData = {}) {
    this.title = title;
    this.url = url;
    this.tweet = tweet;
    this.image = image;
  }

  obfuscate(): void {
    this.title = obfuscate(this.title);
    this.url = obfuscate(this.url);
    this.tweet = undefined;
    this.image = undefined;
  }
}
