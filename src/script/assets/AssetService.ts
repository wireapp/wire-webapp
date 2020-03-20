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

import {APIClient} from '@wireapp/api-client';
import {Asset, LegalHoldStatus} from '@wireapp/protocol-messaging';

import {arrayToMd5Base64, loadFileBuffer, loadImage} from 'Util/util';
import {assetV3, legacyAsset} from 'Util/ValidationUtil';
import {WebWorker} from 'Util/worker';

import {AssetRetentionPolicy} from '../assets/AssetRetentionPolicy';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {encryptAesAsset} from './AssetCrypto';
import {BackendClient} from '../service/BackendClient';

export interface UploadAssetResponse {
  key: string;
  token: string;
}

export interface CompressedImage {
  compressedBytes: any;
  compressedImage: any;
}

export interface AssetUploadOptions {
  expectsReadConfirmation: boolean;
  legalHoldStatus?: LegalHoldStatus;
  public: boolean;
  retention: AssetRetentionPolicy;
}

export class AssetService {
  private readonly apiClient: APIClient;
  private readonly backendClient: BackendClient;

  constructor(apiClient: APIClient, backendClient: BackendClient) {
    this.apiClient = apiClient;
    this.backendClient = backendClient;
  }

  uploadProfileImage(
    image: Blob | File,
  ): Promise<{
    mediumImageKey: string;
    previewImageKey: string;
  }> {
    return Promise.all([this._compressProfileImage(image), this._compressImage(image)])
      .then(([{compressedBytes: previewImageBytes}, {compressedBytes: mediumImageBytes}]) => {
        const assetUploadOptions = {
          expectsReadConfirmation: false,
          public: true,
          retention: AssetRetentionPolicy.ETERNAL,
        };
        return Promise.all([
          this.postAsset(previewImageBytes, assetUploadOptions),
          this.postAsset(mediumImageBytes, assetUploadOptions),
        ]);
      })
      .then(([previewCredentials, mediumCredentials]) => ({
        mediumImageKey: mediumCredentials.key,
        previewImageKey: previewCredentials.key,
      }));
  }

