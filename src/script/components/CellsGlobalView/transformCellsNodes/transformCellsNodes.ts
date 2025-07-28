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

import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {RestNode} from 'cells-sdk-ts';

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes, getFileExtension} from 'Util/util';

import {CellNode} from '../common/cellNode/cellNode';
import {getUserQualifiedIdFromNode} from '../common/getUserQualifiedIdFromNode/getUserQualifiedIdFromNode';

export const transformCellsNodes = ({
  nodes,
  users,
  conversations,
}: {
  nodes: RestNode[];
  users: User[];
  conversations: Conversation[];
}): CellNode[] => {
  return nodes.map(node => {
    const id = node.Uuid;
    const owner = getOwner(node);
    const name = getName(node.Path);
    const sizeMb = getFileSize(node);
    const uploadedAtTimestamp = getUploadedAtTimestamp(node);
    const publicLink: CellNode['publicLink'] = {
      alreadyShared: !!node.Shares?.[0].Uuid,
      uuid: node.Shares?.[0].Uuid || '',
      url: undefined,
    };
    const conversationName = node.ContextWorkspace?.Label || '';
    const path = node.Path;
    const url = node.PreSignedGET?.Url;
    const tags = getTags(node);
    const presignedUrlExpiresAt = node.PreSignedGET?.ExpiresAt
      ? new Date(Number(node.PreSignedGET?.ExpiresAt) * TIME_IN_MILLIS.SECOND)
      : null;

    const conversationQualifiedId = parseQualifiedId(node.ContextWorkspace?.Uuid || '');
    const conversation = conversations.find(conversation => conversation.qualifiedId.id === conversationQualifiedId.id);

    const userQualifiedId = getUserQualifiedIdFromNode(node);
    const user = users.find(user => user.qualifiedId.id === userQualifiedId?.id) || null;

    if (node.Type === 'COLLECTION') {
      return {
        id,
        type: 'folder' as const,
        url,
        path,
        owner,
        conversationName,
        name,
        sizeMb,
        uploadedAtTimestamp,
        publicLink,
        tags,
        presignedUrlExpiresAt,
        user,
        conversation,
      };
    }

    return {
      id,
      type: 'file' as const,
      url,
      path,
      owner,
      conversationName,
      mimeType: node.ContentType,
      name,
      extension: getFileExtension(node.Path),
      sizeMb,
      previewImageUrl: getPreviewImageUrl(node),
      previewPdfUrl: getPreviewPdfUrl(node),
      uploadedAtTimestamp,
      publicLink,
      tags,
      presignedUrlExpiresAt,
      user,
      conversation,
    };
  });
};

const getName = (nodePath: string): string => {
  const parts = nodePath.split('/');
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
