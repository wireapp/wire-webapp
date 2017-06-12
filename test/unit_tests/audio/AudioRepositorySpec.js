/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:audio/AudioRepository

'use strict';

describe('z.audio.AudioRepository', function() {
  const test_factory = new TestFactory();

  beforeAll(done => {
    test_factory
      .exposeAudioActors()
      .then(function() {
        TestFactory.audio_repository.init(true);
        done();
      })
      .catch(done.fail);
  });

  describe('_check_sound_setting', function() {
    beforeAll(function() {
      TestFactory.audio_repository.audio_preference(z.audio.AudioPreference.SOME);
    });

    it('plays a sound that should be played', function(done) {
      TestFactory.audio_repository
        ._check_sound_setting(z.audio.AudioType.NETWORK_INTERRUPTION)
        .then(done)
        .catch(done.fail);
    });

    it('ignores a sound that should not be played', function(done) {
      TestFactory.audio_repository._check_sound_setting(z.audio.AudioType.ALERT).then(done.fail).catch(function(error) {
        expect(error).toEqual(jasmine.any(z.audio.AudioError));
        expect(error.type).toBe(z.audio.AudioError.TYPE.IGNORED_SOUND);
        done();
      });
    });
  });

  describe('_get_sound_by_id', function() {
    it('finds an available sound', function(done) {
      TestFactory.audio_repository
        ._get_sound_by_id(z.audio.AudioType.NETWORK_INTERRUPTION)
        .then(function(audio_element) {
          expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
          done();
        })
        .catch(done.fail);
    });

    it('handles a missing sound', function(done) {
      TestFactory.audio_repository._get_sound_by_id('foo').then(done.fail).catch(function(error) {
        expect(error).toEqual(jasmine.any(z.audio.AudioError));
        expect(error.type).toBe(z.audio.AudioError.TYPE.NOT_FOUND);
        done();
      });
    });
  });

  xdescribe('_play', function() {
    beforeEach(function() {
      TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL] = new Audio(
        `/audio/${z.audio.AudioType.OUTGOING_CALL}.mp3`
      );
    });

    afterEach(function() {
      TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL].pause();
    });

    it('plays an available sound', function(done) {
      TestFactory.audio_repository
        ._play(
          z.audio.AudioType.OUTGOING_CALL,
          TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL],
          false
        )
        .then(function(audio_element) {
          expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
          expect(audio_element.loop).toBeFalsy();
          done();
        })
        .catch(done.fail);
    });

    it('plays an available sound in loop', function(done) {
      TestFactory.audio_repository
        ._play(
          z.audio.AudioType.OUTGOING_CALL,
          TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL],
          true
        )
        .then(function(audio_element) {
          expect(audio_element).toEqual(jasmine.any(HTMLAudioElement));
          expect(audio_element.loop).toBeTruthy();
          done();
        })
        .catch(done.fail);
    });

    it('does not play a sound twice concurrently', function(done) {
      TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL]
        .play()
        .then(function() {
          TestFactory.audio_repository._play(
            z.audio.AudioType.OUTGOING_CALL,
            TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL]
          );
        })
        .then(done.fail)
        .catch(function(error) {
          expect(error).toEqual(jasmine.any(z.audio.AudioError));
          expect(error.type).toBe(z.audio.AudioError.TYPE.ALREADY_PLAYING);
          done();
        })
        .catch(done.fail);
    });

    it('handles a missing audio id sound', function(done) {
      TestFactory.audio_repository
        ._play(undefined, TestFactory.audio_repository.audio_elements[z.audio.AudioType.OUTGOING_CALL])
        .catch(function(error) {
          expect(error).toEqual(jasmine.any(z.audio.AudioError));
          expect(error.type).toBe(z.audio.AudioError.TYPE.NOT_FOUND);
          done();
        })
        .catch(done.fail);
    });

    it('handles a missing audio element', function(done) {
      TestFactory.audio_repository
        ._play(z.audio.AudioType.OUTGOING_CALL, undefined)
        .catch(function(error) {
          expect(error).toEqual(jasmine.any(z.audio.AudioError));
          expect(error.type).toBe(z.audio.AudioError.TYPE.NOT_FOUND);
          done();
        })
        .catch(done.fail);
    });
  });
});
