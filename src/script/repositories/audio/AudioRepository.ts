/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {AudioPreference, WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';

import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import {Logger, getLogger} from 'Util/Logger';

import {AudioPlayingType} from './AudioPlayingType';
import {AudioType} from './AudioType';

enum AUDIO_PLAY_PERMISSION {
  ALLOWED = 0,
  DISALLOWED_BY_MUTE_STATE = 3,
  DISALLOWED_BY_PREFERENCES = 2,
}

export class AudioRepository {
  private readonly logger: Logger;
  private readonly audioElements: Record<string, HTMLAudioElement>;
  private readonly audioPreference = ko.observable(AudioPreference.ALL);
  private muted: boolean;

  constructor(private readonly devicesHandler?: MediaDevicesHandler) {
    this.logger = getLogger('AudioRepository');
    this.audioPreference.subscribe(audioPreference => {
      if (audioPreference === AudioPreference.NONE) {
        this.stopAll();
      }
    });
    this.audioElements = {};
    this.muted = true;
    this.subscribeToEvents();
  }

  private canPlaySound(audioId: AudioType): AUDIO_PLAY_PERMISSION {
    if (this.muted && !AudioPlayingType.MUTED.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_MUTE_STATE;
    }

    const preferenceIsNone = this.audioPreference() === AudioPreference.NONE;
    if (preferenceIsNone && !AudioPlayingType.NONE.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES;
    }

    const preferenceIsSome = this.audioPreference() === AudioPreference.SOME;
    if (preferenceIsSome && !AudioPlayingType.SOME.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES;
    }

    return AUDIO_PLAY_PERMISSION.ALLOWED;
  }

  private createAudioElement(sourcePath: string): HTMLAudioElement {
    const audioElement = new Audio();
    audioElement.preload = 'auto';
    // preload element
    audioElement.load();
    audioElement.src = sourcePath;
    return audioElement;
  }

  private updateSinkIds() {
    const currentOutputDevice = this.devicesHandler?.currentDeviceId[MediaDeviceType.AUDIO_OUTPUT]();
    if (!currentOutputDevice) {
      return;
    }
    Object.values(this.audioElements).forEach(element => {
      element.setSinkId?.(currentOutputDevice).catch(error => {
        this.logger.warn(error);
      });
    });
  }

  private getSoundById(audioId: AudioType): HTMLAudioElement {
    return this.audioElements[audioId];
  }

  private initSounds(): void {
    Object.values(AudioType).forEach(audioId => {
      this.audioElements[audioId] = this.createAudioElement(`./audio/${audioId}.mp3`);
    });
  }

  private stopAll(): void {
    Object.keys(this.audioElements).forEach((audioId: AudioType) => this.stop(audioId));
  }

  private subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setMutedState);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, this.setAudioPreference);

    if ('mediaSession' in navigator) {
      const noop = () => {};
      navigator.mediaSession.setActionHandler('play', noop);
      navigator.mediaSession.setActionHandler('pause', noop);
    }
  }

  init(): void {
    this.initSounds();
    this.updateSinkIds();
  }

  loop(audioId: AudioType): Promise<void> {
    return this.play(audioId, true);
  }

  private async playAudio(audioElement: HTMLAudioElement, playInLoop: boolean = false): Promise<void> {
    if (!audioElement.paused) {
      // element already playing, nothing to do
      return;
    }

    audioElement.loop = playInLoop;

    if (audioElement.currentTime !== 0) {
      audioElement.currentTime = 0;
    }

    return audioElement.play();
  }

  async play(audioId: AudioType, playInLoop: boolean = false): Promise<void> {
    this.updateSinkIds();
    const audioElement = this.getSoundById(audioId);
    if (!audioElement) {
      this.logger.error(`Failed to play '${audioId}': sound not found`);
      return;
    }

    switch (this.canPlaySound(audioId)) {
      case AUDIO_PLAY_PERMISSION.ALLOWED:
        try {
          await this.playAudio(audioElement, playInLoop);
          this.logger.log(`Playing sound '${audioId}' (loop: '${playInLoop}')`);
        } catch (error) {
          this.logger.error(`Failed to play sound '${audioId}': ${error.message}`);
          throw error;
        }
        break;

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_MUTE_STATE:
        this.logger.debug(`Playing '${audioId}' was disallowed by mute state`);
        break;

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES:
        this.logger.debug(`Playing '${audioId}' was disallowed because of user's preferences`);
        break;
    }
  }

  readonly setAudioPreference = (audioPreference: AudioPreference): void => {
    this.audioPreference(audioPreference);
  };

  readonly setMutedState = (handlingNotifications: NOTIFICATION_HANDLING_STATE): void => {
    const updatedMutedState = handlingNotifications !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.muted !== updatedMutedState;
    if (isStateChange) {
      this.muted = updatedMutedState;
      this.logger.debug(`Set muted state to '${this.muted}'`);
    }
  };

  stop(audioId: AudioType): void {
    const audioElement = this.getSoundById(audioId);
    if (!audioElement?.paused) {
      // This log is used by QA
      this.logger.log(`Stopping sound '${audioId}'`);
      audioElement.pause();
      audioElement.load();
    }
  }

  readonly updatedProperties = (properties: WebappProperties): void => {
    this.setAudioPreference(properties.settings.sound.alerts);
  };
}
