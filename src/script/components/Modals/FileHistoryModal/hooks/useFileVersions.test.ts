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

import {renderHook, waitFor, act} from '@testing-library/react';

import {useFileVersions} from './useFileVersions';

// Mock the dependencies
const mockGetNode = jest.fn();
const mockGetNodeVersions = jest.fn();
const mockPromoteNodeDraft = jest.fn();
const mockForcedDownloadFile = jest.fn();

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(() => ({
      getNode: mockGetNode,
      getNodeVersions: mockGetNodeVersions,
      promoteNodeDraft: mockPromoteNodeDraft,
    })),
  },
  singleton: () => () => {},
  injectable: () => () => {},
}));

jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string) => key,
}));

jest.mock('Util/util', () => ({
  forcedDownloadFile: (args: any) => mockForcedDownloadFile(args),
  getFileExtension: (path: string) => {
    const match = path.match(/\.([^.]+)$/);
    return match ? match[1] : '';
  },
  getName: (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1].replace(/\.[^.]+$/, '');
  },
}));

jest.mock('../utils/fileVersionUtils', () => ({
  groupVersionsByDate: (versions: any[]) => {
    if (!versions || versions.length === 0) {
      return {};
    }
    return {Today: versions};
  },
}));

describe('useFileVersions', () => {
  const mockNode = {
    Path: '/test/document.txt',
    PreSignedGET: {
      Url: 'https://example.com/file.txt',
    },
  };

  const mockVersions = [
    {
      VersionId: 'version-1',
      Timestamp: '2025-12-09T10:00:00Z',
      PreSignedGET: {
        Url: 'https://example.com/version-1.txt',
      },
    },
    {
      VersionId: 'version-2',
      Timestamp: '2025-12-08T10:00:00Z',
      PreSignedGET: {
        Url: 'https://example.com/version-2.txt',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNode.mockResolvedValue(mockNode);
    mockGetNodeVersions.mockResolvedValue(mockVersions);
    mockPromoteNodeDraft.mockResolvedValue(undefined);
    mockForcedDownloadFile.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const {result} = renderHook(() => useFileVersions());

      expect(result.current.fileInfo).toBeUndefined();
      expect(result.current.fileVersions).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.toBeRestoredVersionId).toBeUndefined();
    });

    it('should not load versions when nodeUuid is not provided', () => {
      renderHook(() => useFileVersions());

      expect(mockGetNode).not.toHaveBeenCalled();
      expect(mockGetNodeVersions).not.toHaveBeenCalled();
    });
  });

  describe('Loading File Versions', () => {
    it('should load file info and versions when nodeUuid is provided', async () => {
      const {result} = renderHook(() => useFileVersions('test-uuid'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNode).toHaveBeenCalledWith({uuid: 'test-uuid'});
      expect(mockGetNodeVersions).toHaveBeenCalledWith({
        uuid: 'test-uuid',
        flags: ['WithPreSignedURLs'],
      });

      expect(result.current.fileInfo).toEqual({
        name: 'document',
        extension: 'txt',
      });
      expect(result.current.fileVersions).toEqual({
        Today: mockVersions,
      });
      expect(result.current.error).toBeUndefined();
    });

    it('should handle error when node data is invalid', async () => {
      mockGetNode.mockResolvedValue({Path: null});

      const {result} = renderHook(() => useFileVersions('test-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('fileHistoryModal.invalidNodeData');
      expect(result.current.fileInfo).toBeUndefined();
      expect(result.current.fileVersions).toEqual({});
    });

    it('should handle error when fetching versions fails', async () => {
      const error = new Error('Network error');
      mockGetNodeVersions.mockRejectedValue(error);

      const {result} = renderHook(() => useFileVersions('test-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should reset state when nodeUuid changes to undefined', async () => {
      const {result, rerender} = renderHook(({uuid}) => useFileVersions(uuid), {
        initialProps: {uuid: 'test-uuid' as string | undefined},
      });

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      rerender({uuid: undefined});

      expect(result.current.fileInfo).toBeUndefined();
      expect(result.current.fileVersions).toEqual({});
    });

    it('should reload versions when nodeUuid changes', async () => {
      const {rerender} = renderHook(({uuid}) => useFileVersions(uuid), {
        initialProps: {uuid: 'test-uuid-1' as string | undefined},
      });

      await waitFor(() => {
        expect(mockGetNode).toHaveBeenCalledWith({uuid: 'test-uuid-1'});
      });

      rerender({uuid: 'test-uuid-2'});

      await waitFor(() => {
        expect(mockGetNode).toHaveBeenCalledWith({uuid: 'test-uuid-2'});
      });

      expect(mockGetNode).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Version Restore', () => {
    it('should restore a file version successfully', async () => {
      const onClose = jest.fn();
      const onRestore = jest.fn();
      const {result} = renderHook(() => useFileVersions('test-uuid', onClose, onRestore));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set version to restore
      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      expect(result.current.toBeRestoredVersionId).toBe('version-1');

      // Trigger restore
      await act(async () => {
        await result.current.handleRestore();
      });

      expect(mockPromoteNodeDraft).toHaveBeenCalledWith({
        uuid: 'test-uuid',
        versionId: 'version-1',
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onRestore).toHaveBeenCalled();
      });

      expect(result.current.toBeRestoredVersionId).toBeUndefined();
      expect(result.current.fileInfo).toBeUndefined();
      expect(result.current.fileVersions).toEqual({});
    });

    it('should not restore when toBeRestoredVersionId is not set', async () => {
      const {result} = renderHook(() => useFileVersions('test-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      expect(mockPromoteNodeDraft).not.toHaveBeenCalled();
    });

    it('should not restore when nodeUuid is not set', async () => {
      const {result} = renderHook(() => useFileVersions());

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      expect(mockPromoteNodeDraft).not.toHaveBeenCalled();
    });

    it('should handle restore error', async () => {
      const error = new Error('Restore failed');
      mockPromoteNodeDraft.mockRejectedValue(error);

      const onClose = jest.fn();
      const onRestore = jest.fn();
      const {result} = renderHook(() => useFileVersions('test-uuid', onClose, onRestore));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      // Callbacks should still be called even on error
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onRestore).toHaveBeenCalled();
      });

      // Error is cleared as part of reset, which is expected behavior
      expect(mockPromoteNodeDraft).toHaveBeenCalled();
    });

    it('should reset all state after successful restore', async () => {
      const onClose = jest.fn();
      const onRestore = jest.fn();
      const {result} = renderHook(() => useFileVersions('test-uuid', onClose, onRestore));

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      await waitFor(() => {
        expect(result.current.fileInfo).toBeUndefined();
        expect(result.current.fileVersions).toEqual({});
        expect(result.current.isLoading).toBe(false);
        expect(result.current.toBeRestoredVersionId).toBeUndefined();
      });
    });
  });

  describe('File Download', () => {
    it('should download file successfully', async () => {
      const {result} = renderHook(() => useFileVersions('test-uuid'));

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      await act(async () => {
        await result.current.handleDownload('https://example.com/file.txt');
      });

      expect(mockForcedDownloadFile).toHaveBeenCalledWith({
        url: 'https://example.com/file.txt',
        name: 'document',
      });
    });

    it('should use default filename when fileInfo is not available', async () => {
      const {result} = renderHook(() => useFileVersions());

      await act(async () => {
        await result.current.handleDownload('https://example.com/file.txt');
      });

      expect(mockForcedDownloadFile).toHaveBeenCalledWith({
        url: 'https://example.com/file.txt',
        name: 'file',
      });
    });
  });

  describe('Callback Handling', () => {
    it('should call onClose callback during reset', async () => {
      const onClose = jest.fn();
      const {result} = renderHook(() => useFileVersions('test-uuid', onClose));

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should call onRestore callback during reset', async () => {
      const onRestore = jest.fn();
      const {result} = renderHook(() => useFileVersions('test-uuid', undefined, onRestore));

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      await act(async () => {
        await result.current.handleRestore();
      });

      await waitFor(() => {
        expect(onRestore).toHaveBeenCalled();
      });
    });

    it('should not throw error when callbacks are not provided', async () => {
      const {result} = renderHook(() => useFileVersions('test-uuid'));

      await waitFor(() => {
        expect(result.current.fileInfo).toBeDefined();
      });

      act(() => {
        result.current.setToBeRestoredVersionId('version-1');
      });

      // Should not throw error
      await act(async () => {
        await result.current.handleRestore();
      });

      expect(result.current.fileInfo).toBeUndefined();
    });
  });
});
