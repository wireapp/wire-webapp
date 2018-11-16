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

// grunt test_run:calling/handler/MediaStreamHandler

window.wire = window.wire || {};
window.wire.auth = wire.auth || {};
window.wire.auth.audio = wire.auth.audio || {};

describe('z.media.MediaStreamHandler', () => {
  const test_factory = new TestFactory();

  beforeAll(() => test_factory.exposeMediaActors());

  describe('addRemoteMediaStream', () => {
    it('throws an error if stream type is not recognized', () => {
      const streamHandler = TestFactory.media_repository.streamHandler;

      const newMediaStream = {getType: () => 'random'};

      try {
        streamHandler.addRemoteMediaStream(newMediaStream);
      } catch (error) {
        expect(error instanceof z.error.MediaError).toBe(true);
        expect(error.type).toEqual(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    });

    it('should add the stream if type is recognized', () => {
      const streamHandler = TestFactory.media_repository.streamHandler;

      const recognizedStreams = [
        {getType: () => z.media.MediaType.AUDIO},
        {getType: () => z.media.MediaType.VIDEO},
        {getType: () => z.media.MediaType.AUDIO_VIDEO},
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
      const streamHandler = TestFactory.media_repository.streamHandler;

      const audioStream = {getType: () => z.media.MediaType.AUDIO};
      const videoStream = {getType: () => z.media.MediaType.VIDEO};
      const audioVideoStream = {getType: () => z.media.MediaType.AUDIO_VIDEO};

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
    let mediaStreamHandler;

    beforeEach(() => {
      mediaStreamHandler = TestFactory.media_repository.streamHandler;
      spyOn(mediaStreamHandler, '_toggleAudioSend').and.returnValue(Promise.resolve());
    });

    it('toggles the audio state if MediaStream is available', () => {
      mediaStreamHandler.localMediaStream(true);

      return mediaStreamHandler.toggleAudioSend().then(() => {
        expect(mediaStreamHandler._toggleAudioSend).toHaveBeenCalled();
      });
    });

    it('toggles the audio state if MediaStream is unavailable', () => {
      mediaStreamHandler.localMediaStream(undefined);

      return mediaStreamHandler.toggleAudioSend().then(() => {
        expect(mediaStreamHandler._toggleAudioSend).toHaveBeenCalled();
      });
    });
  });

  describe('toggleVideoSend', () => {
    let mediaStreamHandler;

    beforeEach(() => {
      mediaStreamHandler = TestFactory.media_repository.streamHandler;
      spyOn(mediaStreamHandler, '_toggleVideoSend').and.returnValue(Promise.resolve());
      spyOn(mediaStreamHandler, 'replaceInputSource').and.returnValue(Promise.resolve());
    });

    it('toggles the video stream if available and in video mode', () => {
      mediaStreamHandler.localMediaStream(true);
      mediaStreamHandler.localMediaType(z.media.MediaType.VIDEO);

      return mediaStreamHandler.toggleVideoSend().then(() => {
        expect(mediaStreamHandler._toggleVideoSend).toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).not.toHaveBeenCalled();
      });
    });

    it('turns on the video stream if it does not exist', () => {
      mediaStreamHandler.localMediaStream(undefined);
      mediaStreamHandler.localMediaType(z.media.MediaType.VIDEO);

      return TestFactory.media_repository.streamHandler.toggleVideoSend().then(() => {
        expect(mediaStreamHandler._toggleVideoSend).not.toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.VIDEO);
      });
    });

    it('turns on the video stream if not in video mode', () => {
      mediaStreamHandler.localMediaStream(true);
      mediaStreamHandler.localMediaType(z.media.MediaType.SCREEN);

      return mediaStreamHandler.toggleVideoSend().then(() => {
        expect(mediaStreamHandler._toggleVideoSend).not.toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.VIDEO);
      });
    });
  });

  describe('toggleScreenSend', () => {
    let mediaStreamHandler;

    beforeEach(() => {
      mediaStreamHandler = TestFactory.media_repository.streamHandler;
      spyOn(mediaStreamHandler, '_toggleScreenSend').and.returnValue(Promise.resolve());
      spyOn(mediaStreamHandler, 'replaceInputSource').and.returnValue(Promise.resolve());
    });

    it('toggles screen sharing if available and in screen sharing mode', () => {
      mediaStreamHandler.localMediaStream(true);
      mediaStreamHandler.localMediaType(z.media.MediaType.SCREEN);

      return mediaStreamHandler.toggleScreenSend().then(() => {
        expect(mediaStreamHandler._toggleScreenSend).toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).not.toHaveBeenCalled();
      });
    });

    it('turns on the screen sharing stream if it does not exist', () => {
      mediaStreamHandler.localMediaStream(undefined);
      mediaStreamHandler.localMediaType(z.media.MediaType.SCREEN);

      return mediaStreamHandler.toggleScreenSend().then(() => {
        expect(mediaStreamHandler._toggleScreenSend).not.toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.SCREEN);
      });
    });

    it('turns on the video stream if not in screen sharing mode', () => {
      mediaStreamHandler.localMediaStream(true);
      mediaStreamHandler.localMediaType(z.media.MediaType.VIDEO);

      return mediaStreamHandler.toggleScreenSend().then(() => {
        expect(mediaStreamHandler._toggleScreenSend).not.toHaveBeenCalled();
        expect(mediaStreamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.SCREEN);
      });
    });
  });
});
