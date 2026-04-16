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

import {Asset} from '@wireapp/protocol-messaging';

import {AbortReason, AssetTransferState} from '..';
import {EncryptedAssetUploaded} from '../../cryptography';

import {FileContent, FileMetaDataContent, ImageContent, LegalHoldStatus} from '.';

export type ImageMetaData = Asset.IImageMetaData;
export type VideoMetaData = Asset.IVideoMetaData;
export type Preview = Asset.IPreview;
export type Original = Asset.IOriginal;

export interface AssetBase {
  expectsReadConfirmation?: boolean;
  legalHoldStatus?: LegalHoldStatus;
}

// https://github.com/wireapp/generic-message-proto/blob/v1.20.0/proto/messages.proto#L201
export interface AssetContent extends AssetBase {
  abortReason?: AbortReason;
  original?: Original;
  preview?: Preview;
  status?: AssetTransferState;
  uploaded?: RemoteData;
}

export interface RemoteData extends Asset.IRemoteData {
  assetId: string;
  otrKey: Uint8Array | Buffer;
  sha256: Uint8Array | Buffer;
}

export interface AudioMetaData extends Omit<Asset.IAudioMetaData, 'normalizedLoudness'> {
  normalizedLoudness?: Uint8Array | Buffer | null;
}

export interface ImageAssetContent extends AssetBase {
  asset: EncryptedAssetUploaded;
  image: ImageContent;
}

export interface FileAssetContent extends AssetBase {
  asset: EncryptedAssetUploaded;
  file: FileContent;
  metaData: FileMetaDataContent;
}

export interface FileAssetMetaDataContent extends AssetBase {
  metaData: FileMetaDataContent;
}

export interface FileAssetAbortContent extends AssetBase {
  reason: AbortReason;
}
