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

import {FolderIcon, PlayIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/conversation/common/filetypeicon/filetypeicon';
import {openFolder} from 'Components/conversation/conversationcells/common/openfolder/openfolder';
import {CellFile, CellNode, CellNodeType} from 'src/script/types/cellNode';
import {getFileExtension} from 'Util/util';

import {
  desktopNameStyles,
  imagePreviewStyles,
  imagePreviewWrapperStyles,
  mobileNameStyles,
  playIconStyles,
  wrapperStyles,
} from './cellstablenamecolumn.styles';

import {useCellsFilePreviewModal} from '../../common/cellsfilepreviewmodalcontext/cellsfilepreviewmodalcontext';

interface CellsTableNameColumnProps {
  node: CellNode;
  onCloseSearchView?: () => void;
}

export const CellsTableNameColumn = ({node, onCloseSearchView}: CellsTableNameColumnProps) => {
  return (
    <>
      <span css={mobileNameStyles}>{node.name}</span>
      <div css={wrapperStyles}>
        {node.type === CellNodeType.FILE ? (
          <FileNameColumn file={node} />
        ) : (
          <FolderNameColumn name={node.name} path={node.path} onCloseSearchView={onCloseSearchView} />
        )}
      </div>
    </>
  );
};

const FileNameColumn = ({file}: {file: CellFile}) => {
  const {id, handleOpenFile, selectedFile} = useCellsFilePreviewModal();

  const isImage = file.mimeType?.startsWith('image') === true;
  const isVideo = file.mimeType?.startsWith('video') === true;

  const shouldDisplayImagePreview = (isImage || isVideo) && file.previewImageUrl !== undefined;

  const {previewImageUrl, name} = file;

  return (
    <>
      {shouldDisplayImagePreview ? (
        <div css={imagePreviewWrapperStyles}>
          <img src={previewImageUrl} alt="" width={24} height={24} css={imagePreviewStyles} />
          {isVideo === true && <PlayIcon css={playIconStyles} width={16} height={16} />}
        </div>
      ) : (
        <FileTypeIcon extension={getFileExtension(name)} size={24} />
      )}
      <button
        type="button"
        css={desktopNameStyles}
        onClick={() => handleOpenFile(file)}
        aria-controls={id}
        aria-expanded={selectedFile !== undefined}
        aria-haspopup="dialog"
      >
        {name}
      </button>
    </>
  );
};

const FolderNameColumn = ({
  name,
  path,
  onCloseSearchView,
}: {
  name: string;
  path: string;
  onCloseSearchView?: () => void;
}) => {
  return (
    <>
      <FolderIcon width={24} height={24} />
      <button
        type="button"
        css={desktopNameStyles}
        onClick={event => openFolder({path, event, onBeforeNavigate: onCloseSearchView})}
      >
        {name}
      </button>
    </>
  );
};
