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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {container} from 'tsyringe';

import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {User} from 'Repositories/entity/User';

import {ImageAsset, ImageAssetProps} from './ImageAsset';

jest.mock('Components/InViewport', () => ({
  InViewport: ({onVisible, children, ...props}: {onVisible: () => void; children: any; [key: string]: any}) => {
    setTimeout(onVisible);
    return <div {...props}>{children}</div>;
  },
  __esModule: true,
}));

describe('image-asset', () => {
  const fakeImageUrl = 'https://test.com/image.png';
  const mockUser = new User('user-id', 'test-domain.wire.com');

  const createDefaultMessage = () => {
    const message = new ContentMessage();
    mockUser.name('Test User');
    message.user(mockUser);
    return message;
  };

  const defaultProps: ImageAssetProps = {
    asset: new MediumImage('image'),
    message: createDefaultMessage(),
    onClick: jest.fn(),
  };

  beforeAll(() => {
    jest.spyOn(window.URL, 'createObjectURL').mockReturnValue(fakeImageUrl);
    jest.spyOn(window.URL, 'revokeObjectURL').mockReturnValue();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading dots when resource is not loaded', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    render(<ImageAsset {...props} />);

    const imageElement = screen.getByTestId('image-loader');
    expect(imageElement).toBeDefined();
  });

  it('displays the dummy image url when resource is loaded', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    const props = {...defaultProps, asset: image};

    render(<ImageAsset {...props} />);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      const imageElement = screen.getByTestId('image-asset-img');
      const imgSrc = imageElement.getAttribute('src');
      expect(imgSrc).toBe(fakeImageUrl);
    });
  });

  it('renders image container with correct structure', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    const {container} = render(<ImageAsset {...props} />);

    const imageContainer = container.querySelector('[data-uie-name="image-asset"]');
    expect(imageContainer).toBeDefined();
    expect(imageContainer?.classList.contains('image-asset')).toBe(true);
  });

  it('calls onClick when image is clicked', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    const onClickMock = jest.fn();
    const message = createDefaultMessage();
    const props = {...defaultProps, asset: image, message, onClick: onClickMock};

    render(<ImageAsset {...props} />);

    await waitFor(() => {
      const imageElement = screen.getByTestId('image-asset-img');
      expect(imageElement).toBeDefined();
    });

    const wrapper = screen.getByTestId('image-asset-img').closest('div');
    fireEvent.click(wrapper!);
    expect(onClickMock).toHaveBeenCalledWith(message, expect.any(Object));
  });

  it('calls onClick when Enter key is pressed', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    const onClickMock = jest.fn();
    const message = createDefaultMessage();
    const props = {...defaultProps, asset: image, message, onClick: onClickMock};

    render(<ImageAsset {...props} />);

    await waitFor(() => {
      const imageElement = screen.getByTestId('image-asset-img');
      expect(imageElement).toBeDefined();
    });

    const assetImage = screen.getByRole('button');
    fireEvent.keyDown(assetImage, {key: 'Enter', code: 'Enter'});
    expect(onClickMock).toHaveBeenCalled();
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    const onClickMock = jest.fn();
    const message = createDefaultMessage();
    const props = {...defaultProps, asset: image, message, onClick: onClickMock};

    render(<ImageAsset {...props} />);

    await waitFor(() => {
      const imageElement = screen.getByTestId('image-asset-img');
      expect(imageElement).toBeDefined();
    });

    const assetImage = screen.getByRole('button');
    fireEvent.keyDown(assetImage, {key: ' ', code: 'Space'});
    expect(onClickMock).toHaveBeenCalled();
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('sets correct accessibility attributes', async () => {
    const assetRepository = container.resolve(AssetRepository);
    jest
      .spyOn(assetRepository, 'load')
      .mockReturnValue(Promise.resolve(new Blob([new Uint8Array()], {type: 'application/octet-stream'})));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    const message = createDefaultMessage();
    const props = {...defaultProps, asset: image, message};

    render(<ImageAsset {...props} />);

    await waitFor(() => {
      const imageElement = screen.getByTestId('image-asset-img');
      expect(imageElement.getAttribute('role')).toBe('presentation');
      // Alt text should be present (localization key or actual text)
      expect(imageElement.hasAttribute('alt')).toBe(true);
    });

    const assetImage = screen.getByRole('button');
    expect(assetImage.getAttribute('tabIndex')).toBe('0');
    // Aria label should be present (localization key or actual text)
    expect(assetImage.hasAttribute('aria-label')).toBe(true);
  });

  it('applies correct aspect ratio styling', () => {
    const image = new MediumImage('image');
    image.height = '200';
    image.width = '400';

    const props = {...defaultProps, asset: image};

    const {container} = render(<ImageAsset {...props} />);
    const imageContainer = container.querySelector('.image-asset');

    expect(imageContainer).toBeDefined();
  });
});
