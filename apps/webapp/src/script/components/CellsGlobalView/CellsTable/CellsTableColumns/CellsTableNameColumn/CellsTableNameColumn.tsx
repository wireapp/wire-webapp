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

import {openFolder} from 'Components/CellsGlobalView/common/openFolder/openFolder';
import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {CellFile, CellNode, CellNodeType} from 'src/script/types/cellNode';
import {getFileExtension} from 'Util/util';

import {
  desktopNameStyles,
  imagePreviewStyles,
  imagePreviewWrapperStyles,
  mobileNameStyles,
  playIconStyles,
  wrapperStyles,
} from './CellsTableNameColumn.styles';

import {useCellsFilePreviewModal} from '../../common/CellsFilePreviewModalContext/CellsFilePreviewModalContext';
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
  const {id, handleOpenFile, selectedFile} = useCellsFilePreviewModal();

  const isImage = file.mimeType?.startsWith('image');
  const isVideo = file.mimeType?.startsWith('video');

  const shouldDisplayImagePreview = (isImage || isVideo) && file?.previewImageUrl;

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
      <button
        type="button"
        css={desktopNameStyles}
        onClick={() => handleOpenFile(file)}
        aria-controls={id}
        aria-expanded={!!selectedFile}
        aria-haspopup="dialog"
      >
        {name}
      </button>
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
