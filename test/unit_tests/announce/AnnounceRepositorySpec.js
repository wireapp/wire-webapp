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

// grunt test_init && grunt test_run:announce/AnnounceRepository

'use strict';

describe('z.announce.AnnounceRepository', function() {
  let server = undefined;
  const test_factory = new TestFactory();

  beforeAll(function(done) {
    test_factory.exposeAnnounceActors().then(done).catch(done.fail);
  });

  beforeEach(function() {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    const response = {
      count: 2,
      now: '2016-05-26T10:15:43.507250',
      result: [
        {
          active: true,
          created: '2016-05-25T09:12:53.316350',
          id: 5656058538229760,
          key: 'ag5lfndpcmUtd2Vic2l0ZXIVCxIIQW5ub3VuY2UYgICAgPyEhgoM',
          link: 'https://medium.com/@wireapp/safe-harbor-and-data-privacy-at-wire-86aa7b43d435',
          message: 'Safe Harbor and data privacy at Wire..',
          modified: '2016-05-25T12:56:17.363980',
          production: true,
          refresh: false,
          title: 'New Blog post',
          version: 1464166352,
          version_max: 'dev',
          version_min: '2016.04.14.0921'
        },
        {
          active: true,
          created: '2016-05-25T09:54:38.376540',
          id: 5746055551385600,
          key: 'ag5lfndpcmUtd2Vic2l0ZXIVCxIIQW5ub3VuY2UYgICAgJ3AmgoM',
          link: '',
          message: 'You heard it man..',
          modified: '2016-05-25T10:05:12.742010',
          production: true,
          refresh: true,
          title: 'Click me to refresh..',
          version: 1464166352,
          version_max: '2016.06.14.0921',
          version_min: 'dev'
        }
      ],
      status: 'success'
    };

    server.respondWith('GET', 'https://staging-website.zinfra.io/api/v1/announce/?order=created&active=true', [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(response)
    ]);
  });

  afterEach(function() {
    server.restore();
  });

  it('can fetch an announcement', function(done) {
    TestFactory.announce_repository.check_announcements().then(done).catch(done.fail);
  });
});
