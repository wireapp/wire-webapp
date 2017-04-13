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
window.z.entity = z.entity || {};

z.entity.MediumImage = class MediumImage extends z.entity.Asset {
  constructor(id) {
    super(id);
    this.type = z.assets.AssetType.IMAGE;

    this.correlation_id = '';

    this.width = '0px';
    this.height = '0px';

    this.file_name = '';
    this.file_size = '';
    this.file_type = '';

    // z.assets.AssetRemoteData
    this.resource = ko.observable();
  }

  download(file_name) {
    if (this.resource()) {
      return this.resource().load()
        .then(function(blob) {
          z.util.download_blob(blob, file_name);
        });
    }

    return undefined;
  }
};
