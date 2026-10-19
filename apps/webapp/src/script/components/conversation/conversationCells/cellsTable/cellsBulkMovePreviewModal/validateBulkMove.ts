/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellNode, CellNodeType} from 'src/script/types/cellNode';

interface ValidateBulkMoveParams {
  conversationQualifiedId: QualifiedId;
  destinationPath: string;
  selectedNodes: CellNode[];
}

const normalizePath = (path: string): string => {
  return path.replace(/^\/+|\/+$/g, '');
};

const hasUnsafePathSegment = (path: string): boolean => {
  return path.split('/').some(segment => {
    return segment === '.' || segment === '..';
  });
};

const isSameOrDescendantPath = (path: string, parentPath: string): boolean => {
  return path === parentPath || path.startsWith(`${parentPath}/`);
};

const getParentPath = (path: string): string => {
  return path.split('/').slice(0, -1).join('/');
};

export const isBulkMoveValid = ({
  conversationQualifiedId,
  destinationPath,
  selectedNodes,
}: ValidateBulkMoveParams): boolean => {
  const destination = normalizePath(destinationPath);
  const hasQualifiedConversationPrefix = /^[^/]+@[^/]+(?:\/|$)/.test(destination);
  if (selectedNodes.length === 0 || hasUnsafePathSegment(destination) || hasQualifiedConversationPrefix) {
    return false;
  }

  const selectedPaths = selectedNodes.map(node => {
    return normalizePath(node.path);
  });
  if (
    selectedPaths.some(path => {
      return path.length === 0 || hasUnsafePathSegment(path);
    }) ||
    selectedNodes.some(node => {
      const nodeConversationId = node.conversation?.qualifiedId;
      return (
        nodeConversationId !== undefined &&
        (nodeConversationId.id !== conversationQualifiedId.id ||
          nodeConversationId.domain !== conversationQualifiedId.domain)
      );
    })
  ) {
    return false;
  }

  if (new Set(selectedPaths).size !== selectedPaths.length) {
    return false;
  }

  if (
    selectedPaths.every(path => {
      return getParentPath(path) === destination;
    })
  ) {
    return false;
  }

  const hasSelectedFolderAndChild = selectedNodes.some((node, index) => {
    if (node.type !== CellNodeType.FOLDER) {
      return false;
    }

    return selectedPaths.some((path, otherIndex) => {
      return otherIndex !== index && isSameOrDescendantPath(path, selectedPaths[index]);
    });
  });
  if (hasSelectedFolderAndChild) {
    return false;
  }

  return selectedNodes.every((node, index) => {
    if (node.type !== CellNodeType.FOLDER) {
      return true;
    }

    return !isSameOrDescendantPath(destination, selectedPaths[index]);
  });
};
