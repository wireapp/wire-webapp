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

import type {Picture as APIClientPicture} from '@wireapp/api-client/lib/self/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import type {UserAsset as APIClientUserAsset} from '@wireapp/api-client/lib/user/';

import {AssetRemoteData} from './AssetRemoteData';

import type {User} from 'Repositories/entity/User';
import type {ServiceEntity} from 'Repositories/integration/ServiceEntity';

export type MappedAsset = {[index: string]: AssetRemoteData};

export const mapProfileAssets = (userId: QualifiedId, assets: APIClientUserAsset[]): MappedAsset => {
  const sizeMap: {[index: string]: string} = {
    complete: 'medium',
    preview: 'preview',
  };

  return assets
    .filter(asset => asset.type === 'image')
    .reduce((mappedAssets, asset) => {
      const domain = asset.domain ?? userId.domain;
      const assetRemoteData = AssetRemoteData.v3(asset.key, domain, new Uint8Array());
      return !sizeMap[asset.size] ? mappedAssets : {...mappedAssets, [sizeMap[asset.size]]: assetRemoteData};
    }, {});
};

export const mapProfileAssetsV1 = (userId: string, pictures: APIClientPicture[]): MappedAsset => {
  const [previewPicture, mediumPicture] = pictures;
  const previewAsset = previewPicture ? AssetRemoteData.v1(userId, previewPicture.id, true) : undefined;
  const mediumAsset = mediumPicture ? AssetRemoteData.v1(userId, mediumPicture.id, true) : undefined;

  return {medium: mediumAsset, preview: previewAsset};
};

export const updateUserEntityAssets = (userEntity: User | ServiceEntity, mappedAssets: MappedAsset = {}) => {
  const {preview, medium} = mappedAssets;
  if (preview) {
    userEntity.previewPictureResource(preview);
  }
  if (medium) {
    userEntity.mediumPictureResource(medium);
  }
};
