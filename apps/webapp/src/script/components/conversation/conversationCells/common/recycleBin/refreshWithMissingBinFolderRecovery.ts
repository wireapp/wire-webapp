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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {isAxiosError} from 'Util/typePredicateUtil';

interface RefreshWithMissingBinFolderRecoveryParams {
  readonly refresh: () => Promise<boolean>;
  readonly isInBinSubfolder: () => boolean;
  readonly navigateToBinRoot: () => void;
}

/**
 * Restoring an item nested in a deleted folder restores its root parent, so the Bin folder being viewed can
 * stop existing. Listing it then answers 404. That means the folder is gone, not that the refresh failed:
 * go to the Bin root, which always exists, and count the refresh as successful.
 */
export const refreshWithMissingBinFolderRecovery = async ({
  refresh,
  isInBinSubfolder,
  navigateToBinRoot,
}: RefreshWithMissingBinFolderRecoveryParams): Promise<boolean> => {
  try {
    return await refresh();
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === HTTP_STATUS.NOT_FOUND && isInBinSubfolder()) {
      navigateToBinRoot();
      return true;
    }
    throw error;
  }
};
