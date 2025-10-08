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

import {AssetRetentionPolicy} from './AssetRetentionPolicy';
import {AssetUploadData} from './AssetUploadData';
import {isValidToken, isValidUUID} from './AssetUtil';

import {BackendFeatures} from '../APIClient';
import {
  BackendError,
  handleProgressEvent,
  HttpClient,
  ProgressCallback,
  RequestCancelable,
  SyntheticErrorLabel,
} from '../http/';
import {base64MD5FromBuffer, concatToBuffer} from '../shims/node/buffer';
import {unsafeAlphanumeric} from '../shims/node/random';
import {RequestCancellationError} from '../user';

export interface CipherOptions {
  /** Set a custom algorithm for encryption */
  algorithm?: string;
  /** Set a custom hash for encryption */
  hash?: Buffer;
}

export interface AssetOptions extends CipherOptions {
  public?: boolean;
  retention?: AssetRetentionPolicy;
  /** If given, will upload an asset that can be shared in a federated env */
  domain?: string;
}

export interface AssetResponse {
  buffer: ArrayBuffer;
  mimeType?: string;
}

const ASSET_URLS = {
  ASSET_V3_URL: '/assets/v3',
  ASSET_V4_URL: '/assets/v4',
  ASSET_SERVICE_URL: '/bot/assets',
  ASSET_V2_URL: '/otr/assets',
  ASSET_V2_CONVERSATION_URL: '/conversations',
  ASSET_V1_URL: '/assets',
  ASSETS_URL: '/assets',
} as const;

export class AssetAPI {
  constructor(
    private readonly client: HttpClient,
    private readonly backendFeatures: BackendFeatures,
  ) {}

  private getAssetShared(
    assetUrl: string,
    token?: string | null,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ): RequestCancelable<AssetResponse> {
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
      url: assetUrl,
    };

    if (token) {
      config.params.asset_token = token;
    }

    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
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

  private postAssetShared(
    assetBaseUrl: string,
    asset: Uint8Array,
    options?: AssetOptions,
    progressCallback?: ProgressCallback,
  ): RequestCancelable<AssetUploadData> {
    const BOUNDARY = `Frontier${unsafeAlphanumeric()}`;

    const metadata = JSON.stringify({
      public: options?.public ?? true,
      retention: options?.retention || AssetRetentionPolicy.PERSISTENT,
      domain: options?.domain,
    });

    const body =
      `--${BOUNDARY}\r\n` +
      'Content-Type: application/json;charset=utf-8\r\n' +
      `Content-length: ${metadata.length}\r\n` +
      '\r\n' +
      `${metadata}\r\n` +
      `--${BOUNDARY}\r\n` +
      'Content-Type: application/octet-stream\r\n' +
      `Content-length: ${asset.length}\r\n` +
      `Content-MD5: ${base64MD5FromBuffer(asset.buffer)}\r\n` +
      '\r\n';

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
      url: assetBaseUrl,
    };

    const handleRequest = async (): Promise<AssetUploadData> => {
      try {
        const response = await this.client.sendRequest<AssetUploadData>(config);
        return response.data;
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
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

  getAssetV1(
    assetId: string,
    conversationId: string,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ) {
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
      url: `${ASSET_URLS.ASSET_V1_URL}/${assetId}`,
    };

    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
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

  getAssetV2(
    assetId: string,
    conversationId: string,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ) {
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
      url: `${ASSET_URLS.ASSET_V2_CONVERSATION_URL}/${conversationId}${ASSET_URLS.ASSET_V2_URL}/${assetId}`,
    };

    if (forceCaching) {
      config.params.forceCaching = forceCaching;
    }

    const handleRequest = async (): Promise<AssetResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
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

  getAssetV3(
    assetId: string,
    token?: string | null,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ) {
    const version2 = 2;

    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }
    if (this.backendFeatures.version >= version2) {
      throw new TypeError('Asset v3 is not supported on backend version 2 or higher.');
    }
    return this.getAssetShared(`${ASSET_URLS.ASSET_V3_URL}/${assetId}`, token, forceCaching, progressCallback);
  }

  getAssetV4(
    assetId: string,
    assetDomain: string,
    token?: string | null,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ) {
    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }

    const isValidDomain = (domain: string) =>
      !!domain && /^([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*\.)+[a-zA-Z]{2,}$/.test(domain);

    if (!isValidDomain(assetDomain)) {
      throw new TypeError(`Invalid asset domain ${assetDomain}`);
    }
    const assetBaseUrl = this.backendFeatures.version >= 2 ? ASSET_URLS.ASSETS_URL : ASSET_URLS.ASSET_V4_URL;
    return this.getAssetShared(`${assetBaseUrl}/${assetDomain}/${assetId}`, token, forceCaching, progressCallback);
  }

  getServiceAsset(
    assetId: string,
    token?: string | null,
    forceCaching: boolean = false,
    progressCallback?: ProgressCallback,
  ) {
    if (!isValidUUID(assetId)) {
      throw new TypeError(`Expected asset ID "${assetId}" to only contain alphanumeric values and dashes.`);
    }

    const assetBaseUrl = `${ASSET_URLS.ASSET_SERVICE_URL}/${assetId}`;
    return this.getAssetShared(assetBaseUrl, token, forceCaching, progressCallback);
  }

  /**
   * Uploads an asset to the backend
   *
   * @param asset Raw content of the asset to upload
   * @param options?
   * @param progressCallback? Will be called at every progress of the upload
   */
  postAsset(asset: Uint8Array, options?: AssetOptions, progressCallback?: ProgressCallback) {
    const baseUrl = this.backendFeatures.version >= 2 ? ASSET_URLS.ASSETS_URL : ASSET_URLS.ASSET_V3_URL;
    return this.postAssetShared(baseUrl, asset, options, progressCallback);
  }

  postServiceAsset(asset: Uint8Array, options?: AssetOptions, progressCallback?: ProgressCallback) {
    const assetBaseUrl = ASSET_URLS.ASSET_SERVICE_URL;
    return this.postAssetShared(assetBaseUrl, asset, options, progressCallback);
  }
}
