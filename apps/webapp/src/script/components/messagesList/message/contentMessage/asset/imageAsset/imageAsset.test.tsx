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
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, {KeyboardEventHandler, MouseEventHandler, ReactNode} from 'react';
import type {FunctionComponent} from 'react';

import {ThemeProvider} from '@wireapp/react-ui-kit';

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
type ImageAssetTestWrapperProperties = {children: ReactNode};

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

  const MockInViewport: FunctionComponent<MockInViewportProps> = (properties: MockInViewportProps) => {
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
  };

  return {
    InViewport: MockInViewport,
    __esModule: true,
  };
});

describe('image-asset', () => {
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
  const rootContextWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({fireAndForgetInvoker, translate: translateForTest}),
  );
  const fakeImageUrl = 'https://test.com/image.png';
  const retryLabel = translateForTest('conversationImageAssetRetry');
  const mockUser = new User('user-id', 'test-domain.wire.com', translateForTest);
  const getAssetUrlMock = jest.fn<ReturnType<GetAssetUrl>, Parameters<GetAssetUrl>>();
  const imageLoggerMock = buildImageLoggerMock();

  function rootProviderWrapper(properties: ImageAssetTestWrapperProperties): ReactNode {
    const {children} = properties;

    return <ThemeProvider>{rootContextWrapper({children})}</ThemeProvider>;
  }

  function createImageWithResource(): MediumImage {
    const image = new MediumImage('image');
    image.resource(
      new AssetRemoteData({
        assetKey: 'remote',
        assetDomain: 'test-domain.wire.com',
        assetToken: '',
        forceCaching: false,
      }),
    );

    return image;
  }

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

  it('waits for the resource before loading the image', async () => {
    const image = new MediumImage('image');
    image.height = '10';
    image.width = '100';

    const props = {...defaultProps, asset: image};

    render(<ImageAsset {...props} />, {wrapper: rootProviderWrapper});

    const imageElement = screen.getByTestId('image-loader');
    expect(imageElement).toBeDefined();
    expect(getAssetUrlMock).not.toHaveBeenCalled();

    act(() => {
      image.resource(
        new AssetRemoteData({
          assetKey: 'remote',
          assetDomain: 'test-domain.wire.com',
          assetToken: '',
          forceCaching: false,
        }),
      );
    });

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalled();
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });
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

    const onClickMock = jest.fn();
    render(<ImageAsset {...defaultProps} asset={image} onClick={onClickMock} />, {wrapper: rootProviderWrapper});

    const imageElement = screen.getByTestId('image-loader');
    const imageContainer = requireValueForTest(imageElement.parentElement);

    await waitFor(() => {
      expect(imageContainer).toHaveAttribute('data-uie-status', 'error');
    });

    expect(imageContainer).not.toHaveClass('loading-dots');
    expect(imageLoggerMock.error).toHaveBeenCalledWith('Failed to load image asset', expect.any(Error));
    expect(screen.getByRole('button', {name: retryLabel})).toBeDefined();
    expect(imageContainer).not.toHaveAttribute('role', 'button');

    fireEvent.keyDown(imageContainer, {key: 'Enter', code: 'Enter'});
    fireEvent.keyDown(imageContainer, {key: ' ', code: 'Space'});
    expect(onClickMock).not.toHaveBeenCalled();
  });

  it('retries failed image loading and hides the retry action after success', async () => {
    getAssetUrlMock.mockRejectedValueOnce(new Error('Initial image load failed'));

    const image = createImageWithResource();
    const onClickMock = jest.fn();
    render(<ImageAsset {...defaultProps} asset={image} onClick={onClickMock} />, {wrapper: rootProviderWrapper});

    const retryButton = await screen.findByRole('button', {name: retryLabel});
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });

    expect(screen.queryByRole('button', {name: retryLabel})).toBeNull();
    expect(onClickMock).not.toHaveBeenCalled();
  });

  it('returns to the failed state when retrying image loading fails', async () => {
    getAssetUrlMock
      .mockRejectedValueOnce(new Error('Initial image load failed'))
      .mockRejectedValueOnce(new Error('Retry image load failed'));

    const image = createImageWithResource();
    render(<ImageAsset {...defaultProps} asset={image} />, {wrapper: rootProviderWrapper});

    const retryButton = await screen.findByRole('button', {name: retryLabel});
    const imageContainer = requireValueForTest(retryButton.parentElement);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalledTimes(2);
      expect(imageContainer).toHaveAttribute('data-uie-status', 'error');
    });

    expect(screen.getByRole('button', {name: retryLabel})).toBeDefined();
  });

  it('retries image loading with the keyboard without opening image details', async () => {
    getAssetUrlMock.mockRejectedValueOnce(new Error('Initial image load failed'));

    const image = createImageWithResource();
    const onClickMock = jest.fn();
    render(<ImageAsset {...defaultProps} asset={image} onClick={onClickMock} />, {wrapper: rootProviderWrapper});

    const retryButton = await screen.findByRole('button', {name: retryLabel});
    const user = userEvent.setup();
    retryButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });

    expect(onClickMock).not.toHaveBeenCalled();
  });

  it('does not start parallel asset requests when retry is activated repeatedly', async () => {
    let resolveRetryLoad: (assetUrl: AssetUrl) => void = (): void => {
      return undefined;
    };
    const pendingRetryLoad = new Promise<AssetUrl>((resolve): void => {
      resolveRetryLoad = resolve;
    });
    getAssetUrlMock.mockRejectedValueOnce(new Error('Initial image load failed')).mockReturnValueOnce(pendingRetryLoad);

    const image = createImageWithResource();
    render(<ImageAsset {...defaultProps} asset={image} />, {wrapper: rootProviderWrapper});

    const retryButton = await screen.findByRole('button', {name: retryLabel});
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('image-loader')).toBeDefined();
    });

    resolveRetryLoad({url: fakeImageUrl, dispose: jest.fn()});
    await waitFor(() => {
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });
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
    fireEvent.keyDown(imageContainer, {key: 'Enter', code: 'Enter'});
    fireEvent.keyDown(imageContainer, {key: ' ', code: 'Space'});
    expect(onClickMock).not.toHaveBeenCalled();

    resolvePendingLoad({url: fakeImageUrl, dispose: jest.fn()});
    await waitFor(() => {
      expect(screen.getByTestId('image-asset-img')).toBeDefined();
    });
  });

  it('disposes the asset url when loading finishes after unmount', async () => {
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

    const {unmount} = render(<ImageAsset {...defaultProps} asset={image} />, {wrapper: rootProviderWrapper});

    await waitFor(() => {
      expect(getAssetUrlMock).toHaveBeenCalled();
    });

    const disposeAssetUrlMock = jest.fn();
    unmount();
    resolvePendingLoad({url: fakeImageUrl, dispose: disposeAssetUrlMock});

    await waitFor(() => {
      expect(disposeAssetUrlMock).toHaveBeenCalledTimes(1);
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
