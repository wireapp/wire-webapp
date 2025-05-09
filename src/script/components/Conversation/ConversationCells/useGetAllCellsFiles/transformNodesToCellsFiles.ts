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

import {RestNode, RestPagination} from 'cells-sdk-ts';

import {CellPagination} from 'Components/Conversation/ConversationCells/common/cellPagination/cellPagination';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes, getFileExtension} from 'Util/util';

import {CellItem} from '../common/cellFile/cellFile';

export const transformNodesToCellsFiles = (nodes: RestNode[]): Array<CellItem> => {
  return nodes.map(node => {
    const id = node.Uuid;
    const owner = getOwner(node);
    const name = getFileName(node.Path);
    const sizeMb = getFileSize(node);
    const uploadedAtTimestamp = getUploadedAtTimestamp(node);
    const publicLink: CellItem['publicLink'] = {
      alreadyShared: !!node.Shares?.[0].Uuid,
      uuid: node.Shares?.[0].Uuid || '',
      url: undefined,
    };

    if (node.Type === 'COLLECTION') {
      return {
        id,
        type: 'folder' as const,
        owner,
        name,
        sizeMb,
        uploadedAtTimestamp,
        publicLink,
      };
    }

    return {
      id,
      type: 'file' as const,
      owner,
      conversationName: node.ContextWorkspace?.Label || '',
      mimeType: node.ContentType,
      extension: getFileExtension(node.Path),
      name,
      sizeMb,
      previewImageUrl: getPreviewImageUrl(node),
      previewPdfUrl: getPreviewPdfUrl(node),
      uploadedAtTimestamp,
      fileUrl: node.PreSignedGET?.Url,
      publicLink,
    };
  });
};

export const transformToCellPagination = (pagination: RestPagination): CellPagination => {
  return {
    limit: pagination.Limit,
    total: pagination.Total,
    totalPages: pagination.TotalPages,
    currentOffset: pagination.CurrentOffset,
    prevOffset: pagination.PrevOffset,
    nextOffset: pagination.NextOffset,
    currentPage: pagination.CurrentPage,
  };
};

const getFileName = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

const getPreviewImageUrl = (node: RestNode): string | undefined => {
  return node.Previews?.find(preview => preview.ContentType?.startsWith('image/'))?.PreSignedGET?.Url;
};

const getPreviewPdfUrl = (node: RestNode): string | undefined => {
  return node.Previews?.find(preview => preview.ContentType?.startsWith('application/pdf'))?.PreSignedGET?.Url;
};

const getUploadedAtTimestamp = (node: RestNode): number => {
  return (node.Modified as unknown as number) * TIME_IN_MILLIS.SECOND;
};

const getFileSize = (node: RestNode): string => {
  return node.Size ? formatBytes(node.Size as unknown as number) : '0 MB';
};

const getOwner = (node: RestNode): string => {
  const name = node.UserMetadata?.find(meta => meta.Namespace === 'usermeta-owner')?.JsonValue;
  return name ? JSON.parse(name) : '';
};
