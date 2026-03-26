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

/** Modal shown when a link for guests to join a group conversation with a password is created */
export class GuestLinkPasswordModal extends BaseModal {
  readonly setPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, 'modal-template-guest-link-password');

    this.setPasswordInput = this.modal.getByRole('textbox', {name: 'Set password'});
    this.confirmPasswordInput = this.modal.getByRole('textbox', {name: 'Confirm password'});
    this.errorMessage = this.modal.getByTestId('primary-modals-error-message');
  }
}
