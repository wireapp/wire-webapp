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

import {ReactNode, useEffect} from 'react';

import {DropzoneRootProps, DropzoneInputProps} from 'react-dropzone';

import {wrapperStyles} from './FileDropzone.styles';
import {FileDropzoneOverlay} from './FileDropzoneOverlay/FileDropzoneOverlay';
import {useIsDragging} from './useIsDragging/useIsDragging';

import {useFileUploadState} from '../../useFilesUploadState/useFilesUploadState';

interface FileDropzoneProps {
  isDragAccept: boolean;
  rootProps: DropzoneRootProps;
  inputProps: DropzoneInputProps;
  children: ReactNode;
}

export const FileDropzone = ({isDragAccept, rootProps, inputProps, children}: FileDropzoneProps) => {
  const {isDragging, wrapperRef} = useIsDragging();

  const {files} = useFileUploadState();

  useEffect(() => {
    // Make sure to revoke the data uris to avoid memory leaks, will run on unmount
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, [files]);

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      <div {...rootProps}>
        <input {...inputProps} />
        <FileDropzoneOverlay isActive={isDragging && isDragAccept} />
        {children}
      </div>
    </div>
  );
};
