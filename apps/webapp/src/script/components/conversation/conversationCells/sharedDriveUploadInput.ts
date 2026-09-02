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

import type {ChangeEvent} from 'react';

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {SharedDriveUploadController} from './sharedDriveUploadController';

type SharedDriveUploadInputDependencies = {
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly sharedDriveUploadController: SharedDriveUploadController;
  readonly uploadPath: string;
  readonly onRefresh: () => void;
};

export const handleSharedDriveUploadInput = (
  event: ChangeEvent<HTMLInputElement>,
  {fireAndForgetInvoker, sharedDriveUploadController, uploadPath, onRefresh}: SharedDriveUploadInputDependencies,
): void => {
  const files = Array.from(event.target.files ?? []);
  event.target.value = '';
  if (!files.length) {
    return;
  }

  fireAndForgetInvoker.fireAndForget(() => sharedDriveUploadController.upload(files, uploadPath, onRefresh));
};
