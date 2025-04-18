/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {RestNode} from 'cells-sdk-ts';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes} from 'Util/util';

import {CellFile} from '../common/cellFile/cellFile';

export const transformCellsFiles = (nodes: RestNode[]): CellFile[] => {
  return nodes
    .filter(node => node.Type === 'LEAF')
    .map(node => ({
      id: node.Uuid,
      owner: getOwner(node),
      conversationName: node.ContextWorkspace?.Label || '',
      mimeType: node.ContentType,
      name: getFileName(node.Path),
      sizeMb: getFileSize(node),
      previewImageUrl: getPreviewImageUrl(node),
      uploadedAtTimestamp: getUploadedAtTimestamp(node),
      fileUrl: node.PreSignedGET?.Url,
      publicLink: {
        alreadyShared: !!node.Shares?.[0].Uuid,
        uuid: node.Shares?.[0].Uuid || '',
        url: undefined,
      },
    }));
};

const getFileName = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

const getPreviewImageUrl = (node: RestNode): string | undefined => {
  return node.Previews?.find(preview => preview.ContentType?.startsWith('image/'))?.PreSignedGET?.Url;
};

const getUploadedAtTimestamp = (node: RestNode): number => {
  return (node.Modified as unknown as number) * TIME_IN_MILLIS.SECOND;
};

const getFileSize = (node: RestNode): string => {
  return formatBytes(node.Size as unknown as number);
};

const getOwner = (node: RestNode): string => {
  const name = node.UserMetadata?.find(meta => meta.Namespace === 'usermeta-owner')?.JsonValue;
  return name ? JSON.parse(name) : '';
};
