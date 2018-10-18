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

// grunt test_init && grunt test_run:lifecycle/LifecycleService

'use strict';

describe('z.lifecycle.LifecycleService', () => {
  let mock_response = undefined;
  const test_factory = new window.TestFactory();

  beforeAll(() => {
    mock_response = (body, status_code = 200, status_text) => {
      const response = new window.Response(JSON.stringify(body), {
        headers: {
          'Content-type': 'application/json',
        },
        status: status_code,
        statusText: status_text,
      });

      return Promise.resolve(response);
    };

    return test_factory.exposeLifecycleActors();
  });

  beforeEach(() => {
    sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    window.fetch.restore();
  });

  describe('getVersion', () => {
    it('fetches the webapp release version', () => {
      const response_body = {version: '2017-03-14-15-05-prod'};
      window.fetch.returns(mock_response(response_body, 200));

      return TestFactory.lifecycle_service.getVersion().then(version => {
        expect(version).toBe(response_body.version);
      });
    });
  });
});
