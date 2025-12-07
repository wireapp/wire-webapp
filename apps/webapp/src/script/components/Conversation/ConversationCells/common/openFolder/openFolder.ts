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

import {MouseEvent as ReactMouseEvent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate} from 'src/script/router/routerBindings';

import {getCellsFilesPath} from '../getCellsFilesPath/getCellsFilesPath';

interface OpenFolderParams {
  conversationQualifiedId: QualifiedId;
  name: string;
  event?: ReactMouseEvent<Element, MouseEvent>;
}

export const openFolder = ({conversationQualifiedId, name, event}: OpenFolderParams) => {
  const currentPath = getCellsFilesPath();
  const pathSegments = currentPath ? currentPath.split('/') : [];
  const encodedSegments = [...pathSegments, name].map(segment => encodeURIComponent(segment));
  const newPath = encodedSegments.join('/');

  createNavigate(
    generateConversationUrl({
      id: conversationQualifiedId.id,
      domain: conversationQualifiedId.domain,
      filePath: `files/${newPath}`,
    }),
  )(event);
};
