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

import {isNonEmptyString} from '@sindresorhus/is';

import {FolderIcon, PlayIcon, Tooltip, ViewerAccessIcon} from '@wireapp/react-ui-kit';

import {openFolder} from 'Components/cellsGlobalView/common/openFolder/openFolder';
import {useShouldRestrictGlobalDriveNodeActions} from 'Components/cellsGlobalView/common/useShouldRestrictGlobalDriveNodeActions/useShouldRestrictGlobalDriveNodeActions';
import {FileTypeIcon} from 'Components/conversation/common/fileTypeIcon/fileTypeIcon';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellFile, CellNode, CellNodeType} from 'src/script/types/cellNode';
import {getFileExtension} from 'Util/util';

import {
  desktopNameStyles,
  fileNameWrapperStyles,
  imagePreviewStyles,
  imagePreviewWrapperStyles,
  mobileNameStyles,
  playIconStyles,
  viewerAccessIconStyles,
  wrapperStyles,
} from './cellsTableNameColumn.styles';

import {useCellsFilePreviewModal} from '../../common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';
interface CellsTableNameColumnProps {
  node: CellNode;
}

export const CellsTableNameColumn = ({node}: CellsTableNameColumnProps) => {
  return (
    <>
      <span css={mobileNameStyles}>{node.name}</span>
      <div css={wrapperStyles}>
        {node.type === CellNodeType.FILE ? (
          <FileNameColumn file={node} />
        ) : (
          <FolderNameColumn name={node.name} path={node.path} />
        )}
      </div>
    </>
  );
};

const FileNameColumn = ({file}: {file: CellFile}) => {
  const {translate} = useApplicationContext();
  const {id, handleOpenFile, selectedFile} = useCellsFilePreviewModal();

  const isImage = isNonEmptyString(file.mimeType) && file.mimeType.startsWith('image');
  const isVideo = isNonEmptyString(file.mimeType) && file.mimeType.startsWith('video');

  const shouldDisplayImagePreview = (isImage || isVideo) && isNonEmptyString(file.previewImageUrl);
  const shouldShowViewerAccessIcon = useShouldRestrictGlobalDriveNodeActions(file);

  const {previewImageUrl, name} = file;

  return (
    <>
      {shouldDisplayImagePreview ? (
        <div css={imagePreviewWrapperStyles}>
          <img src={previewImageUrl} alt="" width={24} height={24} css={imagePreviewStyles} />
          {isVideo && <PlayIcon css={playIconStyles} width={16} height={16} />}
        </div>
      ) : (
        <FileTypeIcon extension={getFileExtension(name)} size={24} />
      )}
      <div css={fileNameWrapperStyles}>
        <button
          type="button"
          css={desktopNameStyles}
          onClick={() => handleOpenFile(file)}
          aria-controls={id}
          aria-expanded={selectedFile !== null}
          aria-haspopup="dialog"
        >
          {name}
        </button>
        {shouldShowViewerAccessIcon && (
          <Tooltip body={translate('cells.sharedDriveAccess.viewerAccess')}>
            <ViewerAccessIcon
              width={14}
              height={14}
              css={viewerAccessIconStyles}
              role="img"
              aria-label={translate('cells.sharedDriveAccess.viewerAccess')}
              data-uie-name="cells-table-viewer-access-icon"
            />
          </Tooltip>
        )}
      </div>
    </>
  );
};

const FolderNameColumn = ({name, path}: {name: string; path: string}) => {
  return (
    <>
      <FolderIcon width={24} height={24} />
      <button type="button" css={desktopNameStyles} onClick={event => openFolder({path, event})}>
        {name}
      </button>
    </>
  );
};
