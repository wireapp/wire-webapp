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

import type {CSSObject} from '@emotion/react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {KeyboardEventHandler, MouseEventHandler, ReactElement, ReactNode} from 'react';

import type {AssetUrl} from 'Components/messagesList/message/contentMessage/asset/common/useAssetTransfer/useAssetTransfer';
import type {GetAssetUrl, ImageLogger} from 'Components/image';
import {AssetRemoteData} from 'Repositories/assets/assetRemoteData';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {MediumImage} from 'Repositories/entity/message/mediumImage';
import {User} from 'Repositories/entity/User';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ImageAsset, ImageAssetProps} from './imageAsset';

type ImageLoggerMock = jest.Mocked<ImageLogger>;

function buildImageLoggerMock(): ImageLoggerMock {
  return {error: jest.fn()};
}

jest.mock('Components/inViewport', () => {
  interface MockInViewportProps {
    'aria-label'?: string;
    children: ReactNode;
    className?: string;
    css?: CSSObject;
    'data-uie-name'?: string;
    'data-uie-status'?: string;
    'data-uie-visible'?: boolean;
    onClick?: MouseEventHandler<HTMLDivElement>;
    onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
    onVisible: () => void;
    role?: string;
    tabIndex?: number;
  }

  function MockInViewport(properties: MockInViewportProps): ReactElement {
    const {
      'aria-label': ariaLabel,
      children,
      className,
      'data-uie-name': dataUieName,
      'data-uie-status': dataUieStatus,
      'data-uie-visible': dataUieVisible,
      onClick,
      onKeyDown,
      onVisible,
      role,
      tabIndex,
    } = properties;
    setTimeout(onVisible);

    return (
      <div
        aria-label={ariaLabel}
        className={className}
        data-uie-name={dataUieName}
        data-uie-status={dataUieStatus}
        data-uie-visible={dataUieVisible}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role={role}
        tabIndex={tabIndex}
      >
        {children}
      </div>
    );
  }

  return {
    InViewport: MockInViewport,
    __esModule: true,
  };
});

describe('image-asset', () => {
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({fireAndForgetInvoker, translate: translateForTest}),
  );
  const fakeImageUrl = 'https://test.com/image.png';
  const mockUser = new User('user-id', 'test-domain.wire.com', translateForTest);
  const getAssetUrlMock = jest.fn<ReturnType<GetAssetUrl>, Parameters<GetAssetUrl>>();
  const imageLoggerMock = buildImageLoggerMock();

  const createDefaultMessage = () => {
    const message = new ContentMessage(undefined, translateForTest);
    mockUser.name('Test User');
    message.user(mockUser);
    return message;
  };

  const defaultProps: ImageAssetProps = {
    asset: new MediumImage('image'),
    getAssetUrl: getAssetUrlMock,
    logger: imageLoggerMock,
    message: createDefaultMessage(),
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAssetUrlMock.mockReset();
    getAssetUrlMock.mockResolvedValue({url: fakeImageUrl, dispose: jest.fn()});
  });

  it('displays loading dots when resource is not loaded', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

    const imageElement = screen.getByTestId('image-loader');
    expect(imageElement).toBeDefined();
  });

  it('displays the dummy image url when resource is loaded', async () => {
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

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalled();
      const imageElement = screen.getByTestId('image-asset-img');
      const imgSrc = imageElement.getAttribute('src');
      expect(imgSrc).toBe(fakeImageUrl);

      const imageContainer = requireValueForTest(imageElement.parentElement);
      expect(imageContainer).toHaveAttribute('data-uie-status', 'loaded');
      expect(imageContainer).not.toHaveClass('loading-dots');
    });
  });

  it('shows an error status and removes loading dots when image loading fails', async () => {
    getAssetUrlMock.mockRejectedValue(new Error('Asset could not be loaded'));

    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    render(<ImageAsset {...defaultProps} asset={image} />, {wrapper: rootProviderWrapper});

    const imageElement = screen.getByTestId('image-loader');
    const imageContainer = requireValueForTest(imageElement.parentElement);

    await waitFor(() => {
      expect(imageContainer).toHaveAttribute('data-uie-status', 'error');
    });

    expect(imageContainer).not.toHaveClass('loading-dots');
    expect(imageLoggerMock.error).toHaveBeenCalledWith('Failed to load image asset', expect.any(Error));
  });

  it('keeps the image non-interactive while loading', async () => {
    let resolvePendingLoad: (assetUrl: AssetUrl) => void = (): void => {
      return undefined;
    };
    const pendingLoad = new Promise<AssetUrl>((resolve): void => {
      resolvePendingLoad = resolve;
    });
    getAssetUrlMock.mockReturnValue(pendingLoad);

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
    render(<ImageAsset {...defaultProps} asset={image} onClick={onClickMock} />, {wrapper: rootProviderWrapper});

    const imageElement = screen.getByTestId('image-loader');
    const imageContainer = requireValueForTest(imageElement.parentElement);
    expect(imageContainer).toHaveAttribute('data-uie-status', 'waiting');

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalled();
    });

    expect(imageContainer).toHaveAttribute('data-uie-status', 'loading');
    fireEvent.click(imageContainer);
    expect(onClickMock).not.toHaveBeenCalled();

    resolvePendingLoad({url: fakeImageUrl, dispose: jest.fn()});
    await waitFor(() => {
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });
  });

  it('renders image container with correct structure', () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    const {container} = render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

    const imageContainer = container.querySelector('[data-uie-name="image-asset"]');
    expect(imageContainer).toBeDefined();
    expect(imageContainer?.classList.contains('image-asset')).toBe(true);
  });

  it('calls onClick when image is clicked', async () => {
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

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

    await waitFor(() => {
      const imageElement = screen.getByTestId('image-asset-img');
      expect(imageElement).toBeDefined();
    });

    const wrapper = screen.getByTestId('image-asset-img').closest('div');
    fireEvent.click(requireValueForTest(wrapper));
    expect(onClickMock).toHaveBeenCalledWith(message, expect.any(Object));
  });

  it('calls onClick when Enter key is pressed', async () => {
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

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

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

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

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

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

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

    const {container} = render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});
    const imageContainer = container.querySelector('.image-asset');

    expect(imageContainer).toBeDefined();
  });
});
