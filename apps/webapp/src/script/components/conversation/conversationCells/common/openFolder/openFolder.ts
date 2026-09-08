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
import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';

import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate} from 'src/script/router/routerBindings';

interface OpenFolderParams {
  path: string;
  event?: ReactMouseEvent<Element, MouseEvent>;
  // Called before navigating so the search view can close before the browse view re-enables.
  onBeforeNavigate?: () => void;
  conversationQualifiedId?: QualifiedId;
}

export const openFolder = ({path, event, onBeforeNavigate, conversationQualifiedId}: OpenFolderParams) => {
  const stripped = path.startsWith('/') ? path.slice(1) : path;
  const [firstSegment, ...rest] = stripped.split('/');

  const isAbsolute = firstSegment.includes('@');
  const {id, domain} = isAbsolute ? parseQualifiedId(firstSegment) : (conversationQualifiedId ?? {id: '', domain: ''});
  const filePathParts = isAbsolute ? rest : stripped.split('/').filter(Boolean);

  const filePath = `files/${filePathParts.map(encodeURIComponent).join('/')}`;

  onBeforeNavigate?.();
  createNavigate(generateConversationUrl({id, domain, filePath}))(event);
};
