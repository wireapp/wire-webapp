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
  readonly page: Page;

  readonly microphoneDrowdown: Locator;
  readonly speakerDrowdown: Locator;

  readonly cameraDrowdown: Locator;

  constructor(page: Page) {
    this.page = page;

    this.microphoneDrowdown = page.locator('[data-uie-name="enter-microphone"]');
    this.speakerDrowdown = page.locator('[data-uie-name="enter-speaker"]');
    this.cameraDrowdown = page.locator('[data-uie-name="enter-camera"]');
  }

  async selectMicrophone(microphoneName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.microphoneDrowdown.getByRole('combobox', {name: 'Microphone'}).isEditable();
    await this.microphoneDrowdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: microphoneName}).click();
  }

  async isMicrophoneSetTo(expectedMicrophoneName: string) {
    const selectedMicrophone = await this.microphoneDrowdown.getByText(expectedMicrophoneName, {exact: true});
    return selectedMicrophone.isVisible();
  }

  async selectSpeaker(speakerName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.speakerDrowdown.getByRole('combobox', {name: 'Speakers'}).isEditable();
    await this.speakerDrowdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: speakerName}).click();
  }

  async isSpeakerSetTo(expectedSpeakerName: string) {
    const selectedSpeaker = await this.speakerDrowdown.getByText(expectedSpeakerName, {exact: true});
    return selectedSpeaker.isVisible();
  }

  async selectCamera(cameraName: string) {
    // The Select component doesn't implement the disabled state correctly so we need to use this workaround
    await this.cameraDrowdown.getByRole('combobox', {name: 'Camera'}).isEditable();
    await this.cameraDrowdown.click();
    await this.page.getByRole('listbox').getByRole('option', {name: cameraName}).click();
  }

  async isCameraSetTo(expectedCameraName: string) {
    const selectedCamera = await this.cameraDrowdown.getByText(expectedCameraName, {exact: true});
    return selectedCamera.isVisible();
  }
}
