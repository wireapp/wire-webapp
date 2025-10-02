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
import logdown from 'logdown';

import {LogFactory} from '@wireapp/commons';
import {QualifiedConversationId} from '@wireapp/protocol-messaging';

import {AssetUploadData, PostAssetsResponseSchema} from './AssetAPI.schema';
import {AssetRetentionPolicy} from './AssetRetentionPolicy';
import {isValidToken, isValidUUID} from './AssetUtil';

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

export interface AssetAuditData {
  conversationId: QualifiedConversationId;
  filename: string;
  filetype: string;
}
export interface AssetOptions extends CipherOptions {
  public?: boolean;
  retention?: AssetRetentionPolicy;
  /** If given, will upload an asset that can be shared in a federated env */
  domain?: string;
  /** Used for identifying the conversation the asset belongs to */
  auditData?: AssetAuditData;
}

export interface AssetResponse {
  buffer: ArrayBuffer;
  mimeType?: string;
}

export class AssetAPI {
  private readonly logger: logdown.Logger;

  constructor(private readonly client: HttpClient) {
    this.logger = LogFactory.getLogger('@wireapp/api-client/AssetAPI');
  }

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

    const metadataObject: {
      public: boolean;
      retention: AssetRetentionPolicy;
      domain?: string;
      convId?: QualifiedConversationId;
      filename?: string;
      filetype?: string;
    } = {
      public: options?.public ?? true,
      retention: options?.retention || AssetRetentionPolicy.PERSISTENT,
      domain: options?.domain,
    };

    if (options?.auditData) {
      metadataObject.convId = options.auditData.conversationId;
      metadataObject.filename = options.auditData.filename;
      metadataObject.filetype = options.auditData.filetype;
    }

    const metadata = JSON.stringify(metadataObject);

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
        const validation = PostAssetsResponseSchema.safeParse(response.data);

        if (!validation.success) {
          this.logger.warn('Asset upload response validation failed:', validation.error);
        }

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

  getAsset(
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

    return this.getAssetShared(`/assets/${assetDomain}/${assetId}`, token, forceCaching, progressCallback);
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

    const assetBaseUrl = `/bot/assets/${assetId}`;
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
    return this.postAssetShared('/assets', asset, options, progressCallback);
  }

  postServiceAsset(asset: Uint8Array, options?: AssetOptions, progressCallback?: ProgressCallback) {
    return this.postAssetShared('/bot/assets', asset, options, progressCallback);
  }
}
