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

describe('useCellPublicLink', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;
  let mockNode: CellNode | undefined;
  const mockSetPublicLink = jest.fn();

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

  const renderPublicLinkHook = (options?: {
    node?: CellNode;
    refreshLinkDataAfterUpdate?: boolean;
    setStatusOnPublicLinkUrl?: boolean;
  }) => {
    const initialProps = {
      node: options?.node ?? mockNode,
      refreshLinkDataAfterUpdate: options?.refreshLinkDataAfterUpdate ?? false,
      setStatusOnPublicLinkUrl: options?.setStatusOnPublicLinkUrl ?? false,
    };

    const hook = renderHook(
      ({node, refreshLinkDataAfterUpdate, setStatusOnPublicLinkUrl}) =>
        useCellPublicLink({
          uuid: 'test-uuid',
          node,
          cellsRepository: mockCellsRepository,
          setPublicLink: mockSetPublicLink,
          refreshLinkDataAfterUpdate,
          setStatusOnPublicLinkUrl,
        }),
      {initialProps},
    );

    const rerenderWith = (props: Partial<typeof initialProps>) =>
      hook.rerender({
        node: props.node ?? initialProps.node,
        refreshLinkDataAfterUpdate: props.refreshLinkDataAfterUpdate ?? initialProps.refreshLinkDataAfterUpdate,
        setStatusOnPublicLinkUrl: props.setStatusOnPublicLinkUrl ?? initialProps.setStatusOnPublicLinkUrl,
      });

    return {...hook, rerenderWith};
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCellsRepository = {
      createPublicLink: jest.fn(),
      getPublicLink: jest.fn(),
      deletePublicLink: jest.fn(),
      updatePublicLink: jest.fn(),
    } as unknown as jest.Mocked<CellsRepository>;

    mockNode = createMockNode();
  });

  describe('should create a public link when toggle is enabled', () => {
    it('creates a public link and updates store', async () => {
      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: 'new-link-uuid',
        LinkUrl: '/public/test-link',
      });

      const {result} = renderPublicLinkHook();

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

      expect(mockSetPublicLink).toHaveBeenCalledWith({
        uuid: 'new-link-uuid',
        url: 'https://cells.example.com/public/test-link',
        alreadyShared: true,
      });
    });
  });

  describe('should delete a public link when toggle is disabled', () => {
    it('deletes an existing public link when toggled off', async () => {
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      mockCellsRepository.deletePublicLink.mockResolvedValue({});

      const {result} = renderPublicLinkHook({node: mockNode});

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

      expect(mockSetPublicLink).toHaveBeenCalledWith(undefined);
    });
  });

  describe('should delete a newly created link when toggle is immediately disabled', () => {
    it('uses createdLinkUuid ref to delete link when state has not propagated yet', async () => {
      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: 'newly-created-uuid',
        LinkUrl: '/public/new-link',
      });

      mockCellsRepository.deletePublicLink.mockResolvedValue({});

      const {result, rerenderWith} = renderPublicLinkHook();

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

      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'newly-created-uuid',
          url: 'https://cells.example.com/public/new-link',
        },
      });

      rerenderWith({node: mockNode});

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
  });

  describe('should delete the newly created link UUID when disabling after re-enabling an already shared file', () => {
    it('uses the new link UUID from re-enable when deleting, not the original stale UUID', async () => {
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'old-link-uuid',
          url: 'https://cells.example.com/public/old-link',
        },
      });

      mockCellsRepository.deletePublicLink.mockResolvedValue({});
      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: 'new-link-uuid',
        LinkUrl: '/public/new-link',
      });
      mockCellsRepository.getPublicLink.mockResolvedValue({
        Uuid: 'old-link-uuid',
        LinkUrl: '/public/old-link',
      });

      const {result, rerenderWith} = renderPublicLinkHook({node: mockNode});

      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(false);

      await waitFor(() => {
        expect(mockCellsRepository.deletePublicLink).toHaveBeenCalledWith({
          uuid: 'old-link-uuid',
        });
      });

      mockNode = createMockNode();

      rerenderWith({node: mockNode});
      mockCellsRepository.deletePublicLink.mockClear();

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

      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'new-link-uuid',
          url: 'https://cells.example.com/public/new-link',
        },
      });

      rerenderWith({node: mockNode});

      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(false);

      await waitFor(() => {
        expect(mockCellsRepository.deletePublicLink).toHaveBeenCalledWith({
          uuid: 'new-link-uuid',
        });
      });

      expect(mockCellsRepository.deletePublicLink).not.toHaveBeenCalledWith({
        uuid: 'old-link-uuid',
      });
    });
  });

  describe('should fetch existing link data when toggle is enabled on already shared node', () => {
    it('fetches existing link data instead of creating a new one', async () => {
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      mockCellsRepository.getPublicLink.mockResolvedValue({
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
        Label: 'test-file.pdf',
      });

      const {result} = renderPublicLinkHook({node: mockNode});

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
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      mockCellsRepository.getPublicLink.mockResolvedValue({
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
      });

      const {result, rerenderWith} = renderPublicLinkHook({node: mockNode});

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockCellsRepository.getPublicLink).toHaveBeenCalledTimes(1);

      rerenderWith({node: mockNode});

      expect(mockCellsRepository.getPublicLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('should handle errors during link creation', () => {
    it('sets error status when createPublicLink fails', async () => {
      mockCellsRepository.createPublicLink.mockRejectedValue(new Error('Network error'));

      const {result} = renderPublicLinkHook();

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith(undefined);
    });

    it('sets error status when link response is missing required fields', async () => {
      mockCellsRepository.createPublicLink.mockResolvedValue({
        Uuid: undefined,
        LinkUrl: undefined,
      } as any);

      const {result} = renderPublicLinkHook();

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith(undefined);
    });
  });

  describe('should handle errors during link deletion', () => {
    it('sets error status when deletePublicLink fails', async () => {
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      mockCellsRepository.deletePublicLink.mockRejectedValue(new Error('Delete failed'));

      const {result} = renderPublicLinkHook({node: mockNode});

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
      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      const existingLink = {
        Uuid: 'existing-link-uuid',
        LinkUrl: '/public/existing-link',
        PasswordRequired: false,
      };

      mockCellsRepository.getPublicLink.mockResolvedValue(existingLink);
      mockCellsRepository.updatePublicLink.mockResolvedValue({} as any);

      const {result} = renderPublicLinkHook({node: mockNode, refreshLinkDataAfterUpdate: true});

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

      expect(mockCellsRepository.getPublicLink).toHaveBeenCalledWith({
        uuid: 'existing-link-uuid',
      });
    });

    it('throws error when updating without existing public link', async () => {
      const {result} = renderPublicLinkHook();

      await expect(
        result.current.updatePublicLink({
          password: 'secret123',
          passwordEnabled: true,
        }),
      ).rejects.toThrow('No public link to update');
    });
  });

  describe('setStatusOnPublicLinkUrl', () => {
    it('sets success when public link url appears and flag is enabled', async () => {
      const {result, rerenderWith} = renderPublicLinkHook({setStatusOnPublicLinkUrl: true});

      expect(result.current.status).toBe('idle');

      mockNode = createMockNode({
        publicLink: {
          alreadyShared: true,
          uuid: 'existing-link-uuid',
          url: 'https://cells.example.com/public/existing-link',
        },
      });

      rerenderWith({node: mockNode, setStatusOnPublicLinkUrl: true});

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });
    });
  });
});
