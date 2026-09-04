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

import {DragEvent, ReactNode, useRef, useState} from 'react';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  contentStyles,
  descriptionStyles,
  dropzoneStyles,
  iconWrapperStyles,
  overlayActiveStyles,
  overlayStyles,
  textWrapperStyles,
  titleStyles,
} from './sharedDriveDropzone.styles';

interface SharedDriveDropzoneProps {
  readonly children: ReactNode;
  readonly isEnabled: boolean;
  readonly onDropFiles: (files: readonly File[]) => void;
}

const dragEventContainsFiles = (event: DragEvent<HTMLElement>): boolean =>
  Array.from(event.dataTransfer.types).includes('Files');

const preventDefaultFileDrop = (event: DragEvent<HTMLElement>): void => {
  event.preventDefault();
  event.stopPropagation();
};

const UploadFilesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 21L24 21V24L0 24L0 21ZM10.5 16.5H13.5L13.5 6L19.5 6L12 0L4.5 6H10.5L10.5 16.5Z"
      fill="currentColor"
    />
  </svg>
);

export const SharedDriveDropzone = ({children, isEnabled, onDropFiles}: SharedDriveDropzoneProps) => {
  const {translate} = useApplicationContext();
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const nestedDragEventCount = useRef(0);
  const isOverlayActive = isDraggingFiles && isEnabled;

  const resetDragState = (): void => {
    nestedDragEventCount.current = 0;
    setIsDraggingFiles(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!dragEventContainsFiles(event)) {
      return;
    }

    preventDefaultFileDrop(event);
    nestedDragEventCount.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!dragEventContainsFiles(event)) {
      return;
    }

    preventDefaultFileDrop(event);
    event.dataTransfer.dropEffect = isEnabled ? 'copy' : 'none';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (!dragEventContainsFiles(event)) {
      return;
    }

    preventDefaultFileDrop(event);
    nestedDragEventCount.current -= 1;

    if (nestedDragEventCount.current <= 0) {
      resetDragState();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!dragEventContainsFiles(event)) {
      return;
    }

    preventDefaultFileDrop(event);
    resetDragState();
    onDropFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      css={dropzoneStyles}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-uie-name="shared-drive-dropzone"
    >
      <div css={isOverlayActive ? overlayActiveStyles : overlayStyles} aria-hidden={!isOverlayActive} role="status">
        <div css={contentStyles}>
          <span css={iconWrapperStyles}>
            <UploadFilesIcon />
          </span>
          <span css={textWrapperStyles}>
            <p css={titleStyles}>{translate('sharedDriveDropOverlayTitle')}</p>
            <p css={descriptionStyles}>{translate('sharedDriveDropOverlayDescription')}</p>
          </span>
        </div>
      </div>
      {children}
    </div>
  );
};
