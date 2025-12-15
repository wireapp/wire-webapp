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

import {AudioType} from 'Repositories/audio/AudioType';

/**
 * Detect if the given sound is currently being played. The sounds played are managed by `AudioRepository.ts`
 * @param page the page to check if audio is playing on
 * @param type the sound which is currently playing
 */
export const isPlayingAudio = async (page: Page, type: AudioType) => {
  const audioTag = page.locator(`#audio-elements>audio[src*="${type}"]`);
  return await audioTag.evaluate((el: HTMLAudioElement) => !el.paused);
};
