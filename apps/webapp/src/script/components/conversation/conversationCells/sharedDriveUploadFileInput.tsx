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

import {forwardRef} from 'react';

import type {SharedDriveUploadInputDependencies} from './sharedDriveUploadInput';
import {handleSharedDriveUploadInput} from './sharedDriveUploadInput';

export const SharedDriveUploadFileInput = forwardRef<HTMLInputElement, SharedDriveUploadInputDependencies>(
  (dependencies, ref) => (
    <input
      ref={ref}
      type="file"
      hidden
      multiple
      onChange={event => handleSharedDriveUploadInput(event, dependencies)}
    />
  ),
);

SharedDriveUploadFileInput.displayName = 'SharedDriveUploadFileInput';
