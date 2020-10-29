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

import {AudioPreference} from '@wireapp/api-client/src/user/data';
import {difference} from 'underscore';

import {AudioPlayingType} from 'src/script/audio/AudioPlayingType';
import {AudioType} from 'src/script/audio/AudioType';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {AudioRepository} from 'src/script/audio/AudioRepository';

describe('AudioRepository', () => {
  const audioRepository = new AudioRepository();

  describe('init', () => {
    it('inits all the sounds without preload', () => {
      spyOn(window, 'Audio').and.callFake(function () {
        this.load = () => {};
        spyOn(this, 'load');
      });
      audioRepository.init();

      expect(window.Audio).toHaveBeenCalledTimes(Object.keys(AudioType).length);
      Object.values(audioRepository.audioElements).forEach(audioElement => {
        expect(audioElement.load).not.toHaveBeenCalled();
      });
    });

    it('inits all the sounds with preload', () => {
      spyOn(window, 'Audio').and.callFake(function () {
        this.load = () => {};
        spyOn(this, 'load');
      });
      audioRepository.init(true);

      expect(window.Audio).toHaveBeenCalledTimes(Object.keys(AudioType).length);

      Object.values(audioRepository.audioElements).forEach(audioElement => {
        expect(audioElement.load).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('play', () => {
    beforeEach(() => {
      spyOn(window, 'Audio').and.callFake(function () {
        this.load = () => {};
        this.play = () => {};
        this.paused = true;
        spyOn(this, 'play');
      });
      audioRepository.init();
      audioRepository.setMutedState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
    });

    it('only plays muted allowed sounds when in muted state', () => {
      audioRepository.setAudioPreference(AudioPreference.NONE);
      audioRepository.setMutedState('whatever');
      const forcedSounds = AudioPlayingType.MUTED;

      const forcedPromises = forcedSounds.map(audioId => {
        return audioRepository.play(audioId).then(() => {
          expect(audioRepository.audioElements[audioId].play).toHaveBeenCalledTimes(1);
        });
      });

      const ignoredSounds = difference(Object.values(AudioType), AudioPlayingType.MUTED);

      const ignoredPromises = ignoredSounds.map(audioId => {
        return audioRepository.play(audioId).then(() => {
          expect(audioRepository.audioElements[audioId].play).not.toHaveBeenCalledTimes(1);
        });
      });

      return Promise.all(forcedPromises.concat(ignoredPromises));
    });

    it("only plays sounds allowed by user's preference (SOME)", () => {
      audioRepository.setAudioPreference(AudioPreference.SOME);
      const allowedSounds = AudioPlayingType.SOME;

      const allowedPromises = allowedSounds.map(audioId => {
        return audioRepository.play(audioId).then(() => {
          expect(audioRepository.audioElements[audioId].play).toHaveBeenCalledTimes(1);
        });
      });

      const ignoredSounds = difference(Object.values(AudioType), AudioPlayingType.SOME);

      const ignoredPromises = ignoredSounds.map(audioId => {
        return audioRepository.play(audioId).then(() => {
          expect(audioRepository.audioElements[audioId].play).not.toHaveBeenCalledTimes(1);
        });
      });

      return Promise.all(allowedPromises.concat(ignoredPromises));
    });

    it("ignores sounds that are not allowed by user's preferences", () => {
      audioRepository.setAudioPreference(AudioPreference.NONE);
      const sounds = difference(AudioPlayingType.SOME, AudioPlayingType.NONE);

      const testPromises = sounds.map(audioId => {
        return audioRepository.play(audioId).then(() => {
          expect(audioRepository.audioElements[audioId].play).not.toHaveBeenCalled();
        });
      });

      return Promise.all(testPromises);
    });
  });
});
