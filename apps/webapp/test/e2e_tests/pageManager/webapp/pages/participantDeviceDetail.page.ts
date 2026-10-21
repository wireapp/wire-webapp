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

type ParticipantDeviceDetailsPageResult = {toggleDeviceVerification: () => Promise<void>};
export const ParticipantDeviceDetailsPage = (page: Page): ParticipantDeviceDetailsPageResult => {
  const verificationToggleLabel = page.getByTestId('do-toggle-verified').getByText('Verified');
  const returnButton = page.getByRole('button', {name: 'Go back to device details'});

  const toggleDeviceVerification = async (): Promise<void> => {
    await verificationToggleLabel.click();
    await returnButton.click();
  };

  return {
    toggleDeviceVerification,
  };
};
