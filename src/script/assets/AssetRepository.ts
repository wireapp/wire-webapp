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

import {AssetOptions, AssetRetentionPolicy} from '@wireapp/api-client/lib/asset/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import ko from 'knockout';
import {container, singleton} from 'tsyringe';

import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {getLogger, Logger} from 'Util/Logger';
import {downloadBlob, loadFileBuffer, loadImage} from 'Util/util';
import {WebWorker} from 'Util/worker';

import {decryptAesAsset} from './AssetCrypto';
import {AssetRemoteData} from './AssetRemoteData';
import {AssetService} from './AssetService';
import {AssetTransferState} from './AssetTransferState';
import {getAssetUrl, setAssetUrl} from './AssetURLCache';

import {Conversation} from '../entity/Conversation';
import {FileAsset} from '../entity/message/FileAsset';
import type {User} from '../entity/User';
import {Core} from '../service/CoreSingleton';

export interface CompressedImage {
  compressedBytes: Uint8Array;
  compressedImage: HTMLImageElement;
}

export interface AssetUploadOptions extends AssetOptions {
  domain?: string;
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

  get assetCoreService() {
    return this.core.service!.asset;
  }

  async getObjectUrl(asset: AssetRemoteData): Promise<string | undefined> {
    const objectUrl = getAssetUrl(asset.identifier);
    if (objectUrl) {
      return objectUrl;
    }

    const urlPromise = new Promise<string>(async (resolve, reject) => {
      const blob = await this.load(asset);
      if (!blob) {
        return reject(undefined);
      }
      const url = window.URL.createObjectURL(blob);
      resolve(url);
    });
    return setAssetUrl(asset.identifier, urlPromise);
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
      if (error instanceof Error) {
        const isAssetNotFound = error.message.endsWith(HTTP_STATUS.NOT_FOUND.toString());
        const isServerError = error.message.endsWith(HTTP_STATUS.INTERNAL_SERVER_ERROR.toString());

        const isExpectedError = isAssetNotFound || isServerError;

        if (!isExpectedError) {
          throw error;
        }
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

  private loadBuffer(asset: AssetRemoteData) {
    const request = this.core.service!.asset.downloadAsset(asset.urlData, fraction => {
      asset.downloadProgress(fraction * 100);
    });
    asset.cancelDownload = request.cancel;
    return request.response;
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
      if (error instanceof Error) {
        if (error.message.endsWith('Encrypted asset does not match its SHA-256 hash')) {
          asset.status(AssetTransferState.DOWNLOAD_FAILED_HASH);
        } else {
          asset.status(AssetTransferState.DOWNLOAD_FAILED_DECRPYT);
        }
      }
      return this.logger.error('Failed to download FileAsset blob', error);
    }
  }

  async uploadProfileImage(image: Blob): Promise<{
    mediumImageKey: {domain?: string; key: string};
    previewImageKey: {domain?: string; key: string};
  }> {
    const [{compressedBytes: previewImage}, {compressedBytes: mediumImage}] = await Promise.all([
      this.compressImage(image),
      this.compressImage(image, true),
    ]);

    const options: AssetUploadOptions = {
      expectsReadConfirmation: false,
      public: true,
      retention: AssetRetentionPolicy.ETERNAL,
    };

    const [previewImageKey, mediumImageKey] = await Promise.all([
      this.assetCoreService.uploadRawAsset(previewImage, options).response,
      this.assetCoreService.uploadRawAsset(mediumImage, options).response,
    ]);

    return {mediumImageKey, previewImageKey};
  }

  private async compressImage(image: Blob, useProfileImageSize: boolean = false): Promise<CompressedImage> {
    const skipCompression = image.type === 'image/gif';
    const buffer = await loadFileBuffer(image);
    let compressedBytes: ArrayBuffer;
    if (skipCompression === true) {
      compressedBytes = new Uint8Array(buffer as ArrayBuffer);
    } else {
      const worker = new WebWorker(() => new Worker(new URL('./imageWorker', import.meta.url)));
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

    const isEternalInfrequentAccess = isTeamMember || isTeamConversation || isTeamUserInConversation;
    return isEternalInfrequentAccess ? AssetRetentionPolicy.ETERNAL_INFREQUENT_ACCESS : AssetRetentionPolicy.EXPIRING;
  }

  /**
   * Uploads a file to the backend
   *
   * @param file The raw content of the file to upload
   * @param messageId The message the file is associated with
   * @param options
   * @param onCancel? Will be called if the upload has been canceled
   */
  async uploadFile(file: Blob, messageId: string, options: AssetUploadOptions, onCancel?: () => void) {
    const bytes = await loadFileBuffer(file);
    const progressObservable = ko.observable(0);
    this.uploadProgressQueue.push({messageId, progress: progressObservable});

    const request = await this.assetCoreService.uploadAsset(
      Buffer.from(bytes),
      {
        domain: options.domain,
        public: options.public,
        retention: options.retention,
      },
      fraction => {
        const percentage = fraction * 100;
        progressObservable(percentage);
      },
    );
    this.uploadCancelTokens[messageId] = () => {
      request.cancel();
      onCancel?.();
    };

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
    return ko.pureComputed(() => this.findUploadStatus(messageId)?.progress() ?? -1);
  }

  private findUploadStatus(messageId: string): UploadStatus {
    return this.uploadProgressQueue().find(upload => upload.messageId === messageId);
  }

  private removeFromUploadQueue(messageId: string): void {
    this.uploadProgressQueue(this.uploadProgressQueue().filter(upload => upload.messageId !== messageId));
    delete this.uploadCancelTokens[messageId];
  }
}
