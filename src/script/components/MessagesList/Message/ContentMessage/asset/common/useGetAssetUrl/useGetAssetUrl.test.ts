/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {act, renderHook} from '@testing-library/react';

import {AssetError} from 'src/script/assets/AssetError';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import type {FileAsset} from 'src/script/entity/message/FileAsset';

import {useGetAssetUrl} from './useGetAssetUrl';

type Result = {current: {url: string | undefined; isLoading: boolean; isError: boolean}} | undefined;

describe('useGetAssetUrl', () => {
  const mockAssetUrl = {url: 'mock-asset-url'};
  const mockGetAssetUrl = jest.fn().mockResolvedValue(mockAssetUrl);
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  const mockAsset: FileAsset = {
    id: 'mock-asset-id',
    status: jest.fn(),
    original_resource: jest.fn().mockReturnValue(
      new AssetRemoteData('mock-asset-id', {
        assetDomain: 'mock-asset-domain',
        assetKey: 'mock-asset-key',
        assetToken: 'mock-asset-token',
        forceCaching: true,
        version: 4,
      }),
    ),
  } as unknown as FileAsset;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches asset URL when enabled', async () => {
    let result: Result;

    await act(async () => {
      const rendered = renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrl,
          onSuccess: mockOnSuccess,
        }),
      );
      result = rendered.result;
      await Promise.resolve();
    });

    expect(mockAsset.status).toHaveBeenCalledWith(AssetTransferState.DOWNLOADING);
    expect(mockGetAssetUrl).toHaveBeenCalled();
    expect(result?.current.url).toBe(mockAssetUrl.url);
    expect(result?.current.isLoading).toBe(false);
    expect(mockOnSuccess).toHaveBeenCalledWith(mockAssetUrl.url);
    expect(mockAsset.status).toHaveBeenCalledWith(AssetTransferState.UPLOADED);
  });

  it('does not fetch when disabled', async () => {
    await act(async () => {
      renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: false,
          getAssetUrl: mockGetAssetUrl,
        }),
      );
      await Promise.resolve();
    });

    expect(mockGetAssetUrl).not.toHaveBeenCalled();
  });

  it('handles errors correctly', async () => {
    const mockError = new Error('Failed to fetch asset');
    const mockGetAssetUrlWithError = jest.fn().mockRejectedValue(mockError);

    let result: Result;

    await act(async () => {
      const rendered = renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrlWithError,
          onError: mockOnError,
        }),
      );
      result = rendered.result;
      await Promise.resolve();
    });

    expect(result?.current.isError).toBe(true);
    expect(result?.current.isLoading).toBe(false);
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  it('ignores cancel errors', async () => {
    const cancelError = new Error('Operation cancelled');
    cancelError.name = AssetError.CANCEL_ERROR;
    const mockGetAssetUrlWithCancel = jest.fn().mockRejectedValue(cancelError);

    let result: Result;

    await act(async () => {
      const rendered = renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrlWithCancel,
          onError: mockOnError,
        }),
      );
      result = rendered.result;
      await Promise.resolve();
    });

    expect(result?.current.isError).toBe(false);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('does not fetch again if URL is already set', async () => {
    let rerender: () => void;

    await act(async () => {
      const rendered = renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrl,
        }),
      );

      rerender = rendered.rerender;
      await Promise.resolve();
    });

    expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender();
      await Promise.resolve();
    });

    expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);
  });

  it('updates asset status correctly through the lifecycle', async () => {
    await act(async () => {
      renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrl,
        }),
      );

      await Promise.resolve();
    });

    expect(mockAsset.status).toHaveBeenNthCalledWith(1, AssetTransferState.DOWNLOADING);
    expect(mockAsset.status).toHaveBeenNthCalledWith(2, AssetTransferState.UPLOADED);
    expect(mockAsset.status).toHaveBeenCalledTimes(2);
  });

  it('handles disabled state change correctly', async () => {
    let rerender: ({isEnabled}: {isEnabled: boolean}) => void;

    await act(async () => {
      const rendered = renderHook(
        ({isEnabled}) =>
          useGetAssetUrl({
            asset: mockAsset,
            isEnabled,
            getAssetUrl: mockGetAssetUrl,
          }),
        {initialProps: {isEnabled: false}},
      );
      rerender = rendered.rerender;
      await Promise.resolve();
    });

    expect(mockGetAssetUrl).not.toHaveBeenCalled();

    await act(async () => {
      rerender({isEnabled: true});
      await Promise.resolve();
    });

    expect(mockGetAssetUrl).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess with the asset URL when fetch succeeds', async () => {
    const mockOnSuccess = jest.fn();

    await act(async () => {
      renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrl,
          onSuccess: mockOnSuccess,
        }),
      );
      await Promise.resolve();
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnSuccess).toHaveBeenCalledWith(mockAssetUrl.url);
  });

  it('calls onError with the error when fetch fails', async () => {
    const mockError = new Error('Failed to fetch asset');
    const mockGetAssetUrlWithError = jest.fn().mockRejectedValue(mockError);
    const mockOnError = jest.fn();

    await act(async () => {
      renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrlWithError,
          onError: mockOnError,
        }),
      );
      await Promise.resolve();
    });

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  it('does not call onError for cancel errors', async () => {
    const cancelError = new Error('Operation cancelled');
    cancelError.name = AssetError.CANCEL_ERROR;
    const mockGetAssetUrlWithCancel = jest.fn().mockRejectedValue(cancelError);
    const mockOnError = jest.fn();

    await act(async () => {
      renderHook(() =>
        useGetAssetUrl({
          asset: mockAsset,
          isEnabled: true,
          getAssetUrl: mockGetAssetUrlWithCancel,
          onError: mockOnError,
        }),
      );
      await Promise.resolve();
    });

    expect(mockOnError).not.toHaveBeenCalled();
  });
});
