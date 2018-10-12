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

import {AbortReason, AssetTransferState} from '../../conversation/';
import {FileContent, FileMetaDataContent, ImageContent} from '../../conversation/content/';
import {EncryptedAssetUploaded} from '../../cryptography/';

// https://github.com/wireapp/generic-message-proto/blob/v1.20.0/proto/messages.proto#L201
interface AssetContent {
  abortReason?: AbortReason;
  original?: Original;
  preview?: Preview;
  status?: AssetTransferState;
  uploaded?: RemoteData;
}

interface RemoteData {
  assetId: string;
  assetToken?: string;
  otrKey: Uint8Array | Buffer;
  sha256: Uint8Array | Buffer;
}

interface Original {
  audio?: AudioMetaData;
  caption?: string;
  image?: ImageMetaData;
  mimeType: string;
  name?: string;
  size: number;
  source?: string;
  video?: VideoMetaData;
}

interface ImageMetaData {
  height: number;
  width: number;
  tag?: string;
}

interface VideoMetaData {
  height?: number;
  width?: number;
  duration?: number;
}

interface AudioMetaData {
  duration?: number;
  loudness?: Uint8Array | Buffer;
}

interface Preview {
  mimeType: string;
  size: number;
  remote?: RemoteData;
  image?: ImageMetaData;
}

interface ImageAssetContent {
  asset: EncryptedAssetUploaded;
  image: ImageContent;
}

interface FileAssetContent {
  asset: EncryptedAssetUploaded;
  file: FileContent;
}

interface FileAssetMetaDataContent {
  metaData: FileMetaDataContent;
}

interface FileAssetAbortContent {
  reason: AbortReason;
}

export {
  AssetContent,
  AudioMetaData,
  FileAssetContent,
  FileAssetMetaDataContent,
  FileAssetAbortContent,
  ImageAssetContent,
  ImageMetaData,
  Original,
  Preview,
  RemoteData,
  VideoMetaData,
};
