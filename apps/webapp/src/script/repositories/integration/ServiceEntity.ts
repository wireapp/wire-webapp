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

import type {UserAsset as APIClientUserAsset} from '@wireapp/api-client/lib/user/';
import ko from 'knockout';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';

export interface ServiceData {
  assets?: APIClientUserAsset[];
  description?: string;
  enabled?: boolean;
  id?: string;
  name?: string;
  provider?: string;
  summary?: string;
  tags?: string[];
}

export class ServiceEntity {
  description: string;
  id: string;
  mediumPictureResource = ko.observable<AssetRemoteData>();
  name: ko.Observable<string>;
  previewPictureResource = ko.observable<AssetRemoteData>();
  providerId: string;
  providerName: ko.Observable<string>;
  summary: string;
  tags: string[];
  isService: boolean;

  constructor(serviceData: ServiceData = {}) {
    const {description = '', id = '', name = '', provider: providerId = '', summary = '', tags = []} = serviceData;

    this.id = id;
    this.description = description;
    this.name = ko.observable(name);
    this.providerId = providerId;
    this.providerName = ko.observable(' ');
    this.summary = summary;
    this.tags = tags;

    this.isService = true;
  }
}
