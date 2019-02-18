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

import resolveDependency from '../../api/testResolver';
import AudioRepository from 'src/script/audio/AudioRepository';

describe('AudioRepository', () => {
  const audioRepository = resolveDependency(AudioRepository);
  audioRepository.init(true);

  describe('_checkSoundSetting', () => {
    beforeAll(() => audioRepository.audioPreference(z.audio.AudioPreference.SOME));

    it('plays a sound that should be played', () => {
      return audioRepository._checkSoundSetting(z.audio.AudioType.NETWORK_INTERRUPTION);
    });

    it('ignores a sound that should not be played', done => {
      audioRepository
        ._checkSoundSetting(z.audio.AudioType.ALERT)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.IGNORED_SOUND);
          done();
        });
    });
  });

  describe('_getSoundById', () => {
    it('finds an available sound', () => {
      return audioRepository._getSoundById(z.audio.AudioType.NETWORK_INTERRUPTION).then(audio_element => {
        expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
      });
    });

    it('handles a missing sound', done => {
      audioRepository
        ._getSoundById('foo')
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
          done();
        });
    });
  });

  describe('_play', () => {
    beforeEach(() => {
      const audioElement = new Audio(`/audio/${z.audio.AudioType.OUTGOING_CALL}.mp3`);

      audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL] = audioElement;
      spyOn(audioElement, 'play').and.returnValue(Promise.resolve());
    });

    it('plays an available sound', () => {
      return audioRepository
        ._play(z.audio.AudioType.OUTGOING_CALL, audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL], false)
        .then(audio_element => {
          expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
          expect(audio_element.loop).toBeFalsy();
          expect(audio_element.play).toHaveBeenCalled();
        });
    });

    it('plays an available sound in loop', () => {
      audioRepository
        ._play(z.audio.AudioType.OUTGOING_CALL, audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL], true)
        .then(audio_element => {
          expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
          expect(audio_element.loop).toBeTruthy();
        });
    });

    it('does not play a sound twice concurrently', () => {
      const audioElement = audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL];
      spyOnProperty(audioElement, 'paused', 'get').and.returnValue(false);
      return audioRepository
        ._play(z.audio.AudioType.OUTGOING_CALL, audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL])
        .then(() => fail('should throw an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.ALREADY_PLAYING);
        });
    });

    it('handles a missing audio id sound', () => {
      return audioRepository
        ._play(undefined, audioRepository.audioElements[z.audio.AudioType.OUTGOING_CALL])
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.AudioError));
          expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
        });
    });

    it('handles a missing audio element', () => {
      return audioRepository._play(z.audio.AudioType.OUTGOING_CALL, undefined).catch(error => {
        expect(error).toEqual(jasmine.any(z.error.AudioError));
        expect(error.type).toBe(z.error.AudioError.TYPE.NOT_FOUND);
      });
    });
  });
});
