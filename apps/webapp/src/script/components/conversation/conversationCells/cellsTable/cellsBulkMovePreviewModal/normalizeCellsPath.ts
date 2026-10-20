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

export const normalizeCellsPath = (path: string, conversationQualifiedId: QualifiedId): string => {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const conversationPrefix = `${conversationQualifiedId.id}@${conversationQualifiedId.domain}`;

  if (normalizedPath === conversationPrefix) {
    return '';
  }

  return normalizedPath.startsWith(`${conversationPrefix}/`)
    ? normalizedPath.slice(conversationPrefix.length + 1)
    : normalizedPath;
};
