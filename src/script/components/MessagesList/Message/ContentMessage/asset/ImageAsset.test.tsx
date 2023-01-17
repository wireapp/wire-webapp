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

import {render, screen, waitFor} from '@testing-library/react';
import {container} from 'tsyringe';

import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';

import {ImageAsset, ImageAssetProps} from './ImageAsset';

jest.mock('Components/utils/InViewport', () => ({
  InViewport: ({onVisible, children}: {onVisible: () => void; children: any}) => {
    setTimeout(onVisible);
    return <div>{children}</div>;
  },
  __esModule: true,
}));

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

    render(<ImageAsset {...props} />);

    const imageElement = screen.getByTestId('image-asset-img');

    const imgSrc = imageElement.getAttribute('src');

    expect(imgSrc).toContain('svg');
    expect(imgSrc).toContain('10');
    expect(imgSrc).toContain('100');
  });

  it('displays the dummy image url when resource is loaded', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

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

    render(<ImageAsset {...props} />);

    const imageElement = screen.getByTestId('image-asset-img');

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      const imgSrc = imageElement.getAttribute('src');
      expect(imgSrc).toContain('data:image/svg+xml');
    });
  });
});
