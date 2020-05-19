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
import {isValidToken, isValidUUID} from './AssetUtil';

export interface AssetOptions {
  public: boolean;
  retention: AssetRetentionPolicy;
}

export interface AssetResponse {
  buffer: ArrayBuffer;
  mimeType: string;
}

export class AssetAPI {
  private static readonly ASSET_V3_URL = '/assets/v3';
  private static readonly ASSET_V2_URL = '/otr/assets';
  private static readonly ASSET_V2_CONVERSATION_URL = '/conversations';
  private static readonly ASSET_V1_URL = '/assets';

  constructor(private readonly client: HttpClient) {}

  async getAssetV1(
    assetId: string,
    conversationId: string,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<AssetResponse>> {
    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }
    if (!isValidUUID(conversationId)) {
      throw new TypeError(
        `Expected conversation ID "${conversationId}" to only contain alphanumeric values and dashes.`,
      );
    }

    const cancelSource = axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      onDownloadProgress: handleProgressEvent(progressCallback),
      onUploadProgress: handleProgressEvent(progressCallback),
      params: {
        conv_id: conversationId,
      },
      responseType: 'arraybuffer',
      url: `${AssetAPI.ASSET_V1_URL}/${assetId}`,
    };

    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config, true);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if (error.message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Asset download got cancelled.');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }

  async getAssetV2(
    assetId: string,
    conversationId: string,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<AssetResponse>> {
    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }
    if (!isValidUUID(conversationId)) {
      throw new TypeError(
        `Expected conversation ID "${conversationId}" to only contain alphanumeric values and dashes.`,
      );
    }

    const cancelSource = axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      onDownloadProgress: handleProgressEvent(progressCallback),
      onUploadProgress: handleProgressEvent(progressCallback),
      params: {},
      responseType: 'arraybuffer',
      url: `${AssetAPI.ASSET_V2_CONVERSATION_URL}/${conversationId}${AssetAPI.ASSET_V2_URL}/${assetId}`,
    };

    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config, true);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if (error.message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Asset download got cancelled.');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }

  async getAssetV3(
    assetId: string,
    token?: string | null,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<AssetResponse>> {
    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }

    if (token && !isValidToken(token)) {
      throw new TypeError(`Expected token "${token.substr(0, 5)}..." (redacted) to be base64 encoded string.`);
    }

    const cancelSource = axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      onDownloadProgress: handleProgressEvent(progressCallback),
      onUploadProgress: handleProgressEvent(progressCallback),
      params: {},
      responseType: 'arraybuffer',
      url: `${AssetAPI.ASSET_V3_URL}/${assetId}`,
    };

    if (token) {
      config.params.asset_token = token;
    }
    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config, true);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if (error.message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Asset download got cancelled.');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
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
      url: AssetAPI.ASSET_V3_URL,
    };

    const handleRequest = async (): Promise<AssetUploadData> => {
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
