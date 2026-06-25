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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {getCellsFilesPath} from '../getCellsFilesPath/getCellsFilesPath';
import {RECYCLE_BIN_PATH} from '../recycleBin/recycleBin';

export const getCellsApiPath = ({
  conversationQualifiedId,
  currentPath = getCellsFilesPath(),
}: {
  conversationQualifiedId: QualifiedId;
  currentPath?: string;
}) => {
  const {domain, id} = conversationQualifiedId;

  // When there’re no files/folders in the bin, the api returns 404.
  // It’s because, we pass “recycle_bin” as a path for the api, but the folder itself doesn’t exist on the backend yet - it’s being created when a file/folder is deleted.
  // That's why if the current path (in the url) is the recycle bin, we don't want to add it to the path. We use the "deleted" flag instead (in useGetAllCellsNodes).
  const path = currentPath && currentPath !== RECYCLE_BIN_PATH ? `/${currentPath}` : '';

  return `${id}@${domain}${path}`;
};
