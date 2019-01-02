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

import PropertiesRepository from 'app/script/properties/PropertiesRepository';

describe('z.links.LinkPreviewRepository', () => {
  let link_preview_repository = null;

  beforeEach(() => {
    const properties_repository = new PropertiesRepository();
    link_preview_repository = new z.links.LinkPreviewRepository(undefined, properties_repository);
  });

  afterEach(() => (window.openGraph = undefined));

  function mockSucceedingOpenGraph() {
    return (url, callback) => {
      return Promise.resolve()
        .then(meta => {
          if (callback) {
            callback(null, meta);
          }

          return meta;
        })
        .catch(error => {
          if (callback) {
            callback(error);
          }

          throw error;
        });
    };
  }

  describe('getLinkPreview', () => {
    it('rejects if openGraph lib is not available', done => {
      window.openGraph = undefined;

      link_preview_repository
        .getLinkPreview()
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.error.LinkPreviewError.TYPE.NOT_SUPPORTED);
          done();
        });
    });

    it('fetches open graph data if openGraph lib is available', done => {
      window.openGraph = mockSucceedingOpenGraph();

      link_preview_repository
        .getLinkPreview('https://app.wire.com/')
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.error.LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
          done();
        });
    });

    it('rejects if a link is blacklisted', done => {
      window.openGraph = mockSucceedingOpenGraph();

      link_preview_repository
        .getLinkPreview('https://www.youtube.com/watch?v=t4gjl-uwUHc')
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.error.LinkPreviewError.TYPE.BLACKLISTED);
          done();
        });
    });

    it('catches errors that are raised by the openGraph lib when invalid URIs are parsed', done => {
      window.openGraph = () => Promise.reject(new Error('Invalid URI'));

      const invalidUrl = 'http:////api/apikey';
      link_preview_repository
        .getLinkPreview(invalidUrl)
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.error.LinkPreviewError.TYPE.UNSUPPORTED_TYPE);
          done();
        });
    });
  });
});
