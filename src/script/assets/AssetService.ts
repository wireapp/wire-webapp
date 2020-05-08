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
import {AssetOptions, AssetRetentionPolicy, AssetUploadData} from '@wireapp/api-client/dist/asset';
import {ProgressCallback, RequestCancelable} from '@wireapp/api-client/dist/http';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {loadFileBuffer, loadImage} from 'Util/util';
import {assetV3, legacyAsset} from 'Util/ValidationUtil';
import {WebWorker} from 'Util/worker';
import {BackendClient} from '../service/BackendClient';
import {Conversation} from '../entity/Conversation';

export interface CompressedImage {
  compressedBytes: Uint8Array;
  compressedImage: HTMLImageElement;
}

export interface AssetUploadOptions extends AssetOptions {
  expectsReadConfirmation: boolean;
  legalHoldStatus?: LegalHoldStatus;
}

export class AssetService {
  private readonly apiClient: APIClient;
  private readonly backendClient: BackendClient;

  constructor(apiClient: APIClient, backendClient: BackendClient) {
    this.apiClient = apiClient;
    this.backendClient = backendClient;
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

    const previewPictureUpload = await this.uploadFile(previewImageBytes, options);
    const uploadedPreviewPicture = await previewPictureUpload.response;

    const mediumPictureUpload = await this.uploadFile(mediumImageBytes, options);
    const mediumPicture = await mediumPictureUpload.response;

    return {
      mediumImageKey: uploadedPreviewPicture.key,
      previewImageKey: mediumPicture.key,
    };
  }

  async generateAssetUrl(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    legacyAsset(assetId, conversationId);
    const url = this.backendClient.createUrl(`/assets/${assetId}`);
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    const conversationIdParam = `&conv_id=${encodeURIComponent(conversationId)}`;
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${conversationIdParam}${cachingParam}`;
  }

  async generateAssetUrlV2(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    legacyAsset(assetId, conversationId);
    const url = this.backendClient.createUrl(`/conversations/${conversationId}/otr/assets/${assetId}`);
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${cachingParam}`;
  }

  async generateAssetUrlV3(assetKey: string, assetToken: string, forceCaching: boolean): Promise<string> {
    assetV3(assetKey, assetToken);
    const url = this.backendClient.createUrl(`/assets/v3/${assetKey}`);
    const assetTokenParam = assetToken ? `&asset_token=${encodeURIComponent(assetToken)}` : '';
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${assetTokenParam}${cachingParam}`;
  }

  getAssetRetention(userEntity: any, conversationEntity: Conversation): AssetRetentionPolicy {
    const isTeamMember = userEntity.inTeam();
    const isTeamConversation = conversationEntity.inTeam();
    const isTeamUserInConversation = conversationEntity
      .participating_user_ets()
      .some((conversationParticipant: any) => conversationParticipant.inTeam());

    const isEternal = isTeamMember || isTeamConversation || isTeamUserInConversation;
    return isEternal ? AssetRetentionPolicy.ETERNAL : AssetRetentionPolicy.PERSISTENT;
  }

  uploadFile(
    asset: Uint8Array,
    options: AssetOptions,
    onProgress?: ProgressCallback,
  ): Promise<RequestCancelable<AssetUploadData>> {
    return this.apiClient.asset.api.postAsset(asset, options, onProgress);
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
}
