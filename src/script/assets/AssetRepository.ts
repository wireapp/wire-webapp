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
import {Asset} from '@wireapp/protocol-messaging';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Logger, getLogger} from 'Util/Logger';
import {AssetService} from './AssetService';
import {loadFileBuffer, loadImage, downloadBlob} from 'Util/util';
import {WebWorker} from 'Util/worker';
import {AssetOptions, AssetRetentionPolicy} from '@wireapp/api-client/src/asset';
import {Conversation} from '../entity/Conversation';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {encryptAesAsset, EncryptedAsset, decryptAesAsset} from './AssetCrypto';
import {AssetUploadData} from '@wireapp/api-client/src/asset';
import {AssetRemoteData} from './AssetRemoteData';
import {getAssetUrl, setAssetUrl} from './AssetURLCache';
import {ValidationUtilError} from 'Util/ValidationUtil';
import {singleton, container} from 'tsyringe';
import type {User} from '../entity/User';
import {FileAsset} from '../entity/message/FileAsset';
import {AssetTransferState} from './AssetTransferState';

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
  readonly assetService: AssetService;

  readonly uploadProgressQueue: ko.ObservableArray<UploadStatus> = ko.observableArray();
  readonly uploadCancelTokens: {[messageId: string]: () => void} = {};
  logger: Logger;

  constructor() {
    this.assetService = container.resolve(AssetService);
    this.logger = getLogger('AssetRepository');
  }

  getObjectUrl(asset: AssetRemoteData): Promise<string> {
    const objectUrl = getAssetUrl(asset.identifier);
    return objectUrl
      ? Promise.resolve(objectUrl)
      : this.load(asset).then(blob => {
          const url = window.URL.createObjectURL(blob);
          return setAssetUrl(asset.identifier, url);
        });
  }

  public async load(asset: AssetRemoteData): Promise<void | Blob> {
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

  private async loadBuffer(
    asset: AssetRemoteData,
  ): Promise<{
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
          return request.response;
        }
        case 2: {
          const request = await this.assetService.downloadAssetV2(
            asset.urlData.assetId,
            asset.urlData.conversationId,
            asset.urlData.forceCaching,
            progress => asset.downloadProgress(progress),
          );
          asset.cancelDownload = request.cancel;
          return request.response;
        }
        case 1: {
          const request = await this.assetService.downloadAssetV1(
            asset.urlData.assetId,
            asset.urlData.conversationId,
            asset.urlData.forceCaching,
            progress => asset.downloadProgress(progress),
          );
          asset.cancelDownload = request.cancel;
          return request.response;
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

  async uploadProfileImage(
    image: Blob | File,
  ): Promise<{
    mediumImageKey: string;
    previewImageKey: string;
  }> {
    const [{compressedBytes: previewImageBytes}, {compressedBytes: mediumImageBytes}] = await Promise.all([
      this.compressImageWithWorker(image),
      this.compressImageWithWorker(image, true),
    ]);

    const options: AssetUploadOptions = {
      expectsReadConfirmation: false,
      public: true,
      retention: AssetRetentionPolicy.ETERNAL,
    };

    const previewPictureUpload = await this.assetService.uploadFile(previewImageBytes, options);
    const uploadedPreviewPicture = await previewPictureUpload.response;

    const mediumPictureUpload = await this.assetService.uploadFile(mediumImageBytes, options);
    const mediumPicture = await mediumPictureUpload.response;

    return {
      mediumImageKey: uploadedPreviewPicture.key,
      previewImageKey: mediumPicture.key,
    };
  }

  private async compressImageWithWorker(
    image: File | Blob,
    useProfileImageSize: boolean = false,
  ): Promise<CompressedImage> {
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

  private buildProtoAsset(
    encryptedAsset: EncryptedAsset,
    uploadedAsset: AssetUploadData,
    options: AssetUploadOptions,
  ): Asset {
    const assetRemoteData = new Asset.RemoteData({
      assetId: uploadedAsset.key,
      assetToken: uploadedAsset.token,
      otrKey: new Uint8Array(encryptedAsset.keyBytes),
      sha256: new Uint8Array(encryptedAsset.sha256),
    });
    const protoAsset = new Asset({
      [PROTO_MESSAGE_TYPE.ASSET_UPLOADED]: assetRemoteData,
      [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: options.expectsReadConfirmation,
      [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: options.legalHoldStatus,
    });
    return protoAsset;
  }

  private attachImageData(protoAsset: Asset, imageMeta: CompressedImage, imageType: string): Asset {
    const {compressedImage, compressedBytes} = imageMeta;
    const imageMetaData = new Asset.ImageMetaData({
      height: compressedImage.height,
      width: compressedImage.width,
    });
    const imageAsset = new Asset.Original({
      image: imageMetaData,
      mimeType: imageType,
      size: compressedBytes.length,
    });
    protoAsset[PROTO_MESSAGE_TYPE.ASSET_ORIGINAL] = imageAsset;
    return protoAsset;
  }

  async uploadFile(messageId: string, file: Blob, options: AssetUploadOptions, isImage: boolean): Promise<Asset> {
    const bytes = (await loadFileBuffer(file)) as ArrayBuffer;
    const encryptedAsset = await encryptAesAsset(bytes);

    const progressObservable = ko.observable(0);
    this.uploadProgressQueue.push({messageId, progress: progressObservable});

    const request = await this.assetService.uploadFile(
      new Uint8Array(encryptedAsset.cipherText),
      {
        public: options.public,
        retention: options.retention,
      },
      (fraction: number) => {
        const percentage = fraction * 100;
        progressObservable(percentage);
      },
    );
    this.uploadCancelTokens[messageId] = request.cancel;

    return request.response
      .then(async uploadedAsset => {
        const protoAsset = this.buildProtoAsset(encryptedAsset, uploadedAsset, options);
        if (isImage === true) {
          const imageMeta = await this.compressImageWithWorker(file);
          return this.attachImageData(protoAsset, imageMeta, file.type);
        }
        return protoAsset;
      })
      .then(asset => {
        this.removeFromUploadQueue(messageId);
        return asset;
      });
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
