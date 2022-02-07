/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {act} from '@testing-library/react';
import TestPage from 'Util/test/TestPage';

import {viewportObserver} from 'src/script/ui/viewportObserver';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import ImageAsset, {ImageAssetProps} from './ImageAsset';
import {container} from 'tsyringe';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import waitForExpect from 'wait-for-expect';

class ImageAssetTestPage extends TestPage<ImageAssetProps> {
  constructor(props?: ImageAssetProps) {
    super(ImageAsset, props);
  }

  getImg = () => this.get('[data-uie-name="image-asset-img"]');
}
describe('image-asset', () => {
  const defaultProps: ImageAssetProps = {
    asset: new MediumImage('image'),
    message: new ContentMessage(),
    onClick: () => {},
  };
  beforeEach(() => {
    jest.spyOn(viewportObserver, 'trackElement').mockImplementation((element, callback) => {
      callback(true);
    });
  });

  it('displays a dummy image when resource is not loaded', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';
    const testPage = new ImageAssetTestPage({...defaultProps, asset: image});
    const imgSrc = testPage.getImg().prop('src');

    expect(imgSrc).toContain('svg');
    expect(imgSrc).toContain('10');
    expect(imgSrc).toContain('100');
  });

  it('displays the image url when resource is loaded', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));
    const createObjectURLSpy = jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('/image-url');

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData('remote', {
        assetKey: '',
        assetToken: '',
        forceCaching: false,
        version: 3,
      }),
    );
    const testPage = new ImageAssetTestPage({...defaultProps, asset: image});
    await act(async () => {
      await waitForExpect(() => {
        expect(createObjectURLSpy).toHaveBeenCalled();
        act(() => {
          testPage.update();
        });
        const imgSrc = testPage.getImg().prop('src');
        expect(imgSrc).toContain('/image-url');
      });

      container.reset();
    });
  });
});
