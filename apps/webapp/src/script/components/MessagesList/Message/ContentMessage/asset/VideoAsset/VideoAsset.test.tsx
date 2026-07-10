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

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import ko from 'knockout';

import {AssetRemoteData} from 'Repositories/assets/assetRemoteData';
import {AssetRepository} from 'Repositories/assets/assetRepository';
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

describe('VideoAsset', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  const previewBlob = new Blob([], {type: 'video/mp4'});
  const videoBlob = new Blob([], {type: 'video/mp4'});
  const progressObservable = ko.observable(-1);

  const assetRepository = {
    getUploadProgress: jest.fn().mockReturnValue(ko.pureComputed(() => progressObservable())),
    load: jest.fn(),
    cancelUpload: jest.fn(),
    downloadFile: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AssetRepository>;

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

  const setupAssetRepository = (): void => {
    progressObservable(-1);
    assetRepository.getUploadProgress.mockReturnValue(ko.pureComputed(() => progressObservable()));
    assetRepository.load.mockReset().mockResolvedValueOnce(previewBlob).mockResolvedValueOnce(videoBlob);

    jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:mock-preview')
      .mockReturnValueOnce('blob:mock-video-src');
  };

  const renderVideoAsset = (message: ContentMessage) =>
    render(<VideoAsset message={message} teamState={teamState} assetRepository={assetRepository} />, {
      wrapper: rootProviderWrapper,
    });

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

    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupAssetRepository();
  });

  it('keeps the video blob URL alive while playback time updates trigger re-renders', async () => {
    const message = createVideoMessage();

    renderVideoAsset(message);

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(2);
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

    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:mock-video-src');
  });

  it('does not revoke the video blob URL when upload progress updates trigger re-renders', async () => {
    const message = createVideoMessage();

    renderVideoAsset(message);

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(2);
    });

    for (const uploadProgress of [25, 50, 75]) {
      act(() => {
        progressObservable(uploadProgress);
      });
    }

    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:mock-video-src');
  });

  it('revokes blob URLs when the component unmounts', async () => {
    const message = createVideoMessage();

    const {unmount} = renderVideoAsset(message);

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(2);
    });

    const videoElement = document.querySelector('[data-uie-name="video-asset"] video') as HTMLVideoElement;

    await waitFor(() => {
      expect(videoElement.getAttribute('src')).toBe('blob:mock-video-src');
    });

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preview');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-video-src');
  });

  it('revokes the object URL when unmounted before play finishes loading', async () => {
    let resolveLoad: (blob: Blob) => void = () => {};
    const deferredLoad = new Promise<Blob>(resolve => {
      resolveLoad = resolve;
    });

    assetRepository.load
      .mockReset()
      .mockResolvedValueOnce(previewBlob)
      .mockImplementationOnce(() => deferredLoad);

    jest.mocked(URL.createObjectURL).mockReset();
    jest
      .mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:mock-preview')
      .mockReturnValueOnce('blob:mock-deferred-video');

    const message = createVideoMessage();
    const {unmount} = renderVideoAsset(message);

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('do-play-media'));

    await waitFor(() => {
      expect(assetRepository.load).toHaveBeenCalledTimes(2);
    });

    unmount();

    await act(async () => {
      resolveLoad(videoBlob);
      await deferredLoad;
    });

    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-deferred-video');
    });
  });
});
