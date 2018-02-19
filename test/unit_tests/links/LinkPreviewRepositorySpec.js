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

'use strict';

describe('z.links.LinkPreviewRepository', () => {
  let link_preview_repository = null;

  beforeEach(() => {
    const properties_repository = new z.properties.PropertiesRepository();
    link_preview_repository = new z.links.LinkPreviewRepository(undefined, properties_repository);
  });

  afterEach(() => {
    window.openGraph = undefined;
  });

  describe('getLinkPreview', () => {
    beforeEach(() => {
      spyOn(link_preview_repository, '_fetchOpenGraphData').and.returnValue(Promise.resolve());
    });

    it('should reject if open graph lib is not available', done => {
      link_preview_repository
        .getLinkPreview()
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.links.LinkPreviewError.TYPE.NOT_SUPPORTED);
          done();
        });
    });

    it('should fetch open graph data if openGraph lib is available', done => {
      window.openGraph = {};

      link_preview_repository
        .getLinkPreview()
        .then(done.fail)
        .catch(error => {
          expect(link_preview_repository._fetchOpenGraphData).toHaveBeenCalled();
          expect(error.type).toBe(z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
          done();
        });
    });

    it('should reject if link is blacklisted', done => {
      window.openGraph = {};

      link_preview_repository
        .getLinkPreview('youtube.com')
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(z.links.LinkPreviewError.TYPE.BLACKLISTED);
          done();
        });
    });
  });
});
