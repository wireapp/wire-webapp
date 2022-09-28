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

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import ImageAsset, {ImageAssetProps} from './ImageAsset';
import {container as tsyringeContainer} from 'tsyringe';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {render, waitFor} from '@testing-library/react';

jest.mock(
  'Components/utils/InViewport',
  () =>
    function MockInViewport({onVisible, children}: {onVisible: () => void; children: any}) {
      onVisible();
      return <div>{children}</div>;
    },
);

describe('image-asset', () => {
  const defaultProps: ImageAssetProps = {
    asset: new MediumImage('image'),
    message: new ContentMessage(),
    onClick: () => {},
  };

  it('displays a dummy image when resource is not loaded', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    const {getByTestId} = render(<ImageAsset {...props} />);

    const imageElement = getByTestId('image-asset-img');

    const imgSrc = imageElement.getAttribute('src');

    expect(imgSrc).toContain('svg');
    expect(imgSrc).toContain('10');
    expect(imgSrc).toContain('100');
  });

  it('displays the image url when resource is loaded', async () => {
    const assetRepository = tsyringeContainer.resolve(AssetRepository);
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

    const props = {...defaultProps, asset: image};

    const {getByTestId} = render(<ImageAsset {...props} />);

    const imageElement = getByTestId('image-asset-img');

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
      const imgSrc = imageElement.getAttribute('src');
      expect(imgSrc).toContain('/image-url');
    });
  });
});
