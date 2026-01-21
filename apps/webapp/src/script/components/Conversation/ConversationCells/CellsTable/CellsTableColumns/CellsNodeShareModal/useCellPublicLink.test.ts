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

import {renderHook, act, waitFor} from '@testing-library/react';

import {useCellPublicLink} from './useCellPublicLink';

// Mock dependencies
const mockGetNodes = jest.fn();
const mockSetPublicLink = jest.fn();

jest.mock('../../../common/useCellsStore/useCellsStore', () => ({
  useCellsStore: () => ({
    getNodes: mockGetNodes,
    setPublicLink: mockSetPublicLink,
  }),
}));

jest.mock('src/script/Config', () => ({
  Config: {
    getConfig: () => ({
      CELLS_PYDIO_URL: 'https://cells.example.com',
    }),
  },
}));

// Mock CellsRepository methods
const mockCreatePublicLink = jest.fn();
const mockGetPublicLink = jest.fn();
const mockDeletePublicLink = jest.fn();

const mockCellsRepository = {
  createPublicLink: mockCreatePublicLink,
  getPublicLink: mockGetPublicLink,
  deletePublicLink: mockDeletePublicLink,
} as any;

describe('useCellPublicLink', () => {
  const testUuid = 'test-node-uuid';
  const testConversationId = 'test-conversation-id';

  const defaultProps = {
    uuid: testUuid,
    conversationId: testConversationId,
    cellsRepository: mockCellsRepository,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: node without public link
    mockGetNodes.mockReturnValue([
      {
        id: testUuid,
        name: 'test-file.txt',
        publicLink: undefined,
      },
    ]);
  });

  describe('should create a public link when toggle is enabled', () => {
    it('creates public link and updates store', async () => {
      const mockLinkResponse = {
        Uuid: 'new-link-uuid',
        LinkUrl: '/public/share/abc123',
        Label: 'test-file.txt',
      };
      mockCreatePublicLink.mockResolvedValue(mockLinkResponse);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Initially disabled
      expect(result.current.isEnabled).toBe(false);
      expect(result.current.status).toBe('idle');

      // Toggle on
      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockCreatePublicLink).toHaveBeenCalledWith({
        uuid: testUuid,
        link: {
          Label: 'test-file.txt',
          Permissions: ['Preview', 'Download'],
        },
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith({
        conversationId: testConversationId,
        nodeId: testUuid,
        data: {
          uuid: 'new-link-uuid',
          url: 'https://cells.example.com/public/share/abc123',
          alreadyShared: true,
        },
      });
    });
  });

  describe('should delete a public link when toggle is disabled', () => {
    it('deletes public link and clears store', async () => {
      // Node with existing public link
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/share/existing',
            alreadyShared: true,
          },
        },
      ]);

      mockDeletePublicLink.mockResolvedValue(undefined);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Initially enabled because node has public link
      expect(result.current.isEnabled).toBe(true);

      // Toggle off
      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.isEnabled).toBe(false);

      await waitFor(() => {
        expect(mockDeletePublicLink).toHaveBeenCalledWith({uuid: 'existing-link-uuid'});
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith({
        conversationId: testConversationId,
        nodeId: testUuid,
        data: undefined,
      });
    });
  });

  describe('should delete a newly created link when toggle is immediately disabled', () => {
    it('uses createdLinkUuid ref to delete link before state propagates', async () => {
      // Node without public link initially
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: undefined,
        },
      ]);

      const mockLinkResponse = {
        Uuid: 'newly-created-uuid',
        LinkUrl: '/public/share/new123',
      };

      // Create resolves, but we'll toggle off before the store updates
      mockCreatePublicLink.mockResolvedValue(mockLinkResponse);
      mockDeletePublicLink.mockResolvedValue(undefined);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Toggle on - start creation
      act(() => {
        result.current.togglePublicLink();
      });

      // Wait for creation to complete
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Now simulate the node store being updated with the new link
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'newly-created-uuid',
            url: 'https://cells.example.com/public/share/new123',
            alreadyShared: true,
          },
        },
      ]);

      // Toggle off immediately after creation
      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(mockDeletePublicLink).toHaveBeenCalledWith({uuid: 'newly-created-uuid'});
      });

      // Verify the deletion clears the store
      expect(mockSetPublicLink).toHaveBeenLastCalledWith({
        conversationId: testConversationId,
        nodeId: testUuid,
        data: undefined,
      });
    });

    it('uses createdLinkUuid ref as fallback when node.publicLink is not yet updated', async () => {
      // Node without public link
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: undefined,
        },
      ]);

      const mockLinkResponse = {
        Uuid: 'immediate-delete-uuid',
        LinkUrl: '/public/share/immediate',
      };

      let createResolve: (value: any) => void;
      const createPromise = new Promise(resolve => {
        createResolve = resolve;
      });
      mockCreatePublicLink.mockReturnValue(createPromise);
      mockDeletePublicLink.mockResolvedValue(undefined);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Toggle on - start creation
      act(() => {
        result.current.togglePublicLink();
      });

      expect(result.current.status).toBe('loading');

      // Resolve the creation - this sets createdLinkUuid.current
      await act(async () => {
        createResolve!(mockLinkResponse);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Simulate store update
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'immediate-delete-uuid',
            url: 'https://cells.example.com/public/share/immediate',
            alreadyShared: true,
          },
        },
      ]);

      // Toggle off
      act(() => {
        result.current.togglePublicLink();
      });

      // The delete should use the createdLinkUuid or node.publicLink.uuid
      await waitFor(() => {
        expect(mockDeletePublicLink).toHaveBeenCalledWith({uuid: 'immediate-delete-uuid'});
      });
    });
  });

  describe('should fetch existing link data when toggle is enabled on already shared node', () => {
    it('fetches link details for already shared node', async () => {
      // Node with alreadyShared flag but needs fetching
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'existing-uuid',
            alreadyShared: true,
          },
        },
      ]);

      const mockLinkDetails = {
        Uuid: 'existing-uuid',
        LinkUrl: '/public/share/existing',
        Label: 'test-file.txt',
        PasswordRequired: false,
      };
      mockGetPublicLink.mockResolvedValue(mockLinkDetails);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Already enabled due to alreadyShared
      expect(result.current.isEnabled).toBe(true);

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockGetPublicLink).toHaveBeenCalledWith({uuid: 'existing-uuid'});

      expect(mockSetPublicLink).toHaveBeenCalledWith({
        conversationId: testConversationId,
        nodeId: testUuid,
        data: {
          uuid: 'existing-uuid',
          url: 'https://cells.example.com/public/share/existing',
          alreadyShared: true,
        },
      });

      expect(result.current.linkData).toEqual(mockLinkDetails);
    });
  });

  describe('should handle errors during link creation', () => {
    it('sets error status and clears store on creation failure', async () => {
      mockCreatePublicLink.mockRejectedValue(new Error('Creation failed'));

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Toggle on
      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith({
        conversationId: testConversationId,
        nodeId: testUuid,
        data: undefined,
      });
    });

    it('handles missing LinkUrl in response', async () => {
      mockCreatePublicLink.mockResolvedValue({
        Uuid: 'uuid-only',
        // Missing LinkUrl
      });

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
    });

    it('handles missing Uuid in response', async () => {
      mockCreatePublicLink.mockResolvedValue({
        LinkUrl: '/public/share/no-uuid',
        // Missing Uuid
      });

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
    });
  });

  describe('should handle errors during link deletion', () => {
    it('sets error status on deletion failure', async () => {
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/share/existing',
            alreadyShared: true,
          },
        },
      ]);

      mockDeletePublicLink.mockRejectedValue(new Error('Deletion failed'));

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      expect(result.current.isEnabled).toBe(true);

      // Toggle off
      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(mockDeletePublicLink).toHaveBeenCalledWith({uuid: 'existing-link-uuid'});
    });
  });

  describe('should pass conversationId to store operations', () => {
    it('passes conversationId when creating public link', async () => {
      const customConversationId = 'custom-conversation-123';

      mockCreatePublicLink.mockResolvedValue({
        Uuid: 'link-uuid',
        LinkUrl: '/public/share/test',
      });

      const {result} = renderHook(() =>
        useCellPublicLink({
          ...defaultProps,
          conversationId: customConversationId,
        }),
      );

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: customConversationId,
        }),
      );
    });

    it('passes conversationId when deleting public link', async () => {
      const customConversationId = 'custom-conversation-456';

      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'existing-link-uuid',
            url: 'https://cells.example.com/public/share/existing',
            alreadyShared: true,
          },
        },
      ]);

      mockDeletePublicLink.mockResolvedValue(undefined);

      const {result} = renderHook(() =>
        useCellPublicLink({
          ...defaultProps,
          conversationId: customConversationId,
        }),
      );

      act(() => {
        result.current.togglePublicLink();
      });

      await waitFor(() => {
        expect(mockDeletePublicLink).toHaveBeenCalled();
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: customConversationId,
        }),
      );
    });

    it('passes conversationId when fetching existing link', async () => {
      const customConversationId = 'custom-conversation-789';

      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'existing-uuid',
            alreadyShared: true,
          },
        },
      ]);

      mockGetPublicLink.mockResolvedValue({
        Uuid: 'existing-uuid',
        LinkUrl: '/public/share/existing',
      });

      const {result} = renderHook(() =>
        useCellPublicLink({
          ...defaultProps,
          conversationId: customConversationId,
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockSetPublicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: customConversationId,
        }),
      );
    });

    it('uses getNodes with conversationId to find the node', () => {
      const customConversationId = 'get-nodes-test-conversation';

      renderHook(() =>
        useCellPublicLink({
          ...defaultProps,
          conversationId: customConversationId,
        }),
      );

      expect(mockGetNodes).toHaveBeenCalledWith({conversationId: customConversationId});
    });
  });

  describe('additional edge cases', () => {
    it('does not delete when no link uuid exists', async () => {
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            // No uuid, but has url (edge case)
            url: 'https://cells.example.com/public/share/orphan',
            alreadyShared: false,
          },
        },
      ]);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      // Start enabled because there's a url
      expect(result.current.isEnabled).toBe(false);

      // Manually enable then disable
      act(() => {
        result.current.togglePublicLink();
      });

      // Wait briefly
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Delete should not be called since there's no uuid
      expect(mockDeletePublicLink).not.toHaveBeenCalled();
    });

    it('returns link url from node.publicLink', async () => {
      mockGetNodes.mockReturnValue([
        {
          id: testUuid,
          name: 'test-file.txt',
          publicLink: {
            uuid: 'test-uuid',
            url: 'https://cells.example.com/public/share/test-link',
            alreadyShared: true,
          },
        },
      ]);

      mockGetPublicLink.mockResolvedValue({
        Uuid: 'test-uuid',
        LinkUrl: '/public/share/test-link',
      });

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      expect(result.current.link).toBe('https://cells.example.com/public/share/test-link');
    });

    it('handles node not found in store', () => {
      mockGetNodes.mockReturnValue([]);

      const {result} = renderHook(() => useCellPublicLink(defaultProps));

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.status).toBe('idle');
      expect(result.current.link).toBeUndefined();
    });
  });
});
