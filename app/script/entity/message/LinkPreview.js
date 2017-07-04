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

z.entity.LinkPreview = class LinkPreview {
  constructor() {
    this.original_url = '';
    this.permanent_url = '';
    this.summary = '';
    this.title = '';
    this.url_offset = 0;

    // z.assets.AssetRemoteData
    this.image_resource = ko.observable();

    this.meta_data = undefined;
    this.meta_data_type = undefined;
  }
};
