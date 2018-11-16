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

// grunt test_run:calling/CallingRepository

describe('z.calling.CallingRepository', () => {
  const testFactory = new TestFactory();
  let callingRepository;

  beforeEach(() => {
    return testFactory
      .exposeCallingActors()
      .then(injectedCallingRepository => (callingRepository = injectedCallingRepository));
  });

  describe('toggleMedia', () => {
    it('does nothing if the conversation is not found', () => {
      spyOn(callingRepository, 'getCallById').and.returnValue(Promise.reject(z.error.CallError.TYPE.NOT_FOUND));
      spyOn(callingRepository, '_toggleMediaState');
      return callingRepository.toggleMedia('notfoundid', 'audio').then(() => {
        expect(callingRepository._toggleMediaState).not.toHaveBeenCalled();
      });
    });

    it('does nothing if media type is not recognized', () => {
      const callEntityMock = {
        toggleMedia: () => Promise.resolve(),
      };

      spyOn(callingRepository, 'getCallById').and.returnValue(Promise.resolve(callEntityMock));
      spyOn(callEntityMock, 'toggleMedia');

      return callingRepository.toggleMedia('validid', 'unrecognized').then(() => {
        expect(callEntityMock.toggleMedia).not.toHaveBeenCalled();
      });
    });

    it('toggles media if conversation is found', () => {
      const callEntityMock = {
        toggleMedia: () => Promise.resolve(),
      };
      const tests = [
        {mediaType: z.media.MediaType.AUDIO, methodCalled: 'toggleAudioSend'},
        {mediaType: z.media.MediaType.VIDEO, methodCalled: 'toggleVideoSend'},
        {mediaType: z.media.MediaType.SCREEN, methodCalled: 'toggleScreenSend'},
      ];

      spyOn(callingRepository, 'getCallById').and.returnValue(Promise.resolve(callEntityMock));

      const testPromises = tests.map(({mediaType, methodCalled}) => {
        spyOn(callingRepository.mediaStreamHandler, methodCalled).and.returnValue(Promise.resolve());
        return callingRepository.toggleMedia('validid', mediaType).then(() => {
          expect(callingRepository.mediaStreamHandler[methodCalled]).toHaveBeenCalledWith();
        });
      });

      return Promise.all(testPromises);
    });
  });
});
