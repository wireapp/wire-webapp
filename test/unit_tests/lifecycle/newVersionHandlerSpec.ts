/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {startNewVersionPolling, stopNewVersionPolling} from 'src/script/lifecycle/newVersionHandler';
import 'src/script/util/test/mock/fetchMock';

describe('newVersionHandler', () => {
  afterEach(stopNewVersionPolling);

  describe('startNewVersionPolling', () => {
    it('starts an interval when called', () => {
      spyOn(window, 'setInterval').and.returnValue(undefined);

      startNewVersionPolling('', () => {});

      expect(window.setInterval).toHaveBeenCalled();
    });

    it('polls the server every 3 hours', () => {
      jest.useFakeTimers();
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response()));

      startNewVersionPolling('', () => {});

      jest.advanceTimersByTime(6 * 60 * 60 * 1000);

      expect(window.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('warns the app if a new version is available', done => {
      jest.useFakeTimers();
      const testData = {
        callback: currentVersion => {},
        currentVersion: '2019-03-04',
        response: {version: '2019-03-19'},
      };

      spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(JSON.stringify(testData.response))));
      spyOn(testData, 'callback');

      startNewVersionPolling(testData.currentVersion, testData.callback);

      jest.advanceTimersByTime(4 * 60 * 60 * 1000);
      jest.useRealTimers();

      setTimeout(() => {
        expect(testData.callback).toHaveBeenCalledWith(testData.response.version);
        done();
      });
    });
  });
});
