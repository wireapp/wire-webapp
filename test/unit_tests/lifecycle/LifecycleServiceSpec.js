/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

  beforeAll((done) => {
    test_factory.exposeLifecycleActors()
      .then(done)
      .catch(done.fail);

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

    beforeEach(() => {
      sinon.stub(window, 'fetch');
    });

    afterEach(() => {
      window.fetch.restore();
    });

  });

  describe('get_version', () => {
    it('fetches the webapp release version', (done) => {
      const response_body = {version: '2017-03-14-15-05-prod'};
      window.fetch.returns(mock_response(response_body, 200));

      TestFactory.lifecycle_service.get_version()
        .then((version) => {
          expect(version).toBe(response_body.version);
          done();
        })
        .catch(done.fail);
    });
  });
});
