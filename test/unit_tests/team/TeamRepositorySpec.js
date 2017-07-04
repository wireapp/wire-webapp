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

  /* eslint sort-keys: "off" */
  const teams_data = {
    teams: [
      {
        creator: '9ca1bf41-42cd-4ee4-b54e-99e8dcc9d375',
        icon_key: null,
        icon: '',
        id: 'e6d3adc5-9140-477a-abc1-8279d210ceab',
        name: 'Wire GmbH',
      },
      {
        creator: 'e82019bc-5ee1-4835-8057-cfbe2229582b',
        icon_key: null,
        icon: '',
        id: 'f9310b63-0c04-4f13-a051-c19d24b78ed5',
        name: 'My Awesome Company',
      },
    ],
    has_more: false,
  };
  const team_metadata = teams_data.teams[0];
  const team_members = {
    members: [
      {user: 'bac6597b-5396-4a6a-8de9-d5aa75c998bf', permissions: 4},
      {user: '74fa64dc-8318-4426-9935-82590ff8aa3e', permissions: 8},
    ],
  };
  /* eslint sort-keys: "off" */

  let server = undefined;
  let team_repository = undefined;

  beforeAll(done => {
    test_factory
      .exposeTeamActors()
      .then(function(repository) {
        team_repository = repository;
        done();
      })
      .catch(done.fail);
  });

  beforeEach(function() {
    server = sinon.fakeServer.create();
    server.autoRespond = true;

    server.respondWith('GET', `${test_factory.settings.connection.rest_url}/teams?size=100`, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(teams_data),
    ]);

    server.respondWith('GET', `${test_factory.settings.connection.rest_url}/teams/${team_metadata.id}`, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(team_metadata),
    ]);

    server.respondWith('GET', `${test_factory.settings.connection.rest_url}/teams/${team_metadata.id}/members`, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(team_members),
    ]);
  });

  afterEach(function() {
    server.restore();
  });

  describe('get_teams()', () => {
    it('returns team entities', done => {
      team_repository
        .get_teams(100)
        .then(entities => {
          expect(entities.length).toEqual(teams_data.teams.length);
          expect(entities[0].creator).toEqual(teams_data.teams[0].creator);
          expect(entities[1].creator).toEqual(teams_data.teams[1].creator);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_team_metadata()', () => {
    it('returns team metadata entities', done => {
      team_repository
        .get_team_from_backend(team_metadata.id)
        .then(entity => {
          expect(entity.creator).toEqual(team_metadata.creator);
          expect(entity.id).toEqual(team_metadata.id);
          expect(entity.name()).toEqual(team_metadata.name);
          done();
        })
        .catch(done.fail);
    });
  });

  xdescribe('get_team_members()', () => {
    it('returns team member entities', done => {
      team_repository
        .get_team_members(team_metadata.id)
        .then(entities => {
          expect(entities.length).toEqual(team_members.members.length);
          expect(entities[0].user).toEqual(team_members.members[0].user);
          expect(entities[0].permissions).toEqual(team_members.members[0].permissions);
          done();
        })
        .catch(done.fail);
    });
  });
});
