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

import {ImageContent} from '../../conversation/content/';
import {EncryptedAsset} from '../../cryptography/root';

// https://github.com/wireapp/generic-message-proto/blob/v1.20.0/proto/messages.proto#L201
interface AssetContent {
  uploaded?: RemoteData;
  abortReason?: number;
  original?: Original;
  preview?: Preview;
}

interface RemoteData {
  assetId: string;
  otrKey: Uint8Array | Buffer;
  sha256: Uint8Array | Buffer;
  assetToken?: string;
}

interface Original {
  mimeType: string;
  size: number;
  name?: string;
  source?: string;
  caption?: string;
  image?: ImageMetaData;
  video?: VideoMetaData;
  audio?: AudioMetaData;
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
  asset: EncryptedAsset & {key: string; token: string};
  image: ImageContent;
}

export {AssetContent, ImageAssetContent, Original, RemoteData, ImageMetaData, VideoMetaData, AudioMetaData, Preview};
