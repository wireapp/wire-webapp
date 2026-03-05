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

export class AudioVideoSettingsPage {
  private readonly page: Page;

  readonly microphoneDropdown: Locator;
  readonly speakerDropdown: Locator;
  readonly cameraDropdown: Locator;
  readonly variableBitrateCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.microphoneDropdown = page.getByTestId('enter-microphone');
    this.speakerDropdown = page.getByTestId('enter-speaker');
    this.cameraDropdown = page.getByTestId('enter-camera');
    this.variableBitrateCheckbox = page.getByText('Variable Bit Rate Encoding');
  }

  async selectMicrophone(microphoneName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.microphoneDropdown.getByRole('combobox', {name: 'Microphone'}).isEditable();
    await this.microphoneDropdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: microphoneName}).click();
  }

  async selectSpeaker(speakerName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.speakerDropdown.getByRole('combobox', {name: 'Speakers'}).isEditable();
    await this.speakerDropdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: speakerName}).click();
  }

  async selectCamera(cameraName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.cameraDropdown.getByRole('combobox', {name: 'Camera'}).isEditable();
    await this.cameraDropdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: cameraName}).click();
  }
}
