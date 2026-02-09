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

import {render, screen, waitFor, act} from '@testing-library/react';
import {RestNode} from 'cells-sdk-ts';

import {ICellAsset} from '@wireapp/protocol-messaging';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {MultipartAssets} from './MultipartAssets';

jest.mock('Hooks/useInView/useInView', () => ({
  useInView: () => ({
    elementRef: {current: null},
    hasBeenInView: true,
  }),
}));

const mockNode: RestNode = {
  Path: '/path/to/test.pdf',
  Uuid: 'test-uuid',
  IsRecycled: false,
  PreSignedGET: {
    Url: 'https://example.com/file.pdf',
  },
  Previews: [],
};

const mockRecycledNode: RestNode = {
  ...mockNode,
  IsRecycled: true,
};

describe('MultipartAssets', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      getNode: jest.fn(),
    } as unknown as jest.Mocked<CellsRepository>;
  });

  const createMockAsset = (uuid: string, contentType: string, initialName: string): ICellAsset => ({
    uuid,
    initialName,
    initialSize: 1024,
    contentType,
  });

  describe('isRecycled state rendering', () => {
    it('should display unavailable file message for recycled files', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockRecycledNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(screen.getByText('cells.unavailableFile')).toBeInTheDocument();
      });
    });

    it('should render normal file card for non-recycled files', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledWith({uuid: 'test-uuid'});
      });

      expect(screen.queryByText('cells.unavailableFile')).not.toBeInTheDocument();
    });

    it('should render multiple assets with mixed recycled state', async () => {
      mockCellsRepository.getNode
        .mockResolvedValueOnce(mockNode)
        .mockResolvedValueOnce(mockRecycledNode)
        .mockResolvedValueOnce(mockNode);

      const assets: ICellAsset[] = [
        createMockAsset('uuid-1', 'application/pdf', 'file1.pdf'),
        createMockAsset('uuid-2', 'application/pdf', 'file2.pdf'),
        createMockAsset('uuid-3', 'application/pdf', 'file3.pdf'),
      ];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        const unavailableMessages = screen.getAllByText('cells.unavailableFile');
        expect(unavailableMessages).toHaveLength(1);
      });
    });
  });

  describe('hash change listener', () => {
    beforeEach(() => {
      // Reset window.location.hash
      window.location.hash = '';
    });

    it('should trigger refetch when hash changes within the same conversation', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalled();
      });

      const callsBeforeHashChange = mockCellsRepository.getNode.mock.calls.length;

      // Simulate hash change within the same conversation
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(mockCellsRepository.getNode.mock.calls.length).toBeGreaterThan(callsBeforeHashChange);
      });
    });

    it('should NOT trigger refetch when navigating to /files view', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      });

      // Simulate hash change to /files view
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/files';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      // Wait a bit to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger refetch when navigating to different conversation', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      });

      // Simulate hash change to different conversation
      await act(async () => {
        window.location.hash = '#/conversation/conv-456/section';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      // Wait a bit to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple hash changes within same conversation', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      });

      const initialCalls = mockCellsRepository.getNode.mock.calls.length;

      // First hash change
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section1';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(mockCellsRepository.getNode.mock.calls.length).toBeGreaterThan(initialCalls);
      });

      const callsAfterFirst = mockCellsRepository.getNode.mock.calls.length;

      // Second hash change
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section2';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(mockCellsRepository.getNode.mock.calls.length).toBeGreaterThan(callsAfterFirst);
      });
    });

    it('should clean up hash change listener on unmount', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      const {unmount} = render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Simulate hash change after unmount
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      // Wait a bit to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not trigger additional fetch after unmount
      expect(mockCellsRepository.getNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('forceRefetch integration', () => {
    it('should pass forceRefetch=true to fetchData when hash changes', async () => {
      const initialNode = {...mockNode, Path: '/old/path/test.pdf'};
      const updatedNode = {...mockNode, Path: '/new/path/test.pdf'};

      mockCellsRepository.getNode.mockResolvedValueOnce(initialNode).mockResolvedValueOnce(updatedNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(mockCellsRepository.getNode).toHaveBeenCalled();
      });

      const callsBeforeHashChange = mockCellsRepository.getNode.mock.calls.length;

      // Simulate hash change
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(mockCellsRepository.getNode.mock.calls.length).toBeGreaterThan(callsBeforeHashChange);
      });
    });

    it('should update from non-recycled to recycled state on hash change refetch', async () => {
      mockCellsRepository.getNode.mockResolvedValueOnce(mockNode).mockResolvedValueOnce(mockRecycledNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'application/pdf', 'test.pdf')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(screen.queryByText('cells.unavailableFile')).not.toBeInTheDocument();
      });

      // Simulate hash change
      await act(async () => {
        window.location.hash = '#/conversation/conv-123/section';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      await waitFor(() => {
        expect(screen.getByText('cells.unavailableFile')).toBeInTheDocument();
      });
    });
  });

  describe('different asset types', () => {
    it('should render unavailable message for recycled image assets', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockRecycledNode);

      const assets: ICellAsset[] = [
        {
          ...createMockAsset('test-uuid', 'image/png', 'test.png'),
          image: {width: 100, height: 100},
        },
      ];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(screen.getByText('cells.unavailableFile')).toBeInTheDocument();
      });
    });

    it('should render unavailable message for recycled video assets', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockRecycledNode);

      const assets: ICellAsset[] = [createMockAsset('test-uuid', 'video/mp4', 'test.mp4')];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(screen.getByText('cells.unavailableFile')).toBeInTheDocument();
      });
    });

    it('should render a file card for non-previewable image formats', async () => {
      mockCellsRepository.getNode.mockResolvedValue(mockNode);

      const assets: ICellAsset[] = [
        {
          ...createMockAsset('test-uuid', 'image/heic', 'sample.heic'),
          image: {width: 100, height: 100},
        },
      ];

      render(
        withTheme(
          <MultipartAssets
            assets={assets}
            conversationId="conv-123"
            cellsRepository={mockCellsRepository}
            senderName="John Doe"
            timestamp={Date.now()}
          />,
        ),
      );

      await waitFor(() => {
        expect(screen.getByText('sample')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('accessibility.conversationAssetImageAlt')).not.toBeInTheDocument();
    });
  });
});
