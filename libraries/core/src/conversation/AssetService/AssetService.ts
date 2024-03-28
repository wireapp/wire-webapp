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

import {AssetOptions, AssetResponse} from '@wireapp/api-client/lib/asset';
import {ProgressCallback, RequestCancelable} from '@wireapp/api-client/lib/http';

import {APIClient} from '@wireapp/api-client';

import {EncryptedAsset, EncryptedAssetUploaded} from '../../cryptography';
import {decryptAsset, encryptAsset} from '../../cryptography/AssetCryptography/AssetCryptography';

interface AssetDataV4 {
  assetKey: string;
  assetToken: string;
  assetDomain: string;
  forceCaching: boolean;
  version: 4;
}
interface AssetDataV3 {
  assetKey: string;
  assetToken: string;
  forceCaching: boolean;
  version: 3;
}

interface AssetDataV2 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 2;
}

interface AssetDataV1 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 1;
}

export {ProgressCallback};
export type AssetUrlData = AssetDataV1 | AssetDataV2 | AssetDataV3 | AssetDataV4;

export class AssetService {
  constructor(private readonly apiClient: APIClient) {}

  /**
   * Will download an asset on the server.
   * Will route the request to the right endpoint depending on the asset version
   *
   * @param assetData The versioned asset data
   * @param progressCallback?
   * @return Resolves when the asset has been uploaded
   */
  public downloadRawAsset(assetData: AssetUrlData, progressCallback?: ProgressCallback) {
    const {forceCaching} = assetData;

    switch (assetData.version) {
      case 1:
        return this.apiClient.api.asset.getAssetV1(
          assetData.assetId,
          assetData.conversationId,
          forceCaching,
          progressCallback,
        );
      case 2:
        return this.apiClient.api.asset.getAssetV2(
          assetData.assetId,
          assetData.conversationId,
          forceCaching,
          progressCallback,
        );
      case 3:
        return this.apiClient.api.asset.getAssetV3(
          assetData.assetKey,
          assetData.assetToken,
          forceCaching,
          progressCallback,
        );
      case 4:
        return this.apiClient.api.asset.getAssetV4(
          assetData.assetKey,
          assetData.assetDomain,
          assetData.assetToken,
          forceCaching,
          progressCallback,
        );
    }
  }

  /**
   * Uploads a raw asset to the backend without encrypting it
   *
   * @param plainText The raw content of the asset to upload
   * @param options?
   * @param progressCallback?
   * @return cancellable request that resolves with the uploaded image
   */
  public uploadRawAsset(asset: Buffer | Uint8Array, options?: AssetOptions, progressCallback?: ProgressCallback) {
    return this.apiClient.api.asset.postAsset(new Uint8Array(asset), options, progressCallback);
  }

  /**
   * Will encrypt and upload an asset to the backend
   *
   * @param plainText The raw content of the asset to upload
   * @param options?
   * @param progressCallback?
   * @return cancellable request that resolves with the uploaded image and decryption keys
   */
  public async uploadAsset(
    plainText: Buffer | Uint8Array,
    options?: AssetOptions,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<EncryptedAssetUploaded>> {
    const {cipherText, keyBytes, sha256} = await encryptAsset({
      plainText,
      algorithm: options?.algorithm,
      hash: options?.hash,
    });

    const request = this.uploadRawAsset(cipherText, options, progressCallback);

    return {
      ...request,
      response: request.response.then(response => {
        const {key, token, domain} = response;
        return {
          cipherText,
          domain,
          key,
          keyBytes,
          sha256,
          token,
        };
      }),
    };
  }

  public decryptAsset(asset: EncryptedAsset) {
    return decryptAsset(asset);
  }

  /**
   * Will download and decrypt an asset stored on the server
   * @param assetData - the data of the asset to download
   * @param otrKey the encryption key used to encrypt the asset
   * @param sha256 the sha256 hash of the asset
   * @param progressCallback a progress callback to inform about the download progress
   */
  public downloadAsset(
    assetData: AssetUrlData,
    otrKey: Uint8Array,
    sha256: Uint8Array,
    progressCallback?: ProgressCallback,
  ): {response: Promise<AssetResponse>; cancel: () => void} {
    const request = this.downloadRawAsset(assetData, progressCallback);
    const {response} = request;

    return {
      response: response.then(async response => ({
        ...response,
        buffer: await decryptAsset({
          cipherText: new Uint8Array(response.buffer),
          keyBytes: otrKey,
          sha256: sha256,
        }),
      })),
      cancel: request.cancel,
    };
  }
}
