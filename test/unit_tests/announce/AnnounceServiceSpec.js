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

// grunt test_init && grunt test_run:announce/AnnounceService

'use strict';

describe('z.announce.AnnounceService', () => {
  let mock_response = undefined;
  const test_factory = new window.TestFactory();

  beforeAll((done) => {
    test_factory.exposeAnnounceActors()
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

  describe('get_announcements', () => {
    it('should fetch announcements', (done) => {
      const response_body = {
        'count': 2,
        'now': '2016-05-26T10:15:43.507250',
        'result': [
          {
            'active': true,
            'created': '2016-05-25T09:12:53.316350',
            'id': 5656058538229760,
            'key': 'ag5lfndpcmUtd2Vic2l0ZXIVCxIIQW5ub3VuY2UYgICAgPyEhgoM',
            'link': 'https://medium.com/@wireapp/safe-harbor-and-data-privacy-at-wire-86aa7b43d435',
            'message': 'Safe Harbor and data privacy at Wire..',
            'modified': '2016-05-25T12:56:17.363980',
            'production': true,
            'refresh': false,
            'title': 'New Blog post',
            'version': 1464166352,
            'version_max': '2016.06.14.0921',
            'version_min': '2016.04.14.0921',
          },
          {
            'active': true,
            'created': '2016-05-25T09:54:38.376540',
            'id': 5746055551385600,
            'key': 'ag5lfndpcmUtd2Vic2l0ZXIVCxIIQW5ub3VuY2UYgICAgJ3AmgoM',
            'link': '',
            'message': 'You heard it man..',
            'modified': '2016-05-25T10:05:12.742010',
            'production': true,
            'refresh': true,
            'title': 'Click me to refresh..',
            'version': 1464166352,
            'version_max': '2016.06.14.0921',
            'version_min': '2016.04.14.0921',
          },
        ],
        'status': 'success',
      };
      window.fetch.returns(mock_response(response_body, 200));

      TestFactory.announce_service.get_announcements()
        .then((result) => {
          console.log(JSON.stringify(result));
          expect(result.length).toBe(2);
          done();
        })
        .catch(done.fail);
    });

    it('handles a server error', (done) => {
      window.fetch.returns(mock_response({}, 404, 'Not Found'));

      TestFactory.announce_service.get_announcements()
        .then(done.fail)
        .catch((error) => {
          expect(error.message).toBe('Failed to fetch \'https://staging-website.zinfra.io/api/v1/announce/?order=created&active=true\': Not Found');
          done();
        });
    });
  });

  describe('get_version', () => {
    it('fetches the webapp release version', (done) => {
      const response_body = {version: '2017-03-14-15-05-prod'};
      window.fetch.returns(mock_response(response_body, 200));

      TestFactory.announce_service.get_version()
        .then((version) => {
          expect(version).toBe(response_body.version);
          done();
        })
        .catch(done.fail);
    });
  });
});
