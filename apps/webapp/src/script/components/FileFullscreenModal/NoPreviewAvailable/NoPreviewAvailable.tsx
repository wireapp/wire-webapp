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

import {Button} from '@wireapp/react-ui-kit';

import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {forcedDownloadFile, getFileNameWithExtension} from 'Util/util';

import {FilePlaceholder} from '../common/FilePlaceholder/FilePlaceholder';

interface NoPreviewAvailableProps {
  fileExtension: string;
  fileName: string;
  fileUrl?: string;
}

export const NoPreviewAvailable = ({fileUrl, fileName, fileExtension}: NoPreviewAvailableProps) => {
  const {translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
  const fileNameWithExtension = getFileNameWithExtension(fileName, fileExtension);
  const canDownload = canPerformCellsAction(CELLS_ACTION.DOWNLOAD);

  return (
    <FilePlaceholder
      title={translate('fileFullscreenModal.noPreviewAvailable.title')}
      description={translate(
        canDownload
          ? 'fileFullscreenModal.noPreviewAvailable.description'
          : 'fileFullscreenModal.noPreviewAvailable.viewerDescription',
      )}
      callToAction={
        canDownload && (
          <Button
            onClick={() => forcedDownloadFile({url: fileUrl ?? '', name: fileNameWithExtension})}
            disabled={fileUrl === undefined || fileUrl.length === 0}
          >
            {translate('fileFullscreenModal.noPreviewAvailable.callToAction')}
          </Button>
        )
      }
    />
  );
};
