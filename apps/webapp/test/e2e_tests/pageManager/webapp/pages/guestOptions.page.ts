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

import {Page} from '@playwright/test';
import {GuestLinkPasswordModal} from '../modals/guestLinkPassword.modal';
import {ConfirmModal} from '../modals/confirm.modal';

export const GuestOptionsPage = (page: Page) => {
  const panel = page.getByRole('complementary').filter({has: page.getByRole('heading', {name: 'Guests'})});
  const createPasswordModal = new GuestLinkPasswordModal(page);

  const backButton = panel.getByRole('button', {name: 'Go back'});
  const passwordSecuredRadioButton = panel.getByRole('radiogroup').getByText('Password secured', {exact: true});
  const notPasswordSecuredRadioButton = panel.getByRole('radiogroup').getByText('Not password secured', {exact: true});
  const createLinkButton = panel.getByRole('button', {name: 'Create link'});
  const revokeLinkButton = panel.getByRole('button', {name: 'Revoke link'});
  const guestsToggle = panel.getByRole('button', {name: 'Allow Guests'});

  const guestLink = panel.getByRole('button', {name: /https:\/\/.+\/conversation-join\//});

  const createLink = async (options?: {password?: string}) => {
    if (options?.password) {
      await passwordSecuredRadioButton.click();
    } else {
      await notPasswordSecuredRadioButton.click();
    }

    await createLinkButton.click();

    if (options?.password) {
      await createPasswordModal.setPasswordInput.fill(options.password);
      await createPasswordModal.confirmPasswordInput.fill(options.password);
      await createPasswordModal.actionButton.click();

      // After the link was created a second modal to copy the password will open
      await new ConfirmModal(page).actionButton.click();
    }

    return await guestLink.textContent();
  };

  const revokeLink = async () => {
    await revokeLinkButton.click();
    await new ConfirmModal(page).actionButton.click();
  };

  const toggleQuests = async () => {
    await guestsToggle.click();
    await new ConfirmModal(page).actionButton.click();
  };

  return {
    backButton,
    createLink,
    revokeLink,
    toggleQuests,
    guestsToggle,
    passwordSecuredRadioButton,
    createLinkButton,
    guestLink,
  };
};
