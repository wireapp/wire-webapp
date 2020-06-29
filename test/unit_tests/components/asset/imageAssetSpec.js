/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {instantiateComponent} from '../../../helper/knockoutHelpers';

import {viewportObserver} from 'src/script/ui/viewportObserver';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import 'src/script/components/asset/imageAsset';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {container} from 'tsyringe';
import {AssetRepository} from 'src/script/assets/AssetRepository';

describe('image-asset', () => {
  const defaultParams = {
    asset: new MediumImage(),
    message: new ContentMessage(),
    onClick: () => {},
  };

  beforeEach(() => {
    spyOn(viewportObserver, 'onElementInViewport').and.callFake((element, callback) => {
      callback();
    });
  });

  it('displays a dummy image when resource is not loaded', () => {
    const image = new MediumImage();
    image.height = 10;
    image.width = 100;
    const params = {...defaultParams, asset: image};
    return instantiateComponent('image-asset', params).then(domContainer => {
      const img = domContainer.querySelector('img');

      expect(img.src).toContain('svg');
      expect(img.src).toContain('10');
      expect(img.src).toContain('100');
    });
  });

  it('displays the image url when resource is loaded', () => {
    const assetRepository = container.resolve(AssetRepository);
    spyOn(assetRepository, 'load').and.returnValue(Promise.resolve(new Blob()));

    const image = new MediumImage();
    image.resource(new AssetRemoteData());
    const params = {...defaultParams, asset: image};

    spyOn(window.URL, 'createObjectURL').and.returnValue('/image-url');

    instantiateComponent('image-asset', params)
      .then(domContainer => {
        expect(window.URL.createObjectURL).toHaveBeenCalled();
        const img = domContainer.querySelector('img');

        expect(img.src).toContain('/image-url');
      })
      .finally(() => {
        container.reset();
      });
  });
});
