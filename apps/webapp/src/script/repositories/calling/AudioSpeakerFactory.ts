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

import {getLogger, Logger} from 'Util/logger';

export class AudioSpeakerFactory {
  private static readonly logger: Logger = getLogger('AudioSpeakerFactory');
  private static baseElement: HTMLElement | null = document.getElementById('calling-audio-speaker-elements');

  public static createNewCallingAudioSpeaker(stream: MediaStream): HTMLAudioElement {
    AudioSpeakerFactory.initBaseElement();

    if (!AudioSpeakerFactory.baseElement) {
      AudioSpeakerFactory.logger.error('No audio base element exist in DOM!');
      throw new Error('Audio element could not be crated!');
    }

    AudioSpeakerFactory.logger.log('Add new audio speaker');
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.play().catch((error: unknown) => {
      AudioSpeakerFactory.logger.error('Audio play failed', error);
    });
    AudioSpeakerFactory.baseElement.appendChild(audioElement);

    return audioElement;
  }

  private static initBaseElement(): void {
    if (!AudioSpeakerFactory.baseElement) {
      AudioSpeakerFactory.baseElement = document.getElementById('calling-audio-speaker-elements');
    }
  }
}
