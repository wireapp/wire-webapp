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

'use strict';

// grunt test_init && grunt test_run:search/SearchRepository

describe('z.search.SearchRepository', function() {
  const test_factory = new TestFactory();
  let server = null;

  beforeEach((done) => {
    test_factory.exposeSearchActors()
      .then(function() {
        server = sinon.fakeServer.create();
        server.autoRespond = true;

        server.respondWith('GET', `${test_factory.settings.connection.rest_url}/search/suggestions?size=30`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(payload.search.suggestions.get),
        ]);

        server.respondWith('GET', `${test_factory.settings.connection.rest_url}/users?ids=${entities.user.john_doe.id}`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(payload.users.get.one),
        ]);

        server.respondWith('PUT', `${test_factory.settings.connection.rest_url}/search/suggestions/${entities.user.john_doe.id}/ignore`, [
          200,
          {},
          '',
        ]);

        const john_doe = new z.entity.User();
        john_doe.id = entities.user.john_doe.id;

        const jane_roe = new z.entity.User();
        jane_roe.id = entities.user.jane_roe.id;
        return TestFactory.user_repository.save_users([john_doe, jane_roe]);
      })
      .then(done)
      .catch(done.fail);
  });

  afterEach(function() {
    server.restore();
  });
});
