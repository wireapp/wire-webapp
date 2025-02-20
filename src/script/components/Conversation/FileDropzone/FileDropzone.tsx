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

import {ReactNode} from 'react';

import {useDropzone} from 'react-dropzone';

import {SaveIcon} from '@wireapp/react-ui-kit';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {iconStyles, overlayActiveStyles, overlayStyles, textStyles, wrapperStyles} from './FileDropzone.styles';
import {useIsDragging} from './useIsDragging/useIsDragging';

import {useFileUploadState} from '../useFiles/useFiles';

interface FileDropzoneProps {
  children: ReactNode;
}

const MAX_FILES = 10;

export const FileDropzone = ({children}: FileDropzoneProps) => {
  const {isDragging, wrapperRef} = useIsDragging();

  const {addFiles, files} = useFileUploadState();

  const {getRootProps, getInputProps, isDragAccept} = useDropzone({
    maxFiles: MAX_FILES,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > MAX_FILES) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          secondaryAction: undefined,
          primaryAction: {
            action: () => {},
            text: 'Close',
          },
          text: {
            message: 'You can only upload 10 files at a time',
            title: 'File upload limit reached',
          },
        });
        return;
      }

      const acceptedFilesWithPreview = acceptedFiles.map(file => {
        return Object.assign(file, {
          preview: URL.createObjectURL(file),
        });
      });

      addFiles(acceptedFilesWithPreview);
    },
  });

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <div css={isDragging && isDragAccept ? overlayActiveStyles : overlayStyles}>
          <SaveIcon width={20} height={20} css={iconStyles} />
          <p css={textStyles}>Just drop to add files</p>
        </div>
        {children}
      </div>
    </div>
  );
};
