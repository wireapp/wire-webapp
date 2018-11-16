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

// grunt test_run:time/ServerTimeRepository

'use strict';

describe('z.time.ServerTimeRepository', () => {
  let serverTimeRepository;
  const testFactory = new window.TestFactory();

  beforeEach(() => {
    return testFactory.exposeServerActors().then(_serverTimeRepository => {
      serverTimeRepository = _serverTimeRepository;
    });
  });

  describe('getTimeOffset', () => {
    it('warns that offset cannot be retrieved when server time is not set', () => {
      spyOn(serverTimeRepository.logger, 'warn');

      const offset = serverTimeRepository.getTimeOffset();

      expect(offset).toEqual(0);
      expect(serverTimeRepository.logger.warn).toHaveBeenCalled();
    });
  });

  describe('toServerTimestamp', () => {
    it('converts a local timestamp to a server one', () => {
      const timeOffset = 10;
      const timestamp = 100;
      spyOn(serverTimeRepository, 'getTimeOffset').and.returnValue(timeOffset);

      const adjustedTimestamp = serverTimeRepository.toServerTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp - timeOffset);
    });
  });

  describe('toLocalTimestamp', () => {
    it('converts a server timestamp to a local one', () => {
      const timeOffset = 10;
      const timestamp = 100;
      spyOn(serverTimeRepository, 'getTimeOffset').and.returnValue(timeOffset);

      const adjustedTimestamp = serverTimeRepository.toLocalTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp + timeOffset);
    });
  });

  describe('toLocalTimestamp and toServerTimestamp', () => {
    it('should return the initial timestamp if the two reverse operations are applied', () => {
      const timeOffset = 10;
      spyOn(serverTimeRepository, 'getTimeOffset').and.returnValue(timeOffset);

      const localTime = Date.now();

      const computedServerTime = serverTimeRepository.toServerTimestamp(localTime);
      const computedLocalTime = serverTimeRepository.toLocalTimestamp(computedServerTime);

      expect(computedLocalTime).toEqual(localTime);
    });
  });
});
