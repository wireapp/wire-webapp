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

import {getLogger} from 'Util/Logger';
import {downloadBlob} from 'Util/util';

import {AssetRemoteData} from '../../assets/AssetRemoteData';
import {AssetType} from '../../assets/AssetType';
import {File} from './File';

export class MediumImage extends File {
  public readonly resource: ko.Observable<AssetRemoteData>;
  public readonly correlation_id: string;
  public readonly height: string;
  public readonly width: string;

  constructor(id: string) {
    super(id);

    this.correlation_id = '';
    this.type = AssetType.IMAGE;

    this.width = '0px';
    this.height = '0px';

    this.resource = ko.observable();
    this.logger = getLogger('MediumImage');
  }

  /**
   * Loads and decrypts otr asset as initiates download
   */
  download(filename?: string): Promise<number | void> {
    return this.resource()
      .load()
      .then(blob => {
        if (!blob) {
          throw new Error('No blob received.');
        }
        return downloadBlob(blob, filename);
      })
      .catch(error => this.logger.error('Failed to download image', error));
  }
}
