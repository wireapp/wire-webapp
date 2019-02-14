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

import {resolve, graph} from '../../api/testResolver';

describe('MediaStreamHandler', () => {
  let streamHandler;

  beforeEach(() => {
    streamHandler = resolve(graph.MediaRepository).streamHandler;
  });

  describe('addRemoteMediaStream', () => {
    it('throws an error if stream type is not recognized', () => {
      const newMediaStream = {getType: () => 'random'};

      try {
        streamHandler.addRemoteMediaStream(newMediaStream);
      } catch (error) {
        expect(error instanceof z.error.MediaError).toBe(true);
        expect(error.type).toEqual(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    });

    it('should add the stream if type is recognized', () => {
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
    beforeEach(() => {
      spyOn(streamHandler, '_toggleAudioSend').and.returnValue(Promise.resolve());
    });

    it('toggles the audio state if MediaStream is available', () => {
      streamHandler.localMediaStream(true);

      return streamHandler.toggleAudioSend().then(() => {
        expect(streamHandler._toggleAudioSend).toHaveBeenCalled();
      });
    });

    it('toggles the audio state if MediaStream is unavailable', () => {
      streamHandler.localMediaStream(undefined);

      return streamHandler.toggleAudioSend().then(() => {
        expect(streamHandler._toggleAudioSend).toHaveBeenCalled();
      });
    });
  });

  describe('toggleVideoSend', () => {
    beforeEach(() => {
      spyOn(streamHandler, '_toggleVideoSend').and.returnValue(Promise.resolve());
      spyOn(streamHandler, 'replaceInputSource').and.returnValue(Promise.resolve());
    });

    it('toggles the video stream if available and in video mode', () => {
      streamHandler.localMediaStream(true);
      streamHandler.localMediaType(z.media.MediaType.VIDEO);

      return streamHandler.toggleVideoSend().then(() => {
        expect(streamHandler._toggleVideoSend).toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).not.toHaveBeenCalled();
      });
    });

    it('turns on the video stream if it does not exist', () => {
      streamHandler.localMediaStream(undefined);
      streamHandler.localMediaType(z.media.MediaType.VIDEO);

      return streamHandler.toggleVideoSend().then(() => {
        expect(streamHandler._toggleVideoSend).not.toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.VIDEO);
      });
    });

    it('turns on the video stream if not in video mode', () => {
      streamHandler.localMediaStream(true);
      streamHandler.localMediaType(z.media.MediaType.SCREEN);

      return streamHandler.toggleVideoSend().then(() => {
        expect(streamHandler._toggleVideoSend).not.toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.VIDEO);
      });
    });
  });

  describe('toggleScreenSend', () => {
    beforeEach(() => {
      spyOn(streamHandler, '_toggleScreenSend').and.returnValue(Promise.resolve());
      spyOn(streamHandler, 'replaceInputSource').and.returnValue(Promise.resolve());
    });

    it('toggles screen sharing if available and in screen sharing mode', () => {
      streamHandler.localMediaStream(true);
      streamHandler.localMediaType(z.media.MediaType.SCREEN);

      return streamHandler.toggleScreenSend().then(() => {
        expect(streamHandler._toggleScreenSend).toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).not.toHaveBeenCalled();
      });
    });

    it('turns on the screen sharing stream if it does not exist', () => {
      streamHandler.localMediaStream(undefined);
      streamHandler.localMediaType(z.media.MediaType.SCREEN);

      return streamHandler.toggleScreenSend().then(() => {
        expect(streamHandler._toggleScreenSend).not.toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.SCREEN);
      });
    });

    it('turns on the video stream if not in screen sharing mode', () => {
      streamHandler.localMediaStream(true);
      streamHandler.localMediaType(z.media.MediaType.VIDEO);

      return streamHandler.toggleScreenSend().then(() => {
        expect(streamHandler._toggleScreenSend).not.toHaveBeenCalled();
        expect(streamHandler.replaceInputSource).toHaveBeenCalledWith(z.media.MediaType.SCREEN);
      });
    });
  });
});
