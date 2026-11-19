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

import {act, fireEvent, render, screen, waitFor, type RenderResult} from '@testing-library/react';
import {noop} from 'noop-esm';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {translateForTest} from '../../../../../../util/test/translateForTest';

import {ChatPdfPreviewModal} from './chatPdfPreviewModal';

import type {AssetRemoteData as AssetRemoteDataType} from '../../../../../../repositories/assets/assetRemoteData';

describe('ChatPdfPreviewModal', () => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
  const originalResource = (): AssetRemoteData => {
    return new AssetRemoteData({
      assetKey: 'asset',
      assetDomain: 'wire.test',
      otrKey: new Uint8Array(32),
      sha256: new Uint8Array(32),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn().mockReturnValue('blob:chat-pdf');
    URL.revokeObjectURL = jest.fn();
  });

  const renderModal = (
    props: {
      resource?: AssetRemoteDataType;
      isOpen?: boolean;
      loadAsset?: (resource: AssetRemoteDataType) => Promise<Blob | undefined>;
      onDownload?: () => Promise<void> | void;
      onClose?: () => void;
    } = {},
  ): RenderResult => {
    return render(
      <ChatPdfPreviewModal
        id="chat-pdf-preview"
        fileName="report.pdf"
        resource={props.resource ?? originalResource()}
        isOpen={props.isOpen ?? true}
        loadAsset={props.loadAsset ?? jest.fn().mockResolvedValue(new Blob(['%PDF-1.7 sample']))}
        onDownload={props.onDownload ?? jest.fn()}
        onClose={props.onClose ?? jest.fn()}
        renderPdf={src => {
          return <div data-uie-name="pdf-reader">{src}</div>;
        }}
      />,
      {wrapper},
    );
  };

  it('loads the original PDF for viewing and downloads only after explicit user action', async () => {
    const resource = originalResource();
    const loadAsset = jest.fn().mockResolvedValue(new Blob(['%PDF-1.7 sample']));
    const onDownload = jest.fn();
    renderModal({resource, loadAsset, onDownload});

    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'application/pdf'}));
    });
    expect(await screen.findByTestId('pdf-reader')).toHaveTextContent('blob:chat-pdf');
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(loadAsset.mock.calls[0][0]).not.toBe(resource);
    expect(loadAsset.mock.calls[0][0].urlData).toEqual(resource.urlData);
    expect(onDownload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'conversationContextMenuDownload'}));

    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, new Blob(['not a PDF'])])(
    'shows a safe fallback when decrypted content is not a PDF',
    async blob => {
      renderModal({loadAsset: jest.fn().mockResolvedValue(blob)});

      expect(await screen.findByText('pdfViewerErrorTitle')).toBeInTheDocument();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    },
  );

  it('shows a safe fallback when the original asset cannot be decrypted', async () => {
    renderModal({loadAsset: jest.fn().mockRejectedValue(new Error('decryption failed'))});

    expect(await screen.findByText('pdfViewerErrorTitle')).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('cancels only the viewer request and revokes its URL on close', async () => {
    const resource = originalResource();
    const originalCancel = jest.fn();
    resource.cancelDownload = originalCancel;
    let previewResource: AssetRemoteDataType | undefined;
    const loadAsset = jest.fn((request: AssetRemoteDataType) => {
      previewResource = request;
      return Promise.resolve(new Blob(['%PDF-1.7 sample']));
    });
    const {rerender} = renderModal({resource, loadAsset});

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'application/pdf'}));
    });
    rerender(
      <ChatPdfPreviewModal
        id="chat-pdf-preview"
        fileName="report.pdf"
        resource={resource}
        isOpen={false}
        loadAsset={loadAsset}
        onDownload={noop}
        onClose={noop}
        renderPdf={src => {
          return <div data-uie-name="pdf-reader">{src}</div>;
        }}
      />,
    );

    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chat-pdf');
    });
    expect(previewResource).not.toBe(resource);
    expect(previewResource?.cancelDownload).not.toBe(originalCancel);
    expect(originalCancel).not.toHaveBeenCalled();
  });

  it('ignores a viewer request that finishes after the modal closes', async () => {
    let resolve: (blob: Blob) => void = noop;
    let previewResource: AssetRemoteDataType | undefined;
    const cancelPreview = jest.fn();
    const loadAsset = jest.fn((request: AssetRemoteDataType) => {
      previewResource = request;
      request.cancelDownload = cancelPreview;
      return new Promise<Blob>(done => {
        resolve = done;
      });
    });
    const resource = originalResource();
    const {unmount} = renderModal({resource, loadAsset});

    await waitFor(() => {
      expect(loadAsset).toHaveBeenCalledTimes(1);
    });
    unmount();
    expect(cancelPreview).toHaveBeenCalledTimes(1);
    expect(previewResource).not.toBe(resource);
    await act(async () => {
      resolve(new Blob(['%PDF-1.7 sample']));
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const onClose = jest.fn();
    renderModal({onClose});
    await screen.findByRole('dialog', {name: 'report.pdf'});
    expect(screen.getByRole('button', {name: 'modalCloseButton'})).toHaveFocus();

    fireEvent.keyDown(document, {key: 'Escape'});

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
