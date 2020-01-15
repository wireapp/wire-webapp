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

import {WebappProperties} from '@wireapp/api-client/dist/user/data';
import {amplify} from 'amplify';
import ko from 'knockout';
import {Logger, getLogger} from 'Util/Logger';

import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {WebAppEvents} from '../event/WebApp';
import {AudioPlayingType} from './AudioPlayingType';
import {AudioPreference} from './AudioPreference';
import {AudioType} from './AudioType';

enum AUDIO_PLAY_PERMISSION {
  ALLOWED = 0,
  DISALLOWED_BY_MUTE_STATE = 3,
  DISALLOWED_BY_PREFERENCES = 2,
}

export class AudioRepository {
  private readonly logger: Logger;
  private readonly audioElements: Record<string, HTMLAudioElement>;
  private readonly audioPreference: ko.Observable<AudioPreference>;
  private muted: boolean;

  constructor() {
    this.logger = getLogger('AudioRepository');
    this.audioElements = {};
    this.audioPreference = ko.observable(AudioPreference.ALL);
    this.audioPreference.subscribe(audioPreference => {
      if (audioPreference === AudioPreference.NONE) {
        this.stopAll();
      }
    });
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

  private createAudioElement(sourcePath: string, preload: boolean): HTMLAudioElement {
    const audioElement = new Audio();
    audioElement.preload = preload ? 'auto' : 'none';
    if (preload) {
      audioElement.load();
    }
    audioElement.src = sourcePath;
    return audioElement;
  }

  private getSoundById(audioId: AudioType): HTMLAudioElement {
    return this.audioElements[audioId];
  }

  private initSounds(preload: boolean): void {
    Object.values(AudioType).forEach(audioId => {
      this.audioElements[audioId] = this.createAudioElement(`/audio/${audioId}.mp3`, preload);
    });

    this.logger.info(`Sounds initialized (preload: '${preload}')`);
  }

  private stopAll(): void {
    Object.keys(this.audioElements).forEach((audioId: AudioType) => this.stop(audioId));
  }

  private subscribeToAudioEvents(): void {
    amplify.subscribe(WebAppEvents.AUDIO.PLAY, this.play.bind(this));
    amplify.subscribe(WebAppEvents.AUDIO.STOP, this.stop.bind(this));
  }

  private subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setMutedState.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, this.setAudioPreference.bind(this));
  }

  init(preload: boolean = false): void {
    this.initSounds(preload);
    this.subscribeToAudioEvents();
  }

  loop(audioId: AudioType): Promise<void> {
    return this.play(audioId, true);
  }

  private playAudio(audioElement: HTMLAudioElement, playInLoop: boolean = false): Promise<void> {
    if (!audioElement.paused) {
      // element already playing, nothing to do
      return Promise.resolve();
    }

    audioElement.loop = playInLoop;

    if (audioElement.currentTime !== 0) {
      audioElement.currentTime = 0;
    }

    const playPromise = audioElement.play();

    return playPromise || Promise.resolve();
  }

  play(audioId: AudioType, playInLoop: boolean = false): Promise<void> {
    const audioElement = this.getSoundById(audioId);
    if (!audioElement) {
      this.logger.error(`Failed to play '${audioId}': sound not found`);
      return Promise.resolve();
    }

    switch (this.canPlaySound(audioId)) {
      case AUDIO_PLAY_PERMISSION.ALLOWED:
        return this.playAudio(audioElement, playInLoop)
          .then(() => {
            this.logger.info(`Playing sound '${audioId}' (loop: '${playInLoop}')`);
          })
          .catch(error => {
            if (error) {
              this.logger.error(`Failed to play sound '${audioId}': ${error.message}`);
              throw error;
            }
          });

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_MUTE_STATE:
        this.logger.debug(`Playing '${audioId}' was disallowed by mute state`);
        break;

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES:
        this.logger.debug(`Playing '${audioId}' was disallowed because of user's preferences`);
        break;
    }
    return Promise.resolve();
  }

  setAudioPreference(audioPreference: AudioPreference): void {
    this.audioPreference(audioPreference);
  }

  setMutedState(handlingNotifications: NOTIFICATION_HANDLING_STATE): void {
    const updatedMutedState = handlingNotifications !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.muted !== updatedMutedState;
    if (isStateChange) {
      this.muted = updatedMutedState;
      this.logger.debug(`Set muted state to '${this.muted}'`);
    }
  }

  stop(audioId: AudioType): void {
    const audioElement = this.getSoundById(audioId);
    if (!audioElement?.paused) {
      this.logger.info(`Stopping sound '${audioId}'`);
      audioElement.pause();
    }
  }

  updatedProperties(properties: WebappProperties): void {
    this.setAudioPreference(properties.settings.sound.alerts);
  }
}
