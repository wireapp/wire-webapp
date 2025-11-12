/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {isObject} from 'src/script/guards/common';

import {AssetMetaData, BackupMessageContent} from './CPB.library';
import {AudioAsset, ImageAsset} from './CPB.types';

const AssetContentType = {
  Image: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/'],
  isImage: (contentType: string): boolean => AssetContentType.Image.includes(contentType),
  Data: [
    'application/octet-stream',
    'application/zip',
    'application/pdf',
    'application/x-trash',
    'application/x-zip-compressed',
    'application/',
  ],
  isData: (contentType: string): boolean => AssetContentType.Data.includes(contentType),
  Text: ['text/plain', 'text/markdown', 'text/x-log', 'text/'],
  isText: (contentType: string): boolean => AssetContentType.Text.includes(contentType),
  Video: ['video/mp4', 'video/quicktime', 'video/'],
  isVideo: (contentType: string): boolean => AssetContentType.Video.includes(contentType),
  Audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/'],
  isAudio: (contentType: string): boolean => AssetContentType.Audio.includes(contentType),
  Undefined: '',
  isUndefined: (contentType: string): boolean => contentType === AssetContentType.Undefined,
  isOther: (contentType: string): boolean =>
    !AssetContentType.isImage(contentType) &&
    !AssetContentType.isData(contentType) &&
    !AssetContentType.isText(contentType) &&
    !AssetContentType.isVideo(contentType) &&
    !AssetContentType.isAudio(contentType) &&
    !AssetContentType.isUndefined(contentType),
};

const hasNameProperty = (infoObject: unknown): infoObject is {name: string} =>
  isObject(infoObject) && 'name' in infoObject;
const isAudioAsset = (contentType: string, metaObject: unknown): metaObject is AudioAsset =>
  AssetContentType.isAudio(contentType) &&
  isObject(metaObject) &&
  'normalization' in metaObject &&
  'duration' in metaObject;
const isImageAsset = (contentType: string, infoObject: unknown): infoObject is ImageAsset =>
  AssetContentType.isImage(contentType) &&
  isObject(infoObject) &&
  'height' in infoObject &&
  'width' in infoObject &&
  'tag' in infoObject;

/**
 * Build metadata for an asset backup
 * @param contentType
 * @param infoObject
 * @returns metadata for the asset
 */
export const buildMetaData = (contentType: string, infoObject: unknown, metaObject: unknown) => {
  let metaData: AssetMetaData | null;

  if (isAudioAsset(contentType, metaObject)) {
    metaData = new BackupMessageContent.Asset.AssetMetadata.Audio(metaObject.normalization, metaObject.duration);
  } else if (isImageAsset(contentType, infoObject)) {
    metaData = new BackupMessageContent.Asset.AssetMetadata.Image(infoObject.width, infoObject.height, infoObject.tag);
  } else if (hasNameProperty(infoObject)) {
    metaData = new BackupMessageContent.Asset.AssetMetadata.Generic(infoObject.name);
  } else {
    metaData = null;
  }

  return metaData;
};
