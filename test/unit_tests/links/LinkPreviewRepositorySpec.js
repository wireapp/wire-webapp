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

describe('z.links.LinkPreviewRepository', function() {
  let link_preview_repository = null;

  beforeEach(function() {
    const properties_repository = new z.properties.PropertiesRepository();
    link_preview_repository = new z.links.LinkPreviewRepository(
      undefined,
      properties_repository,
    );
  });

  afterEach(function() {
    window.openGraph = undefined;
  });

  describe('get_link_preview', function() {
    beforeEach(function() {
      spyOn(link_preview_repository, '_fetch_open_graph_data').and.returnValue(
        Promise.resolve(),
      );
    });

    it('should reject if open graph lib is not available', function(done) {
      link_preview_repository
        .get_link_preview()
        .then(done.fail)
        .catch(function(error) {
          expect(error.type).toBe(z.links.LinkPreviewError.TYPE.NOT_SUPPORTED);
          done();
        });
    });

    it('should fetch open graph data if openGraph lib is available', function(
      done,
    ) {
      window.openGraph = {};

      link_preview_repository
        .get_link_preview()
        .then(done.fail)
        .catch(function(error) {
          expect(
            link_preview_repository._fetch_open_graph_data,
          ).toHaveBeenCalled();
          expect(error.type).toBe(
            z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE,
          );
          done();
        });
    });

    it('should reject if link is blacklisted', function(done) {
      window.openGraph = {};

      link_preview_repository
        .get_link_preview('youtube.com')
        .then(done.fail)
        .catch(function(error) {
          expect(error.type).toBe(z.links.LinkPreviewError.TYPE.BLACKLISTED);
          done();
        });
    });
  });
});
