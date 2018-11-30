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

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetMapper = {
  /**
   * Creates asset entities out of raw asset data.
   *
   * @param {string} userId - the id of the user that will hold the asset
   * @param {Array<Object>} assets - the assets to map
   * @returns {MappedAssets} Object containing the mapped assets
   */
  mapProfileAssets: (userId, assets) => {
    const sizeMap = {
      complete: 'medium',
      preview: 'preview',
    };

    return assets
      .filter(asset => asset.type === 'image')
      .reduce((mappedAssets, asset) => {
        const assetRemoteData = z.assets.AssetRemoteData.v3(asset.key, true);

        return !sizeMap[asset.size]
          ? mappedAssets
          : Object.assign({}, mappedAssets, {[sizeMap[asset.size]]: assetRemoteData});
      }, {});
  },

  /**
   * Creates asset entities out of raw asset data.
   *
   * @param {string} userId - the id of the user that will hold the asset
   * @param {Array<Object>} pictures - the pictures to map
   * @returns {MappedAssets} Object containing the mapped assets
   */
  mapProfileAssetsV1: (userId, pictures) => {
    const [previewPicture, mediumPicture] = pictures;
    const previewAsset = previewPicture ? z.assets.AssetRemoteData.v1(userId, previewPicture.id, true) : undefined;
    const mediumAsset = mediumPicture ? z.assets.AssetRemoteData.v1(userId, mediumPicture.id, true) : undefined;

    return {medium: mediumAsset, preview: previewAsset};
  },

  /**
   * Updates the user entity's assets.
   *
   * @param {z.entity.User} userEntity - the user entity to update
   * @param {MappedAssets} mappedAssets - the assets to add to the user entity
   * @returns {void}
   */
  updateUserEntityAssets(userEntity, mappedAssets = {}) {
    const {preview, medium} = mappedAssets;
    if (preview) {
      userEntity.previewPictureResource(preview);
    }
    if (medium) {
      userEntity.mediumPictureResource(medium);
    }
  },
};
