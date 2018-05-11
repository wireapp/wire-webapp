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

'use strict';

// grunt test_init && grunt test_run:calling/handler/MediaStreamHandler

window.wire = window.wire || {};
window.wire.auth = wire.auth || {};
window.wire.auth.audio = wire.auth.audio || {};

describe('z.media.MediaStreamHandler', () => {
  const test_factory = new TestFactory();

  beforeAll(done => {
    test_factory
      .exposeMediaActors()
      .then(done)
      .catch(done.fail);
  });

  describe('toggle_audio_send', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggleAudioSend').and.returnValue(Promise.resolve());
    });

    it('toggles the audio stream if available', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);

      TestFactory.media_repository.stream_handler
        .toggle_audio_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleAudioSend).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('throws an error if no audio stream is found', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);

      TestFactory.media_repository.stream_handler
        .toggle_audio_send()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.media.MediaError));
          expect(error.type).toBe(z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND);
          done();
        });
    });
  });

  describe('toggle_video_send', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggle_video_send').and.returnValue(Promise.resolve());
      return spyOn(TestFactory.media_repository.stream_handler, 'replace_input_source').and.returnValue(
        Promise.resolve()
      );
    });

    it('toggles the video stream if available and in video mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggle_video_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggle_video_send).toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if it does not exist', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggle_video_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggle_video_send).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith(
            z.media.MediaType.VIDEO
          );
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if not in video mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggle_video_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggle_video_send).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith(
            z.media.MediaType.VIDEO
          );
          done();
        })
        .catch(done.fail);
    });
  });

  describe('toggle_screen_send', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggleScreenSend').and.returnValue(Promise.resolve());
      spyOn(TestFactory.media_repository.stream_handler, 'replace_input_source').and.returnValue(Promise.resolve());
    });

    it('toggles screen sharing if available and in screen sharing mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggle_screen_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('turns on the screen sharing stream if it does not exist', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggle_screen_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith(
            z.media.MediaType.SCREEN
          );
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if not in screen sharing mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.local_media_type(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggle_screen_send()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith(
            z.media.MediaType.SCREEN
          );
          done();
        })
        .catch(done.fail);
    });
  });
});
