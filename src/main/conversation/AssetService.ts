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

import type {APIClient} from '@wireapp/api-client';
import type {AssetOptions} from '@wireapp/api-client/src/asset';
import type {ProgressCallback, RequestCancelable} from '@wireapp/api-client/src/http';

import type {EncryptedAssetUploaded} from '../cryptography/';
import {encryptAsset} from '../cryptography/AssetCryptography';

export class AssetService {
  constructor(private readonly apiClient: APIClient) {}

  /**
   * Uploads a raw asset to the backend without encrypting it
   *
   * @param plainText The raw content of the asset to upload
   * @param options?
   * @param progressCallback?
   * @return cancellable request that resolves with the uploaded image
   */
  public uploadRawAsset(asset: Buffer | Uint8Array, options?: AssetOptions, progressCallback?: ProgressCallback) {
    return this.apiClient.asset.api.postAsset(new Uint8Array(asset), options, progressCallback);
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
        const {key, token} = response;
        return {
          cipherText,
          key,
          keyBytes,
          sha256,
          token,
        };
      }),
    };
  }
}
