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

import {Asset} from '@wireapp/protocol-messaging';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {Environment} from 'Util/Environment';
import {Logger, getLogger} from 'Util/Logger';
import {AssetService} from './AssetService';
import {loadFileBuffer, loadImage} from 'Util/util';
import {WebWorker} from 'Util/worker';
import {AssetOptions, AssetRetentionPolicy} from '@wireapp/api-client/dist/asset';
import {Conversation} from '../entity/Conversation';

import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {encryptAesAsset, EncryptedAsset} from './AssetCrypto';
import {AssetUploadData} from '@wireapp/api-client/dist/asset';
import type {User} from '../entity/User';

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

const uploadProgressQueue: ko.ObservableArray<UploadStatus> = ko.observableArray();
const uploadCancelTokens: {[messageId: string]: () => void} = {};

export class AssetRepository {
  readonly assetService: AssetService;
  logger: Logger;

  constructor(assetService: AssetService) {
    this.assetService = assetService;
    this.logger = getLogger('AssetRepository');
  }

  __test__assignEnvironment(data: any): void {
    Object.assign(Environment, data);
  }

  async uploadProfileImage(
    image: Blob | File,
  ): Promise<{
    mediumImageKey: string;
    previewImageKey: string;
  }> {
    const [{compressedBytes: previewImageBytes}, {compressedBytes: mediumImageBytes}] = await Promise.all([
      this.compressProfileImage(image),
      this.compressImage(image),
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

  private compressProfileImage(image: File | Blob): Promise<CompressedImage> {
    return this.compressImageWithWorker('worker/profile-image-worker.js', image);
  }

  compressImage(image: File | Blob): Promise<CompressedImage> {
    return this.compressImageWithWorker('worker/image-worker.js', image);
  }

  private async compressImageWithWorker(pathToWorkerFile: string, image: File | Blob): Promise<CompressedImage> {
    const skipCompression = image.type === 'image/gif';
    const buffer = await loadFileBuffer(image);
    let compressedBytes: ArrayBuffer;
    if (skipCompression === true) {
      compressedBytes = new Uint8Array(buffer as ArrayBuffer);
    } else {
      const worker = new WebWorker(pathToWorkerFile);
      compressedBytes = await worker.post(buffer);
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
    uploadProgressQueue.push({messageId, progress: progressObservable});

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
    uploadCancelTokens[messageId] = request.cancel;

    return request.response
      .then(async uploadedAsset => {
        const protoAsset = this.buildProtoAsset(encryptedAsset, uploadedAsset, options);
        if (isImage === true) {
          const imageMeta = await this.compressImage(file);
          return this.attachImageData(protoAsset, imageMeta, file.type);
        }
        return protoAsset;
      })
      .then(asset => {
        this.removeFromQueue(messageId);
        return asset;
      });
  }

  cancelUpload(messageId: string): void {
    const cancelToken = uploadCancelTokens[messageId];
    if (cancelToken) {
      cancelToken();
      this.removeFromQueue(messageId);
    }
  }

  getNumberOfOngoingUploads(): number {
    return uploadProgressQueue().length;
  }

  getUploadProgress(messageId: string): ko.PureComputed<number> {
    return ko.pureComputed(() => {
      const uploadStatus = this.findUploadStatus(messageId);
      return uploadStatus ? uploadStatus.progress() : -1;
    });
  }

  private findUploadStatus(messageId: string): UploadStatus {
    return uploadProgressQueue().find(upload => upload.messageId === messageId);
  }

  private removeFromQueue(messageId: string): void {
    uploadProgressQueue(uploadProgressQueue().filter(upload => upload.messageId !== messageId));
    delete uploadCancelTokens[messageId];
  }
}
