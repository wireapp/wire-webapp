/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';

export const generateConversationUrl = ({id, domain, filePath}: QualifiedId & {filePath?: string}): string => {
  let baseUrl = `/conversation/${id}`;

  if (domain) {
    baseUrl += `/${domain}`;
  }

  if (filePath) {
    baseUrl += `/${filePath}`;
  }

  return baseUrl;
};

export const generateExtensionUrl = (extensionId: string, subPath: string = ''): string => {
  const clean = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `/plugins/${extensionId}${clean === '/' ? '' : clean}`;
};

export const parseExtensionRoute = (
  path: string,
): {extensionId: string; subPath: string} | null => {
  const match = path.match(/^\/plugins\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  return {extensionId: match[1], subPath: match[2] ?? '/'};
};
