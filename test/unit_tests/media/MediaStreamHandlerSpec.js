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

  describe('addRemoteMediaStream', () => {
    it('throws an error if stream type is not recognized', () => {
      const streamHandler = TestFactory.media_repository.stream_handler;

      const newMediaStream = {type: 'random'};

      try {
        streamHandler.addRemoteMediaStream(newMediaStream);
      } catch (error) {
        expect(error instanceof z.media.MediaError).toBe(true);
        expect(error.type).toEqual(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    });

    it('should add the stream if type is recognized', () => {
      const streamHandler = TestFactory.media_repository.stream_handler;

      const recognizedStreams = [
        {type: z.media.MediaType.AUDIO},
        {type: z.media.MediaType.VIDEO},
        {type: z.media.MediaType.AUDIO_VIDEO},
      ];

      const expectedStreams = [
        [recognizedStreams[0]],
        [recognizedStreams[0], recognizedStreams[1]],
        [recognizedStreams[0], recognizedStreams[1], recognizedStreams[2]],
      ];

      const subscription = streamHandler.remoteMediaStreamInfo.subscribe(streams => {
        expect(streams).toEqual(expectedStreams.shift());
      });

      recognizedStreams.forEach(stream => streamHandler.addRemoteMediaStream(stream));
      subscription.dispose();
      streamHandler.remoteMediaStreamInfo([]);
    });
  });

  describe('remoteMediaStreamInfoIndex', () => {
    it('returns the media streams indexed by type', () => {
      const streamHandler = TestFactory.media_repository.stream_handler;

      const audioStream = {type: z.media.MediaType.AUDIO};
      const videoStream = {type: z.media.MediaType.VIDEO};
      const audioVideoStream = {type: z.media.MediaType.AUDIO_VIDEO};

      const expectedAudioStreams = [[audioStream], [audioStream], [audioStream]];

      const expectedVideoStreams = [[], [videoStream], [videoStream, audioVideoStream]];

      const {audio: audioObservable, video: videoObservable} = streamHandler.remoteMediaStreamInfoIndex;
      const subscriptions = [
        audioObservable.subscribe(audioStreams => {
          expect(audioStreams).toEqual(expectedAudioStreams.shift());
        }),

        videoObservable.subscribe(videoStreams => {
          expect(videoStreams).toEqual(expectedVideoStreams.shift());
        }),
      ];

      [audioStream, videoStream, audioVideoStream].forEach(stream => {
        streamHandler.addRemoteMediaStream(stream);
      });

      subscriptions.forEach(subscription => subscription.dispose());
    });
  });

  describe('toggleAudioSend', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggleAudioSend').and.returnValue(Promise.resolve());
    });

    it('toggles the audio stream if available', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);

      TestFactory.media_repository.stream_handler
        .toggleAudioSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleAudioSend).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('throws an error if no audio stream is found', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);

      TestFactory.media_repository.stream_handler
        .toggleAudioSend()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.media.MediaError));
          expect(error.type).toBe(z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND);
          done();
        });
    });
  });

  describe('toggleVideoSend', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggle_video_send').and.returnValue(Promise.resolve());
      return spyOn(TestFactory.media_repository.stream_handler, 'replaceInputSource').and.returnValue(
        Promise.resolve()
      );
    });

    it('toggles the video stream if available and in video mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggleVideoSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleVideoSend).toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if it does not exist', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggleVideoSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleVideoSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).toHaveBeenCalledWith(
            z.media.MediaType.VIDEO
          );
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if not in video mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggleVideoSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleVideoSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).toHaveBeenCalledWith(
            z.media.MediaType.VIDEO
          );
          done();
        })
        .catch(done.fail);
    });
  });

  describe('toggleScreenSend', () => {
    beforeEach(() => {
      spyOn(TestFactory.media_repository.stream_handler, '_toggleScreenSend').and.returnValue(Promise.resolve());
      spyOn(TestFactory.media_repository.stream_handler, 'replaceInputSource').and.returnValue(Promise.resolve());
    });

    it('toggles screen sharing if available and in screen sharing mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggleScreenSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('turns on the screen sharing stream if it does not exist', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(undefined);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.SCREEN);

      TestFactory.media_repository.stream_handler
        .toggleScreenSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).toHaveBeenCalledWith(
            z.media.MediaType.SCREEN
          );
          done();
        })
        .catch(done.fail);
    });

    it('turns on the video stream if not in screen sharing mode', done => {
      TestFactory.media_repository.stream_handler.localMediaStream(true);
      TestFactory.media_repository.stream_handler.localMediaType(z.media.MediaType.VIDEO);

      TestFactory.media_repository.stream_handler
        .toggleScreenSend()
        .then(() => {
          expect(TestFactory.media_repository.stream_handler._toggleScreenSend).not.toHaveBeenCalled();
          expect(TestFactory.media_repository.stream_handler.replaceInputSource).toHaveBeenCalledWith(
            z.media.MediaType.SCREEN
          );
          done();
        })
        .catch(done.fail);
    });
  });
});
