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

import {AssetRemoteData} from 'Repositories/assets/assetRemoteData';

export interface ServiceData {
  assets?: APIClientUserAsset[];
  description?: string;
  enabled?: boolean;
  id?: string;
  name?: string;
  provider?: string;
  summary?: string;
  category?: string;
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
  category?: string;
  isService: boolean;

  constructor(serviceData: ServiceData = {}) {
    this.id = serviceData.id ?? '';
    this.description = serviceData.description ?? '';
    this.name = ko.observable(serviceData.name ?? '');
    this.providerId = serviceData.provider ?? '';
    this.providerName = ko.observable(' ');
    this.summary = serviceData.summary ?? '';
    this.category = serviceData.category ?? '';
    this.tags = serviceData.tags ?? [];

    this.isService = true;
  }
}
