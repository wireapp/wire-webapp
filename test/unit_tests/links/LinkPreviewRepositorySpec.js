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

import {AssetService} from 'src/script/assets/AssetService';
import {container} from 'tsyringe';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {SelfService} from 'src/script/self/SelfService';
import {LinkPreviewRepository} from 'src/script/links/LinkPreviewRepository';
import {APIClient} from 'src/script/service/APIClientSingleton';

import {LinkPreviewError} from 'src/script/error/LinkPreviewError';
import {AssetRepository} from 'src/script/assets/AssetRepository';

describe('LinkPreviewRepository', () => {
  let link_preview_repository = null;

  beforeEach(() => {
    const apiClient = container.resolve(APIClient);
    const assetService = new AssetService(container.resolve(APIClient));
    const assetRepository = new AssetRepository(assetService);
    const propertiesRepository = new PropertiesRepository(new PropertiesService(apiClient), new SelfService(apiClient));
    link_preview_repository = new LinkPreviewRepository(assetRepository, propertiesRepository);
  });

  afterEach(() => (window.openGraphAsync = undefined));

  describe('getLinkPreview', () => {
    it('fetches open graph data if openGraph lib is available', done => {
      window.openGraphAsync = () => Promise.resolve();

      link_preview_repository
        .getLinkPreview('https://app.wire.com/')
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(LinkPreviewError.TYPE.NO_DATA_AVAILABLE);
          done();
        });
    });

    it('rejects if a link is blacklisted', done => {
      window.openGraphAsync = () => Promise.resolve();

      link_preview_repository
        .getLinkPreview('https://www.youtube.com/watch?v=t4gjl-uwUHc')
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(LinkPreviewError.TYPE.BLACKLISTED);
          done();
        });
    });

    it('catches errors that are raised by the openGraph lib when invalid URIs are parsed', done => {
      window.openGraphAsync = () => Promise.reject(new Error('Invalid URI'));

      const invalidUrl = 'http:////api/apikey';
      link_preview_repository
        .getLinkPreview(invalidUrl)
        .then(done.fail)
        .catch(error => {
          expect(error.type).toBe(LinkPreviewError.TYPE.UNSUPPORTED_TYPE);
          done();
        });
    });
  });
});
