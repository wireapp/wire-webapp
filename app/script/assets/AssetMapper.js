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

'use strict';

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetMapper = (() => {
  const _mapProfileAssets = (entity, assets) => {
    return assets.filter(asset => asset.type === 'image').map(asset => {
      const assetRemoteData = z.assets.AssetRemoteData.v3(asset.key, true);

      switch (asset.size) {
        case 'preview':
          entity.previewPictureResource(assetRemoteData);
          break;
        case 'complete':
          entity.mediumPictureResource(assetRemoteData);
          break;
        default:
          break;
      }
    });
  };

  const _mapProfileAssetsV1 = (entity, pictures) => {
    const [previewPicture, mediumPicture] = pictures;

    if (previewPicture) {
      entity.previewPictureResource(z.assets.AssetRemoteData.v1(entity.id, previewPicture.id, true));
    }

    if (mediumPicture) {
      entity.mediumPictureResource(z.assets.AssetRemoteData.v1(entity.id, mediumPicture.id, true));
    }
  };

  return {
    mapProfileAssets: _mapProfileAssets,
    mapProfileAssetsV1: _mapProfileAssetsV1,
  };
})();
