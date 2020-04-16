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

import axios, {AxiosRequestConfig} from 'axios';

import {handleProgressEvent, HttpClient, ProgressCallback, RequestCancelable, SyntheticErrorLabel} from '../http/';
import {base64MD5FromBuffer, concatToBuffer} from '../shims/node/buffer';
import {unsafeAlphanumeric} from '../shims/node/random';
import {RequestCancellationError} from '../user';
import {AssetRetentionPolicy} from './AssetRetentionPolicy';
import {AssetUploadData} from './AssetUploadData';
import {isValidAssetId, isValidToken} from './AssetUtil';

export interface AssetOptions {
  public: boolean;
  retention: AssetRetentionPolicy;
}

export class AssetAPI {
  private static readonly ASSET_URL = '/assets/v3';

  constructor(private readonly client: HttpClient) {}

  async getAsset(assetId: string, token?: string | null): Promise<ArrayBuffer> {
    if (!isValidAssetId(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }

    if (token && !isValidToken(token)) {
      throw new TypeError(`Expected token "${token.substr(0, 5)}..." (redacted) to be base64 encoded string.`);
    }

    const config: AxiosRequestConfig = {
      method: 'get',
      params: {},
      responseType: 'arraybuffer',
      url: `${AssetAPI.ASSET_URL}/${assetId}`,
    };

    if (token) {
      config.params.asset_token = token;
    }

    const response = await this.client.sendRequest<ArrayBuffer>(config, true);
    return response.data;
  }

  async postAsset(
    asset: Uint8Array,
    options?: AssetOptions,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<AssetUploadData>> {
    const BOUNDARY = `Frontier${unsafeAlphanumeric()}`;

    const metadata = JSON.stringify({
      public: true,
      retention: AssetRetentionPolicy.PERSISTENT,
      ...options,
    });

    let body = '';

    body += `--${BOUNDARY}\r\n`;
    body += 'Content-Type: application/json;charset=utf-8\r\n';
    body += `Content-length: ${metadata.length}\r\n`;
    body += '\r\n';
    body += `${metadata}\r\n`;

    body += `--${BOUNDARY}\r\n`;
    body += 'Content-Type: application/octet-stream\r\n';
    body += `Content-length: ${asset.length}\r\n`;
    body += `Content-MD5: ${base64MD5FromBuffer(asset.buffer)}\r\n`;
    body += '\r\n';

    const footer = `\r\n--${BOUNDARY}--\r\n`;

    const cancelSource = axios.CancelToken.source();

    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      data: concatToBuffer(body, asset, footer),
      headers: {
        'Content-Type': `multipart/mixed; boundary=${BOUNDARY}`,
      },
      method: 'post',
      onDownloadProgress: handleProgressEvent(progressCallback),
      onUploadProgress: handleProgressEvent(progressCallback),
      url: AssetAPI.ASSET_URL,
    };

    const handleRequest = async () => {
      try {
        const response = await this.client.sendRequest<AssetUploadData>(config);
        return response.data;
      } catch (error) {
        if (error.message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Asset upload got cancelled.');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }
}
