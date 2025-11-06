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

import {Locator, Page} from '@playwright/test';

import {BaseModal} from './base.modal';

export class CreateNewFolderModal extends BaseModal {
  readonly cancelButton: Locator;
  readonly createButton: Locator;
  readonly folderNameInput: Locator;

  constructor(page: Page) {
    super(page, 'modal-template-option');
    this.folderNameInput = this.modal.getByLabel('Folder name');
    this.cancelButton = this.modal.getByLabel('do-secondary');
    this.createButton = this.modal.getByTestId('do-action');
  }
}
