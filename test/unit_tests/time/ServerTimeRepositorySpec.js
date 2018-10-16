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

// grunt test_init && grunt test_run:time/ServerTimeRepository

'use strict';

describe('z.time.ServerTimeRepository', () => {
  let serverTimeRepository;
  const testFactory = new window.TestFactory();

  beforeEach(() => {
    return testFactory.exposeServerActors().then(_serverTimeRepository => {
      serverTimeRepository = _serverTimeRepository;
    });
  });

  describe('toServerTimestamp', () => {
    it('warns that adjustments cannot be done when server time is not set', () => {
      spyOn(serverTimeRepository.logger, 'warn');
      const timestamp = 10;

      const adjustedTimestamp = serverTimeRepository.toServerTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp);
      expect(serverTimeRepository.logger.warn).toHaveBeenCalled();
    });

    it('converts a local timestamp to a server timestamp', () => {
      const serverTime = new Date();
      const timeOffset = 10;
      serverTime.setMilliseconds(serverTime.getMilliseconds() - timeOffset);
      serverTimeRepository.computeTimeOffset(serverTime.toISOString());
      const timestamp = 10;

      const adjustedTimestamp = serverTimeRepository.toServerTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp - timeOffset);
    });
  });

  describe('toLocalTimestamp', () => {
    it('warns that adjustments cannot be done when server time is not set', () => {
      spyOn(serverTimeRepository.logger, 'warn');
      const timestamp = 10;

      const adjustedTimestamp = serverTimeRepository.toLocalTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp);
      expect(serverTimeRepository.logger.warn).toHaveBeenCalled();
    });

    it('converts a server timestamp to a local timestamp', () => {
      const serverTime = new Date();
      const timeOffset = 10;
      serverTime.setMilliseconds(serverTime.getMilliseconds() - timeOffset);
      serverTimeRepository.computeTimeOffset(serverTime.toISOString());
      const timestamp = 10;

      const adjustedTimestamp = serverTimeRepository.toLocalTimestamp(timestamp);

      expect(adjustedTimestamp).toEqual(timestamp + timeOffset);
    });
  });

  describe('toLocalTimestamp and toServerTimestamp', () => {
    it('should return the initial timestamp if the two reverse operations are applied', () => {
      const localTime = Date.now();
      const serverTime = new Date();
      const timeOffset = 10;
      serverTime.setMilliseconds(serverTime.getMilliseconds() - timeOffset);
      serverTimeRepository.computeTimeOffset(serverTime.toISOString());

      const computedServerTime = serverTimeRepository.toServerTimestamp(localTime);
      const computedLocalTime = serverTimeRepository.toLocalTimestamp(computedServerTime);

      expect(computedLocalTime).toEqual(localTime);
    });
  });
});