  private async _uploadAsset(
    bytes: ArrayBuffer,
    options: AssetUploadOptions,
    xhrAccessorFunction: Function,
  ): Promise<Asset> {
    return encryptAesAsset(bytes).then(({cipherText, keyBytes, sha256}) => {
      return this.postAsset(new Uint8Array(cipherText), options, xhrAccessorFunction).then(({key, token}) => {
        const assetRemoteData = new Asset.RemoteData({
          assetId: key,
          assetToken: token,
          otrKey: new Uint8Array(keyBytes),
          sha256: new Uint8Array(sha256),
        });

        const protoAsset = new Asset({
          [PROTO_MESSAGE_TYPE.ASSET_UPLOADED]: assetRemoteData,
          [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: options.expectsReadConfirmation,
          [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: options.legalHoldStatus,
        });

        return protoAsset;
      });
    });
  }

  uploadAsset(file: Blob | File, options: AssetUploadOptions, xhrAccessorFunction: Function): Promise<Asset> {
    return loadFileBuffer(file).then(buffer => this._uploadAsset(buffer as ArrayBuffer, options, xhrAccessorFunction));
  }

  uploadImageAsset(image: Blob | File, options: AssetUploadOptions, xhrAccessorFunction: Function): Promise<Asset> {
    return this._compressImage(image).then(({compressedBytes, compressedImage}) => {
      return this._uploadAsset(compressedBytes, options, xhrAccessorFunction).then(protoAsset => {
        const assetImageMetadata = new Asset.ImageMetaData({
          height: compressedImage.height,
          width: compressedImage.width,
        });

        const assetOriginal = new Asset.Original({
          image: assetImageMetadata,
          mimeType: image.type,
          size: compressedBytes.length,
        });

        protoAsset[PROTO_MESSAGE_TYPE.ASSET_ORIGINAL] = assetOriginal;
        return protoAsset;
      });
    });
  }

  generateAssetUrl(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    return Promise.resolve().then(() => {
      legacyAsset(assetId, conversationId);
      const url = this.backendClient.createUrl(`/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';
      const conversationIdParam = `&conv_id=${encodeURIComponent(conversationId)}`;

      return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${conversationIdParam}${cachingParam}`;
    });
  }

  generateAssetUrlV2(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    return Promise.resolve().then(() => {
      legacyAsset(assetId, conversationId);
      const url = this.backendClient.createUrl(`/conversations/${conversationId}/otr/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${cachingParam}`;
    });
  }

  generateAssetUrlV3(assetKey: string, assetToken: string, forceCaching: boolean): Promise<string> {
    return Promise.resolve().then(() => {
      assetV3(assetKey, assetToken);
      const url = `${this.backendClient.createUrl(`/assets/v3/${assetKey}`)}`;
      const assetTokenParam = assetToken ? `&asset_token=${encodeURIComponent(assetToken)}` : '';
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${assetTokenParam}${cachingParam}`;
    });
  }

  getAssetRetention(userEntity: any, conversationEntity: any): AssetRetentionPolicy {
    const isTeamMember = userEntity.inTeam();
    const isTeamConversation = conversationEntity.inTeam();
    const isTeamUserInConversation = conversationEntity
      .participating_user_ets()
      .some((conversationParticipant: any) => conversationParticipant.inTeam());

    const isEternal = isTeamMember || isTeamConversation || isTeamUserInConversation;
    return isEternal ? AssetRetentionPolicy.ETERNAL : AssetRetentionPolicy.PERSISTENT;
  }

  private async postAsset(
    assetData: Uint8Array,
    options: AssetUploadOptions,
    xhrAccessorFunction?: Function,
  ): Promise<UploadAssetResponse> {
    const BOUNDARY = 'frontier';

    options = {
      public: false,
      retention: AssetRetentionPolicy.PERSISTENT,
      ...options,
    };

    const optionsString = JSON.stringify(options);

    const md5Base64Hash = await arrayToMd5Base64(assetData);

    const body = [
      `--${BOUNDARY}`,
      'Content-Type: application/json; charset=utf-8',
      `Content-length: ${optionsString.length}`,
      '',
      optionsString,
      `--${BOUNDARY}`,
      'Content-Type: application/octet-stream',
      `Content-length: ${assetData.length}`,
      `Content-MD5: ${md5Base64Hash}`,
      '',
      '',
    ].join('\r\n');

    const footer = `\r\n--${BOUNDARY}--\r\n`;
    const xhr = new XMLHttpRequest();
    if (typeof xhrAccessorFunction === 'function') {
      xhrAccessorFunction(xhr);
    }
    xhr.open('POST', this.backendClient.createUrl('/assets/v3'));
    xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${BOUNDARY}`);
    xhr.setRequestHeader(
      'Authorization',
      `${this.apiClient['accessTokenStore'].accessToken?.token_type} ${this.apiClient['accessTokenStore'].accessToken?.access_token}`,
    );
    xhr.send(new Blob([body, assetData, footer]));

    return new Promise<UploadAssetResponse>((resolve, reject) => {
      xhr.onload = function(event): void {
        return this.status === 201 ? resolve(JSON.parse(this.response)) : reject(event);
      };
      xhr.onerror = reject;
    });
  }

  private _compressImage(image: File | Blob): Promise<CompressedImage> {
    return this._compressImageWithWorker('worker/image-worker.js', image, () => image.type === 'image/gif');
  }

  private _compressProfileImage(image: File | Blob): Promise<CompressedImage> {
    return this._compressImageWithWorker('worker/profile-image-worker.js', image);
  }

  private _compressImageWithWorker(
    pathToWorkerFile: string,
    image: File | Blob,
    filter?: Function,
  ): Promise<CompressedImage> {
    return loadFileBuffer(image)
      .then(buffer => {
        if (typeof filter === 'function' ? filter() : undefined) {
          return new Uint8Array(buffer as ArrayBuffer);
        }
        return new WebWorker(pathToWorkerFile).post(buffer);
      })
      .then(compressedBytes => {
        return loadImage(new Blob([compressedBytes], {type: image.type})).then(compressedImage => ({
          compressedBytes,
          compressedImage,
        }));
      });
  }
}
