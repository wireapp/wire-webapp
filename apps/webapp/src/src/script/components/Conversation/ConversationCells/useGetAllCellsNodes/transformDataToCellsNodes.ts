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
import {User} from 'Repositories/entity/User';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes, getFileExtension} from 'Util/util';

import {getUserQualifiedIdFromNode} from '../common/getUserQualifiedIdFromNode/getUserQualifiedIdFromNode';

export const transformDataToCellsNodes = ({nodes, users}: {nodes: RestNode[]; users: User[]}): Array<CellNode> => {
  return nodes.map(node => {
    const id = node.Uuid;
    const owner = getOwner(node);
    const name = getName(node.Path);
    const sizeMb = getSize(node);
    const uploadedAtTimestamp = getUploadedAtTimestamp(node);
    const publicLink: CellNode['publicLink'] = {
      alreadyShared: !!node.Shares?.[0].Uuid,
      uuid: node.Shares?.[0].Uuid || '',
      url: undefined,
    };
    const url = node.PreSignedGET?.Url;
    const path = node.Path;
    const presignedUrlExpiresAt = node.PreSignedGET?.ExpiresAt
      ? new Date(Number(node.PreSignedGET?.ExpiresAt) * TIME_IN_MILLIS.SECOND)
      : null;
    const userQualifiedId = getUserQualifiedIdFromNode(node);
    const user = users.find(user => user.qualifiedId.id === userQualifiedId?.id) || null;

    if (node.Type === 'COLLECTION') {
      return {
        id,
        type: CellNodeType.FOLDER,
        path,
        url,
        owner,
        name,
        extension: '',
        sizeMb,
        uploadedAtTimestamp,
        publicLink,
        tags: getTags(node),
        presignedUrlExpiresAt,
        user,
        conversationName: node.ContextWorkspace?.Label || '',
      };
    }

    return {
      id,
      type: CellNodeType.FILE,
      url,
      path,
      owner,
      conversationName: node.ContextWorkspace?.Label || '',
      mimeType: node.ContentType,
      extension: getFileExtension(node.Path),
      name,
      sizeMb,
      previewImageUrl: getPreviewImageUrl(node),
      previewPdfUrl: getPreviewPdfUrl(node),
      uploadedAtTimestamp,
      publicLink,
      tags: getTags(node),
      presignedUrlExpiresAt,
      user,
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

const getName = (filePath: string): string => {
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

const getSize = (node: RestNode): string => {
  return node.Size ? formatBytes(node.Size as unknown as number) : '-';
};

const getOwner = (node: RestNode): string => {
  const name = node.UserMetadata?.find(meta => meta.Namespace === 'usermeta-owner')?.JsonValue;
  return name ? JSON.parse(name) : '';
};

const getTags = (node: RestNode): string[] => {
  const tags = node.UserMetadata?.find(meta => meta.Namespace === 'usermeta-tags')?.JsonValue;

  if (!tags) {
    return [];
  }

  const parsedTags = JSON.parse(tags);
  return parsedTags.split(',').map((tag: string) => tag.trim());
};
