/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import ko from 'knockout';

import {AssetRemoteData} from 'Repositories/assets/assetRemoteData';
import {AssetTransferState} from 'Repositories/assets/assetTransferState';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {FileAsset} from 'Repositories/entity/message/fileAsset';
import {TeamState} from 'Repositories/team/TeamState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {VideoAsset} from './VideoAsset';
import {AssetUrl, useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

jest.mock('../common/useAssetTransfer/useAssetTransfer');

const mockedUseAssetTransfer = jest.mocked(useAssetTransfer);

describe('VideoAsset', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  const previewDispose = jest.fn();
  const videoSrcDispose = jest.fn();
  const mockGetAssetUrl = jest.fn<
    Promise<AssetUrl>,
    [resource: AssetRemoteData, acceptedMimeTypes?: string[]]
  >();

  const teamState = {
    isFileSharingReceivingEnabled: ko.pureComputed(() => true),
  } as TeamState;

  const remoteAssetData = new AssetRemoteData({
    assetKey: 'asset-key',
    assetDomain: 'test-domain.wire.com',
    assetToken: 'asset-token',
    forceCaching: false,
  });

  const createVideoMessage = (): ContentMessage => {
    const asset = new FileAsset();
    asset.file_name = 'Poll App Demo.mp4';
    asset.file_type = 'video/mp4';
    asset.file_size = 10_485_760;
    asset.status(AssetTransferState.UPLOADED);
    asset.preview_resource(remoteAssetData);
    asset.original_resource(remoteAssetData);

    const message = new ContentMessage(undefined, translateForTest);
    message.addAsset(asset);

    return message;
  };

  const setupAssetTransferMock = (): void => {
    mockGetAssetUrl.mockReset();
    previewDispose.mockReset();
    videoSrcDispose.mockReset();

    mockGetAssetUrl
      .mockResolvedValueOnce({url: 'blob:mock-preview', dispose: previewDispose})
      .mockResolvedValueOnce({url: 'blob:mock-video-src', dispose: videoSrcDispose});

    mockedUseAssetTransfer.mockReturnValue({
      cancelUpload: jest.fn(),
      downloadAsset: jest.fn(),
      getAssetUrl: mockGetAssetUrl,
      isDownloading: false,
      isPendingUpload: false,
      isUploaded: true,
      isUploading: false,
      transferState: AssetTransferState.UPLOADED,
      uploadProgress: -1,
    });
  };

  beforeAll(() => {
    HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);

    const originalCreateElement = document.createElement.bind(document);

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);

      if (tagName !== 'video') {
        return element;
      }

      const videoElement = element as HTMLVideoElement;

      jest.spyOn(videoElement, 'canPlayType').mockReturnValue('probably');
      Object.defineProperty(videoElement, 'videoWidth', {configurable: true, value: 640});
      Object.defineProperty(videoElement, 'videoHeight', {configurable: true, value: 480});

      let currentSrc = '';

      Object.defineProperty(videoElement, 'src', {
        configurable: true,
        get: () => currentSrc,
        set: (value: string) => {
          currentSrc = value;
          queueMicrotask(() => {
            videoElement.onloadedmetadata?.({} as Event);
          });
        },
      });

      return videoElement;
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupAssetTransferMock();
  });

  it('keeps the video blob URL alive while playback time updates trigger re-renders', async () => {
    const message = createVideoMessage();

    render(<VideoAsset message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(2);
    });

    const videoElement = document.querySelector('[data-uie-name="video-asset"] video') as HTMLVideoElement;

    await waitFor(() => {
      expect(videoElement.getAttribute('src')).toBe('blob:mock-video-src');
    });

    Object.defineProperty(videoElement, 'currentTime', {configurable: true, value: 1, writable: true});
    Object.defineProperty(videoElement, 'duration', {configurable: true, value: 10, writable: true});

    for (let index = 0; index < 5; index += 1) {
      fireEvent.timeUpdate(videoElement);
    }

    expect(videoSrcDispose).not.toHaveBeenCalled();
  });

  it('does not revoke the video blob URL when upload progress updates trigger re-renders', async () => {
    const message = createVideoMessage();

    const renderWithUploadProgress = (uploadProgress: number) => {
      mockedUseAssetTransfer.mockReturnValue({
        cancelUpload: jest.fn(),
        downloadAsset: jest.fn(),
        getAssetUrl: mockGetAssetUrl,
        isDownloading: false,
        isPendingUpload: false,
        isUploaded: uploadProgress <= -1,
        isUploading: uploadProgress > -1,
        transferState: uploadProgress > -1 ? AssetTransferState.UPLOADING : AssetTransferState.UPLOADED,
        uploadProgress,
      });

      return render(<VideoAsset message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});
    };

    const view = renderWithUploadProgress(-1);

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(2);
    });

    for (const uploadProgress of [25, 50, 75]) {
      mockedUseAssetTransfer.mockReturnValue({
        cancelUpload: jest.fn(),
        downloadAsset: jest.fn(),
        getAssetUrl: mockGetAssetUrl,
        isDownloading: false,
        isPendingUpload: false,
        isUploaded: false,
        isUploading: true,
        transferState: AssetTransferState.UPLOADING,
        uploadProgress,
      });

      view.rerender(<VideoAsset message={message} teamState={teamState} />);
    }

    expect(videoSrcDispose).not.toHaveBeenCalled();
  });

  it('revokes blob URLs when the component unmounts', async () => {
    const message = createVideoMessage();

    const {unmount} = render(<VideoAsset message={message} teamState={teamState} />, {
      wrapper: rootProviderWrapper,
    });

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(mockGetAssetUrl).toHaveBeenCalledTimes(2);
    });

    const videoElement = document.querySelector('[data-uie-name="video-asset"] video') as HTMLVideoElement;

    await waitFor(() => {
      expect(videoElement.getAttribute('src')).toBe('blob:mock-video-src');
    });

    unmount();

    expect(previewDispose).toHaveBeenCalledTimes(1);
    expect(videoSrcDispose).toHaveBeenCalledTimes(1);
  });
});
