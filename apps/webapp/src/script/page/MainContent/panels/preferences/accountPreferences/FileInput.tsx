/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

interface FileInputProps extends React.HTMLProps<HTMLInputElement> {
  fileTypes?: string[];
  onFileChange?: (files: FileList) => void;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({fileTypes = ['*'], onFileChange, ...rest}, ref) => {
    return (
      <input
        ref={ref}
        type="file"
        accept={fileTypes.join(',')}
        onChange={({target}) => {
          if (target.files && target.files.length > 0) {
            onFileChange?.(target.files);
            window.setTimeout(() => {
              target.value = '';
            }, TIME_IN_MILLIS.SECOND);
          }
        }}
        onFocus={({target}) => target.blur()}
        {...rest}
      />
    );
  },
);

FileInput.displayName = 'FileInput';

export {FileInput};
