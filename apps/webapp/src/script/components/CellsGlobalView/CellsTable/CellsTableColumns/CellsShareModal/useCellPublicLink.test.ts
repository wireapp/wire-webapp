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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {useCellPublicLink} from './useCellPublicLink';

jest.mock('src/script/Config', () => ({
  Config: {
    getConfig: () => ({
      CELLS_PYDIO_URL: 'https://cells.example.com',
    }),
  },
}));

const mockSetPublicLink = jest.fn();
let mockNodes: CellNode[] = [];

jest.mock('../../../common/useCellsStore/useCellsStore', () => ({
  useCellsStore: () => ({
    nodes: mockNodes,
    setPublicLink: mockSetPublicLink,
  }),
}));

describe('useCellPublicLink', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;

  const createMockNode = (overrides: Partial<CellNode> = {}): CellNode => ({
    id: 'test-uuid',
    name: 'test-file.pdf',
    path: '/test/test-file.pdf',
    mimeType: 'application/pdf',
    sizeMb: '1.5',
    extension: 'pdf',
    uploadedAtTimestamp: Date.now(),
    owner: 'test-owner',
    conversationName: 'Test Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    type: CellNodeType.FILE,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCellsRepository = {
      createPublicLink: jest.fn(),
      getPublicLink: jest.fn(),
      deletePublicLink: jest.fn(),
      updatePublicLink: jest.fn(),
    } as unknown as jest.Mocked<CellsRepository>;

    mockNodes = [createMockNode()];
  });

  describe('should create a public link when toggle is enabled', () => {
    it('creates a public link and updates store', async () => {
      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: 'new-link-uuid',
        LinkUrl: '/public/test-link',
      });

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockCellsRepository.createPublicLink).toHaveBeenCalledWith({
        uuid: 'test-uuid',
        link: {
          Label: 'test-file.pdf',
          Permissions: ['Preview', 'Download'],
        },
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith('test-uuid', {
        uuid: 'new-link-uuid',
        url: 'https://cells.example.com/public/test-link',
        alreadyShared: true,
      });
    });
  });

  describe('should delete a public link when toggle is disabled', () => {
    it('deletes an existing public link when toggled off', async () => {
      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/existing-link',
          },
        }),
      ];

      mockCellsRepository.deletePublicLink.mockResolvedValue({});

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      expect(result.current.isEnabled).toBe(true);

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(false);

      await waitFor(() => {
        expect(mockCellsRepository.deletePublicLink).toHaveBeenCalledWith({
          uuid: 'existing-link-uuid',
        });
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith('test-uuid', undefined);
    });
  });

  describe('should delete a newly created link when toggle is immediately disabled', () => {
    it('uses createdLinkUuid ref to delete link when state has not propagated yet', async () => {
      mockNodes = [createMockNode()];

      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: 'newly-created-uuid',
        LinkUrl: '/public/new-link',
      });

      mockCellsRepository.deletePublicLink.mockResolvedValue({});

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(mockCellsRepository.createPublicLink).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'newly-created-uuid',
            url: 'https://cells.example.com/public/new-link',
          },
        }),
      ];

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(false);

      await waitFor(() => {
        expect(mockCellsRepository.deletePublicLink).toHaveBeenCalledWith({
          uuid: 'newly-created-uuid',
        });
      });
    });

    it('handles rapid toggle on/off using createdLinkUuid ref when node state is stale', async () => {
      mockNodes = [createMockNode()];

      let createResolve: (value: {Uuid: string; LinkUrl: string}) => void;
      const createPromise = new Promise<{Uuid: string; LinkUrl: string}>(resolve => {
        createResolve = resolve;
      });

      mockCellsRepository.createPublicLink.mockReturnValue(createPromise);
      mockCellsRepository.deletePublicLink.mockResolvedValue({});

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      act(() => {
        result.current.togglePublicLink();
      });

      expect(mockCellsRepository.createPublicLink).toHaveBeenCalled();

      await act(async () => {
        createResolve!({Uuid: 'rapid-toggle-uuid', LinkUrl: '/public/rapid-link'});
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'rapid-toggle-uuid',
            url: 'https://cells.example.com/public/rapid-link',
          },
        }),
      ];

      act(() => {
        result.current.togglePublicLink();
      });

      // The hook should use createdLinkUuid.current (or node.publicLink.uuid) to delete
      await waitFor(() => {
        expect(mockCellsRepository.deletePublicLink).toHaveBeenCalledWith({
          uuid: 'rapid-toggle-uuid',
        });
      });
    });
  });

  describe('should fetch existing link data when toggle is enabled on already shared node', () => {
    it('fetches existing link data instead of creating a new one', async () => {
      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/existing-link',
          },
        }),
      ];

      mockCellsRepository.getPublicLink.mockResolvedValue({
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
        Label: 'test-file.pdf',
      });

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(mockCellsRepository.getPublicLink).toHaveBeenCalledWith({
          uuid: 'existing-link-uuid',
        });
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.linkData).toEqual({
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
        Label: 'test-file.pdf',
      });

      expect(mockCellsRepository.createPublicLink).not.toHaveBeenCalled();
    });

    it('does not re-fetch if link was already fetched', async () => {
      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/existing-link',
          },
        }),
      ];

      mockCellsRepository.getPublicLink.mockResolvedValue({
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
      });

      const {result, rerender} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockCellsRepository.getPublicLink).toHaveBeenCalledTimes(1);

      rerender();

      expect(mockCellsRepository.getPublicLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('should handle errors during link creation', () => {
    it('sets error status when createPublicLink fails', async () => {
      mockNodes = [createMockNode()];

      mockCellsRepository.createPublicLink.mockRejectedValue(new Error('Network error'));

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith('test-uuid', undefined);
    });

    it('sets error status when link response is missing required fields', async () => {
      mockNodes = [createMockNode()];

      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: undefined,
        LinkUrl: undefined,
      } as any);

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith('test-uuid', undefined);
    });
  });

  describe('should handle errors during link deletion', () => {
    it('sets error status when deletePublicLink fails', async () => {
      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/existing-link',
          },
        }),
      ];

      mockCellsRepository.deletePublicLink.mockRejectedValue(new Error('Delete failed'));

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      expect(result.current.isEnabled).toBe(true);

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
    });
  });

  describe('updatePublicLink', () => {
    it('updates public link with password and access end', async () => {
      mockNodes = [
        createMockNode({
          publicLink: {
            alreadyShared: true,
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/existing-link',
          },
        }),
      ];

      const existingLink = {
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
        PasswordRequired: false,
      };

      mockCellsRepository.getPublicLink.mockResolvedValue(existingLink);
      mockCellsRepository.updatePublicLink.mockResolvedValue({} as any);

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      await act(async () => {
        await result.current.updatePublicLink({
          password: 'secret123',
          passwordEnabled: true,
          accessEnd: '2025-12-31T23:59:59Z',
        });
      });

      expect(mockCellsRepository.updatePublicLink).toHaveBeenCalledWith({
        linkUuid: 'existing-link-uuid',
        link: {
          ...existingLink,
          PasswordRequired: true,
          AccessEnd: '2025-12-31T23:59:59Z',
        },
        createPassword: 'secret123',
        passwordEnabled: true,
      });
    });

    it('throws error when updating without existing public link', async () => {
      mockNodes = [createMockNode()];

      const {result} = renderHook(() =>
        useCellPublicLink({
          uuid: 'test-uuid',
          cellsRepository: mockCellsRepository,
        }),
      );

      await expect(
        result.current.updatePublicLink({
          password: 'secret123',
          passwordEnabled: true,
        }),
      ).rejects.toThrow('No public link to update');
    });
  });
});
