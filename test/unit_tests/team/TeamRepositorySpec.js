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

// grunt test_init && grunt test_run:team/TeamRepository

'use strict';

describe('z.team.TeamRepository', () => {
  const test_factory = new TestFactory();

  let server = undefined;
  let team_repository = undefined;

  beforeAll((done) => {
    test_factory.exposeTeamActors()
      .then(function(repository) {
        team_repository = repository;
        done();
      })
      .catch(done.fail);
  });

  beforeEach(function() {
    server = sinon.fakeServer.create();
    server.autoRespond = true;

    const response = {
      'teams': [],
      'has_more': false,
    };

    server.respondWith('GET', `${test_factory.settings.connection.rest_url}/teams?size=100`, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(response),
    ]);
  });

  afterEach(function() {
    server.restore();
  });

  describe('get_teams', () => {
    it('returns team entities', (done) => {
      team_repository.get_teams(100)
        .then(done)
        .catch(done.fail);
    });
  });
});
