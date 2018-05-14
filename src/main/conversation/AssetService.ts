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

import APIClient = require('@wireapp/api-client');
import {AssetRetentionPolicy} from '@wireapp/api-client/dist/commonjs/asset/AssetRetentionPolicy';
import {Image} from '../conversation/root';
import * as AssetCryptography from '../cryptography/AssetCryptography.node';
import {CryptographyService, EncryptedAsset} from '../cryptography/root';

export interface AssetOptions {
  public: boolean;
  retention: AssetRetentionPolicy;
}

export default class AssetService {
  constructor(
    private readonly apiClient: APIClient,
    private readonly protocolBuffers: any = {},
    private readonly cryptographyService: CryptographyService
  ) {}

  private async postAsset(
    buffer: Buffer,
    options?: AssetOptions
  ): Promise<EncryptedAsset & {key: string; token: string}> {
    const {cipherText, keyBytes, sha256} = await AssetCryptography.encryptAsset(buffer);
    const {key, token} = await this.apiClient.asset.api.postAsset(new Uint8Array(cipherText), options);
    return {
      cipherText,
      key,
      keyBytes,
      sha256,
      token,
    };
  }

  public async uploadImageAsset(image: Image, options?: AssetOptions): Promise<any> {
    const {key, keyBytes, sha256, token} = await this.postAsset(image.data, options);
    const imageMetadata = this.protocolBuffers.Asset.ImageMetaData.create({
      height: image.height,
      width: image.width,
    });

    const original = this.protocolBuffers.Asset.Original.create({
      image: imageMetadata,
      mimeType: image.type,
      name: null,
      size: image.data.length,
    });

    const remoteData = this.protocolBuffers.Asset.RemoteData.create({
      assetId: key,
      assetToken: token,
      otrKey: keyBytes,
      sha256,
    });

    const asset = this.protocolBuffers.Asset.create({
      original,
      uploaded: remoteData,
    });

    return asset;
  }
}
