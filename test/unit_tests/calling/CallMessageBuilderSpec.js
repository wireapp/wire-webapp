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

describe('z.calling.CallMessageBuilder', () => {
  const callMessageBuilder = z.calling.CallMessageBuilder;

  describe('createPropSync', () => {
    it('generates prop sync message with the raw stream properties', () => {
      const tests = [
        {
          expected: {audiosend: 'true', screensend: 'false', videosend: 'true'},
          props: {audioSend: () => true, screenSend: () => false, videoSend: () => true},
        },
        {
          expected: {audiosend: 'false', screensend: 'false', videosend: 'false'},
          props: {audioSend: () => false, screenSend: () => false, videoSend: () => false},
        },
        {
          expected: {audiosend: 'true', screensend: 'true', videosend: 'false'},
          props: {audioSend: () => true, screenSend: () => true, videoSend: () => false},
        },
      ];

      tests.forEach(({props, expected}) => {
        const propSyncMessage = callMessageBuilder.createPropSync(props);

        expect(propSyncMessage.properties).toEqual(expected);
      });
    });

    it('adds extra paypload properties', () => {
      const state = {audioSend: () => true, screenSend: () => false, videoSend: () => true};
      const extraPayload = {extra: 'hey'};

      const propSyncMessage = callMessageBuilder.createPropSync(state, extraPayload);

      expect(propSyncMessage).toEqual(jasmine.objectContaining(extraPayload));
    });

    it('forces video state if given', () => {
      const noVideoState = {audioSend: () => true, screenSend: () => false, videoSend: () => false};

      const propSyncMessageWithVideo = callMessageBuilder.createPropSync(noVideoState, {}, true);

      expect(propSyncMessageWithVideo.properties.videosend).toEqual('true');

      const videoState = {audioSend: () => true, screenSend: () => false, videoSend: () => true};
      const propSyncMessageWithoutVideo = callMessageBuilder.createPropSync(videoState, {}, false);

      expect(propSyncMessageWithoutVideo.properties.videosend).toEqual('false');
    });
  });
});
