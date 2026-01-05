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

import {act, renderHook, waitFor} from '@testing-library/react';
import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/CellsRepository';

import {useGetMultipartAsset} from './useGetMultipartAsset';

const mockNode: RestNode = {
  Path: '/path/to/test.pdf',
  Uuid: 'test-uuid',
  IsRecycled: false,
  PreSignedGET: {
    Url: 'https://example.com/file.pdf',
  },
  Previews: [
    {
      ContentType: 'image/png',
      PreSignedGET: {
        Url: 'https://example.com/preview.png',
      },
      Processing: false,
      Error: undefined,
    },
  ],
};

const mockRecycledNode: RestNode = {
  ...mockNode,
  IsRecycled: true,
};

describe('useGetMultipartAsset', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCellsRepository = {
      getNode: jest.fn(),
    } as unknown as jest.Mocked<CellsRepository>;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('isRecycled state handling', () => {
    it('should set isRecycled to false for non-recycled files', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isRecycled).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should set isRecycled to true for recycled files', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockRecycledNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isRecycled).toBe(true);
      });

      expect(result.current.src).toBe('https://example.com/file.pdf');
      expect(result.current.path).toBe('/path/to/test.pdf');
    });

    it('should update isRecycled state when refetched', async () => {
      // Start with non-recycled node
      mockCellsRepository.getNode.mockResolvedValueOnce(mockNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isRecycled).toBe(false);
      });

      // Change to recycled node on refetch
      mockCellsRepository.getNode.mockResolvedValueOnce(mockRecycledNode);

      await act(async () => {
        await result.current.fetchData(true);
      });

      await waitFor(() => {
        expect(result.current.isRecycled).toBe(true);
      });
    });
  });

  describe('forceRefetch parameter', () => {
    it('should refetch data when forceRefetch is true even if already successful', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);

      // Force refetch
      await act(async () => {
        await result.current.fetchData(true);
      });

      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(2);
    });

    it('should not refetch when forceRefetch is false and status is success', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);

      // Try to fetch without force
      await act(async () => {
        await result.current.fetchData(false);
      });

      // Should not call getNode again
      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
    });

    it('should update all state properties when forceRefetch is called', async () => {
      const updatedNode: RestNode = {
        ...mockNode,
        Path: '/new/path/to/file.pdf',
        PreSignedGET: {
          Url: 'https://example.com/new-file.pdf',
        },
        Previews: [
          {
            ContentType: 'image/png',
            PreSignedGET: {
              Url: 'https://example.com/new-preview.png',
            },
            Processing: false,
            Error: undefined,
          },
        ],
      };

      mockCellsRepository.getNode.mockResolvedValueOnce(mockNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.src).toBe('https://example.com/file.pdf');
      });

      // Update mock and force refetch
      mockCellsRepository.getNode.mockResolvedValueOnce(updatedNode);

      await act(async () => {
        await result.current.fetchData(true);
      });

      await waitFor(() => {
        expect(result.current.src).toBe('https://example.com/new-file.pdf');
        expect(result.current.imagePreviewUrl).toBe('https://example.com/new-preview.png');
        expect(result.current.path).toBe('/new/path/to/file.pdf');
      });
    });
  });

  describe('disabled state', () => {
    it('should not fetch data when isEnabled is false', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: false,
          retryPreviewUntilSuccess: false,
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCellsRepository.getNode).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should set error state when fetch fails', async () => {
      mockCellsRepository.getNode.mockRejectedValue(new Error('Network error'));

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should allow retry after error with forceRefetch', async () => {
      mockCellsRepository.getNode.mockRejectedValueOnce(new Error('Network error'));

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Retry with successful response
      mockCellsRepository.getNode.mockResolvedValueOnce(mockNode);

      await act(async () => {
        await result.current.fetchData(true);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
        expect(result.current.src).toBe('https://example.com/file.pdf');
      });
    });
  });

  describe('preview retry logic', () => {
    it('should return immediately when retryPreviewUntilSuccess is false', async () => {
      const processingNode: RestNode = {
        ...mockNode,
        Previews: [
          {
            ContentType: 'image/png',
            PreSignedGET: {
              Url: 'https://example.com/preview.png',
            },
            Processing: true,
            Error: undefined,
          },
        ],
      };

      mockCellsRepository.getNode.mockResolvedValue(processingNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should only call once, no retries
      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      expect(result.current.imagePreviewUrl).toBe('https://example.com/preview.png');
    });

    it('should retry when preview is processing and retryPreviewUntilSuccess is true', async () => {
      const processingNode: RestNode = {
        ...mockNode,
        Previews: [
          {
            ContentType: 'image/png',
            PreSignedGET: {
              Url: 'https://example.com/preview.png',
            },
            Processing: true,
            Error: undefined,
          },
        ],
      };

      const readyNode: RestNode = {
        ...mockNode,
        Previews: [
          {
            ContentType: 'image/png',
            PreSignedGET: {
              Url: 'https://example.com/preview.png',
            },
            Processing: false,
            Error: undefined,
          },
        ],
      };

      mockCellsRepository.getNode.mockResolvedValueOnce(processingNode).mockResolvedValueOnce(readyNode);

      const {result} = renderHook(() =>
        useGetMultipartAsset({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
          isEnabled: true,
          retryPreviewUntilSuccess: true,
          retryDelay: 100,
        }),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      });

      // Wait for retry
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(2);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.imagePreviewUrl).toBe('https://example.com/preview.png');
      });
    });
  });
});
