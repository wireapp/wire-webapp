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

import {instantiateComponent} from '../../../api/knockoutHelpers';

import viewportObserver from 'src/script/ui/viewportObserver';
import ContentMessage from 'src/script/entity/message/ContentMessage';
import MediumImage from 'src/script/entity/message/MediumImage';
import 'src/script/components/asset/imageAsset';

describe('image-asset', () => {
  const defaultParams = {
    asset: new MediumImage(),
    message: new ContentMessage(),
    onClick: () => {},
  };

  beforeEach(() => {
    spyOn(viewportObserver, 'addElement').and.callFake((element, callback) => {
      callback();
    });
  });

  it('displays a dummy image when resource is not loaded', () => {
    const image = new MediumImage();
    image.height = 10;
    image.width = 100;
    const params = Object.assign({}, defaultParams, {
      asset: image,
    });
    return instantiateComponent('image-asset', params).then(domContainer => {
      const img = domContainer.querySelector('img');

      expect(img.src).toContain('svg');
      expect(img.src).toContain('10');
      expect(img.src).toContain('100');
    });
  });

  it('displays the image url when resource is loaded', () => {
    const image = new MediumImage();
    image.resource({load: () => Promise.resolve(new Blob())});
    const params = Object.assign({}, defaultParams, {
      asset: image,
    });

    spyOn(window.URL, 'createObjectURL').and.returnValue('/image-url');

    return instantiateComponent('image-asset', params).then(domContainer => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      const img = domContainer.querySelector('img');

      expect(img.src).toContain('/image-url');
    });
  });
});
