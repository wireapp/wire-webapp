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
    await this.microphoneDrowdown.click();
    await this.getMicrophoneOptions().locator(`text=${microphoneName}`).click();
  }

  async selectSpeaker(speakerName: string) {
    await this.speakerDrowdown.click();
    await this.getSpeakerOptions().locator(`text=${speakerName}`).click();
  }

  async selectCamera(cameraName: string) {
    await this.cameraDrowdown.click();
    await this.getCameraOptions().locator(`text=${cameraName}`).click();
  }

  private getMicrophoneOptions(): Locator {
    return this.page.locator(`[data-uie-name="option-enter-microphone"]`);
  }

  private getSpeakerOptions(): Locator {
    return this.page.locator(`[data-uie-name="option-enter-speaker"]`);
  }

  private getCameraOptions(): Locator {
    return this.page.locator(`[data-uie-name="option-enter-camera"]`);
  }
}
