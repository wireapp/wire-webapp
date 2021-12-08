/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import ko from 'knockout';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {AssetOptions, AssetRetentionPolicy} from '@wireapp/api-client/src/asset/';
import {singleton, container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';
import {loadFileBuffer, loadImage, downloadBlob} from 'Util/util';
import {WebWorker} from 'Util/worker';
import {ValidationUtilError} from 'Util/ValidationUtil';

import {AssetService} from './AssetService';
import {Conversation} from '../entity/Conversation';
import {decryptAesAsset} from './AssetCrypto';
import {AssetRemoteData} from './AssetRemoteData';
import {getAssetUrl, setAssetUrl} from './AssetURLCache';
import type {User} from '../entity/User';
import {FileAsset} from '../entity/message/FileAsset';
import {AssetTransferState} from './AssetTransferState';
import {Core} from '../service/CoreSingleton';

export interface CompressedImage {
  compressedBytes: Uint8Array;
  compressedImage: HTMLImageElement;
}

export interface AssetUploadOptions extends AssetOptions {
  expectsReadConfirmation: boolean;
  legalHoldStatus?: LegalHoldStatus;
}

export interface UploadStatus {
  messageId: string;
  progress: ko.Observable<number>;
}

@singleton()
export class AssetRepository {
  readonly uploadProgressQueue: ko.ObservableArray<UploadStatus> = ko.observableArray();
  readonly uploadCancelTokens: {[messageId: string]: () => void} = {};
  logger: Logger;

  constructor(
    private readonly assetService = container.resolve(AssetService),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('AssetRepository');
  }

  async getObjectUrl(asset: AssetRemoteData): Promise<string | undefined> {
    const objectUrl = getAssetUrl(asset.identifier);
    if (objectUrl) {
      return objectUrl;
    }

    const blob = await this.load(asset);
    if (!blob) {
      return undefined;
    }
    const url = window.URL.createObjectURL(blob);
    return setAssetUrl(asset.identifier, url);
  }

  public async load(asset: AssetRemoteData): Promise<undefined | Blob> {
    try {
      let plaintext: ArrayBuffer;
      const {buffer, mimeType} = await this.loadBuffer(asset);
      const isEncryptedAsset = !!asset.otrKey && !!asset.sha256;

      if (isEncryptedAsset) {
        const otrKey = asset.otrKey instanceof Uint8Array ? asset.otrKey : Uint8Array.from(Object.values(asset.otrKey));
        const sha256 = asset.sha256 instanceof Uint8Array ? asset.sha256 : Uint8Array.from(Object.values(asset.sha256));
        plaintext = await decryptAesAsset(buffer, otrKey.buffer, sha256.buffer);
      } else {
        plaintext = buffer;
      }
      return new Blob([new Uint8Array(plaintext)], {type: mimeType});
    } catch (error) {
      const errorMessage = error?.message || '';
      const isAssetNotFound = errorMessage.endsWith(HTTP_STATUS.NOT_FOUND);
      const isServerError = errorMessage.endsWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      const isExpectedError = isAssetNotFound || isServerError;
      if (!isExpectedError) {
        throw error;
      }
      return undefined;
    }
  }

  public generateAssetUrl(asset: AssetRemoteData) {
    switch (asset.urlData.version) {
      case 3:
        return this.assetService.generateAssetUrlV3(
          asset.urlData.assetKey,
          asset.urlData.assetToken,
          asset.urlData.forceCaching,
        );
      case 2:
        return this.assetService.generateAssetUrlV2(
          asset.urlData.assetId,
          asset.urlData.conversationId,
          asset.urlData.forceCaching,
        );
      case 1:
        return this.assetService.generateAssetUrl(
          asset.urlData.assetId,
          asset.urlData.conversationId,
          asset.urlData.forceCaching,
        );
      default:
        throw Error('Cannot map URL data.');
    }
  }

  private async loadBuffer(asset: AssetRemoteData): Promise<{
    buffer: ArrayBuffer;
    mimeType: string;
  }> {
    try {
      switch (asset.urlData.version) {
        case 3: {
          const request = await this.assetService.downloadAssetV3(
            asset.urlData.assetKey,
            asset.urlData.assetToken,
            asset.urlData.forceCaching,
            progress => asset.downloadProgress(progress * 100),
          );
          asset.cancelDownload = request.cancel;
          return await request.response;
        }
        case 2: {
          const request = await this.assetService.downloadAssetV2(
            asset.urlData.assetId,
            asset.urlData.conversationId,
            asset.urlData.forceCaching,
            progress => asset.downloadProgress(progress),
          );
          asset.cancelDownload = request.cancel;
          return await request.response;
        }
        case 1: {
          const request = await this.assetService.downloadAssetV1(
            asset.urlData.assetId,
            asset.urlData.conversationId,
            asset.urlData.forceCaching,
            progress => asset.downloadProgress(progress),
          );
          asset.cancelDownload = request.cancel;
          return await request.response;
        }
        default:
          throw Error('Cannot map URL data.');
      }
    } catch (error) {
      const isValidationUtilError = error instanceof ValidationUtilError;
      const message = isValidationUtilError
        ? `Failed to validate an asset URL (loadBuffer): ${error.message}`
        : `Failed to load asset: ${error.message || error}`;
      this.logger.error(message);
      throw error;
    }
  }

  public async download(asset: AssetRemoteData, fileName: string) {
    try {
      const blob = await this.load(asset);
      if (!blob) {
        throw new Error('No blob received.');
      }
      return downloadBlob(blob, fileName);
    } catch (error) {
      return this.logger.error('Failed to download blob', error);
    }
  }

  public async downloadFile(asset: FileAsset) {
    try {
      asset.status(AssetTransferState.DOWNLOADING);
      const blob = await this.load(asset.original_resource());
      if (!blob) {
        throw new Error('No blob received.');
      }
      asset.status(AssetTransferState.UPLOADED);
      return downloadBlob(blob, asset.file_name);
    } catch (error) {
      asset.status(AssetTransferState.UPLOADED);
      return this.logger.error('Failed to download FileAsset blob', error);
    }
  }

  async uploadProfileImage(image: Blob): Promise<{
    mediumImageKey: string;
    previewImageKey: string;
  }> {
    const [{compressedBytes: previewImageBytes}, {compressedBytes: mediumImageBytes}] = await Promise.all([
      this.compressImage(image),
      this.compressImage(image, true),
    ]);

    const options: AssetUploadOptions = {
      expectsReadConfirmation: false,
      public: true,
      retention: AssetRetentionPolicy.ETERNAL,
    };

    const previewPicture = await this.assetService.uploadFile(previewImageBytes, options).response;
    const mediumPicture = await this.assetService.uploadFile(mediumImageBytes, options).response;

    return {
      mediumImageKey: previewPicture.key,
      previewImageKey: mediumPicture.key,
    };
  }

  private async compressImage(image: Blob, useProfileImageSize: boolean = false): Promise<CompressedImage> {
    const skipCompression = image.type === 'image/gif';
    const buffer = await loadFileBuffer(image);
    let compressedBytes: ArrayBuffer;
    if (skipCompression === true) {
      compressedBytes = new Uint8Array(buffer as ArrayBuffer);
    } else {
      const worker = new WebWorker('/worker/image-worker.js');
      compressedBytes = await worker.post({buffer, useProfileImageSize});
    }
    const compressedImage = await loadImage(new Blob([compressedBytes], {type: image.type}));
    return {
      compressedBytes: new Uint8Array(compressedBytes),
      compressedImage,
    };
  }

  getAssetRetention(userEntity: User, conversationEntity: Conversation): AssetRetentionPolicy {
    const isTeamMember = userEntity.inTeam();
    const isTeamConversation = conversationEntity.inTeam();
    const isTeamUserInConversation = conversationEntity
      .participating_user_ets()
      .some(conversationParticipant => conversationParticipant.inTeam());

    const isEternal = isTeamMember || isTeamConversation || isTeamUserInConversation;
    return isEternal ? AssetRetentionPolicy.ETERNAL : AssetRetentionPolicy.PERSISTENT;
  }

  async uploadFile(file: Blob, messageId: string, options: AssetUploadOptions) {
    const bytes = await loadFileBuffer(file);
    const progressObservable = ko.observable(0);
    this.uploadProgressQueue.push({messageId, progress: progressObservable});

    const request = await this.core.service!.asset.uploadAsset(
      Buffer.from(bytes),
      {
        public: options.public,
        retention: options.retention,
      },
      fraction => {
        const percentage = fraction * 100;
        progressObservable(percentage);
      },
    );
    this.uploadCancelTokens[messageId] = request.cancel;

    const response = await request.response;
    this.removeFromUploadQueue(messageId);
    return response;
  }

  cancelUpload(messageId: string): void {
    const cancelToken = this.uploadCancelTokens[messageId];
    if (cancelToken) {
      cancelToken();
      this.removeFromUploadQueue(messageId);
    }
  }

  getNumberOfOngoingUploads(): number {
    return this.uploadProgressQueue().length;
  }

  getUploadProgress(messageId: string): ko.PureComputed<number> {
    return ko.pureComputed(() => {
      const uploadStatus = this.findUploadStatus(messageId);
      return uploadStatus ? uploadStatus.progress() : -1;
    });
  }

  private findUploadStatus(messageId: string): UploadStatus {
    return this.uploadProgressQueue().find(upload => upload.messageId === messageId);
  }

  private removeFromUploadQueue(messageId: string): void {
    this.uploadProgressQueue(this.uploadProgressQueue().filter(upload => upload.messageId !== messageId));
    delete this.uploadCancelTokens[messageId];
  }
}
