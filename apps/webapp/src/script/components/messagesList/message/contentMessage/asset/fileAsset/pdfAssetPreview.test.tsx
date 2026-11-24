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

import {useState, type FunctionComponent, type ReactElement} from 'react';

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {noop} from 'noop-esm';
import {container} from 'tsyringe';

import {PdfAssetPreview} from './pdfAssetPreview';
import {PdfModalTestStub} from './pdfModalTestStub';
import {ChatPdfModalToken, type ChatPdfModalComponent} from './chatPdfModal';

import {FileFullscreenModal} from '../../../../../FileFullscreenModal/FileFullscreenModal';

import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {translateForTest} from '../../../../../../util/test/translateForTest';
import {ThemeProvider} from '../../../../../../uiKit/identity/theme/theme';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';

const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {type: 'application/octet-stream'});
const pdf = new Blob(['%PDF-1.7\nvalid test PDF'], {type: 'application/octet-stream'});
const pdfHeaderBytes = new TextEncoder().encode('%PDF-1.7');

interface PreviewHarnessProps {
  FullscreenModalComponent?: ChatPdfModalComponent;
  useRegisteredModal?: boolean;
  thumbnailResource: AssetRemoteData;
  originalResource: AssetRemoteData;
  label: string;
  loadAsset: (resource: AssetRemoteData) => Promise<Blob | undefined>;
  onDownload?: () => Promise<void> | void;
}

const PreviewHarness: FunctionComponent<PreviewHarnessProps> = ({
  FullscreenModalComponent,
  useRegisteredModal = false,
  thumbnailResource,
  originalResource,
  label,
  loadAsset,
  onDownload = noop,
}: PreviewHarnessProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PdfAssetPreview
      FullscreenModalComponent={useRegisteredModal ? undefined : (FullscreenModalComponent ?? PdfModalTestStub)}
      id="pdf-preview"
      thumbnailResource={thumbnailResource}
      originalResource={originalResource}
      label={label}
      fileName="report"
      fileExtension="pdf"
      senderName="Kim Dawson"
      timestamp={1700000000000}
      isOpen={isOpen}
      onOpenPreview={() => {
        return setIsOpen(true);
      }}
      onClose={() => {
        return setIsOpen(false);
      }}
      tabIndex={0}
      loadAsset={loadAsset}
      onDownload={onDownload}
    />
  );
};

describe('PdfAssetPreview', () => {
  const makeResource = (assetKey: string): AssetRemoteData => {
    return new AssetRemoteData({
      assetKey,
      assetDomain: 'wire.test',
      otrKey: new Uint8Array(32),
      sha256: new Uint8Array(32),
    });
  };

  function enterViewport(): void {
    const [callback] = requireValueForTest((IntersectionObserver as jest.Mock).mock.calls.at(-1));
    act(() => {
      return callback([{isIntersecting: true} as IntersectionObserverEntry], {} as IntersectionObserver);
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    URL.revokeObjectURL = jest.fn();
    jest
      .spyOn(URL, 'createObjectURL')
      .mockReset()
      .mockReturnValueOnce('blob:thumbnail')
      .mockReturnValueOnce('blob:pdf');
  });

  afterEach(() => {
    container.reset();
  });

  it('resolves the registered dialog renderer when no viewer adapter is injected', async () => {
    container.registerInstance(ChatPdfModalToken, PdfModalTestStub);
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(pdf);
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
    render(
      <ThemeProvider>
        <PreviewHarness
          useRegisteredModal
          thumbnailResource={makeResource('thumbnail')}
          originalResource={makeResource('original')}
          label="Open report.pdf"
          loadAsset={loadAsset}
        />
      </ThemeProvider>,
      {wrapper},
    );
    enterViewport();

    fireEvent.click(await screen.findByRole('button', {name: 'Open report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    expect(dialog).toHaveAttribute('data-context', 'chat');
    expect(dialog).toHaveAttribute('data-preview-type', 'pdf');
  });

  it('uses the shared dialog and close action when the real viewer is injected', async () => {
    let resolvePdf: (value: Blob | undefined) => void = noop;
    const pendingPdf = new Promise<Blob | undefined>(resolve => {
      resolvePdf = resolve;
    });
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockReturnValue(pendingPdf);
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
    render(
      <ThemeProvider>
        <PreviewHarness
          FullscreenModalComponent={FileFullscreenModal}
          thumbnailResource={makeResource('thumbnail')}
          originalResource={makeResource('original')}
          label="Open report.pdf"
          loadAsset={loadAsset}
        />
      </ThemeProvider>,
      {wrapper},
    );
    enterViewport();

    fireEvent.click(await screen.findByRole('button', {name: 'Open report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    const close = within(dialog).getByRole('button', {name: 'cells.imageFullScreenModal.closeButton'});
    expect(within(dialog).getByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'})).toBeEnabled();
    fireEvent.click(close);
    await act(async () => {
      resolvePdf(pdf);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', {name: 'report.pdf'})).not.toBeInTheDocument();
    });
  });

  it('loads the encrypted thumbnail lazily and passes the decrypted original to the viewer adapter', async () => {
    const thumbnailResource = makeResource('thumbnail');
    const originalResource = makeResource('original');
    const onDownload = jest.fn().mockResolvedValue(undefined);
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(pdf);
    render(
      <PreviewHarness
        thumbnailResource={thumbnailResource}
        originalResource={originalResource}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
        onDownload={onDownload}
      />,
    );

    expect(loadAsset).not.toHaveBeenCalled();
    enterViewport();

    const trigger = await screen.findByRole('button', {name: 'Open PDF preview report.pdf'});
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(loadAsset).toHaveBeenCalledWith(thumbnailResource);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'image/png'}));

    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'success');
    });
    expect(dialog).toHaveAttribute('data-preview-url', 'blob:pdf');
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(dialog).toHaveAttribute('data-preview-type', 'pdf');
    expect(dialog).toHaveAttribute('data-context', 'chat');
    expect(dialog).toHaveAttribute('data-sender', 'Kim Dawson');
    expect(dialog).toHaveAttribute('data-timestamp', '1700000000000');
    expect(loadAsset).toHaveBeenCalledTimes(2);

    const [pdfResource] = loadAsset.mock.calls[1];
    expect(pdfResource).not.toBe(originalResource);
    expect(pdfResource.urlData).toEqual(originalResource.urlData);
    expect(pdfResource.otrKey).toEqual(originalResource.otrKey);
    expect(pdfResource.sha256).toEqual(originalResource.sha256);

    fireEvent.click(screen.getByRole('button', {name: 'Download'}));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending PDF load on close and ignores its late result after retry', async () => {
    let resolveFirstPdf: (blob: Blob) => void = noop;
    let firstPdfResource: AssetRemoteData | undefined;
    let pdfLoadCount = 0;
    const loadAsset = jest.fn((resource: AssetRemoteData) => {
      if (resource.urlData.assetKey === 'thumbnail') {
        return Promise.resolve(png);
      }

      pdfLoadCount += 1;
      resource.cancelDownload = jest.fn();
      if (pdfLoadCount === 1) {
        firstPdfResource = resource;
        return new Promise<Blob>(resolve => {
          resolveFirstPdf = resolve;
        });
      }

      return Promise.resolve(pdf);
    });
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', {name: 'Close PDF preview'}));
    expect(firstPdfResource?.cancelDownload).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
    });
    expect(loadAsset).toHaveBeenCalledTimes(3);

    await act(async () => {
      return resolveFirstPdf(pdf);
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
    expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-preview-url', 'blob:pdf');
  });

  it('reuses the loaded PDF and thumbnail after closing and reopening the modal', async () => {
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(pdf);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    const trigger = await screen.findByRole('button', {name: 'Open PDF preview report.pdf'});
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'success');
    });
    fireEvent.click(within(dialog).getByRole('button', {name: 'Close PDF preview'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
    });
    expect(loadAsset).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('replaces the cached PDF when the original resource changes', async () => {
    const thumbnailResource = makeResource('thumbnail');
    const firstOriginalResource = makeResource('original-one');
    const secondOriginalResource = makeResource('original-two');
    jest
      .spyOn(URL, 'createObjectURL')
      .mockReset()
      .mockReturnValueOnce('blob:thumbnail')
      .mockReturnValueOnce('blob:pdf-old')
      .mockReturnValueOnce('blob:pdf-new');
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(pdf).mockResolvedValueOnce(pdf);
    const preview = (originalResource: AssetRemoteData): ReactElement => {
      return (
        <PreviewHarness
          thumbnailResource={thumbnailResource}
          originalResource={originalResource}
          label="Open PDF preview report.pdf"
          loadAsset={loadAsset}
        />
      );
    };
    const {rerender} = render(preview(firstOriginalResource));
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
    });

    rerender(preview(secondOriginalResource));
    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-preview-url', 'blob:pdf-new');
    });

    expect(loadAsset).toHaveBeenCalledTimes(3);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-old');
  });

  it.each([
    [0, true],
    [1, false],
    [1016, false],
    [1017, false],
    [1020, false],
    [1024, false],
  ])('accepts a well-formed PDF header at byte offset %i only when it begins at zero', async (offset, expected) => {
    const bytes = new Uint8Array(Math.max(offset + pdfHeaderBytes.length, pdfHeaderBytes.length)).fill(0x20);
    bytes.set(pdfHeaderBytes, offset);
    const originalPdf = new Blob([bytes], {type: 'application/octet-stream'});
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(originalPdf);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', expected ? 'success' : 'unavailable');
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(expected ? 2 : 1);
  });

  it('retries a failed PDF load after the modal closes and reopens', async () => {
    const loadAsset = jest
      .fn()
      .mockResolvedValueOnce(png)
      .mockRejectedValueOnce(new Error('Encrypted asset does not match its SHA-256 hash'))
      .mockResolvedValueOnce(pdf);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'unavailable');
    });

    fireEvent.click(screen.getByRole('button', {name: 'Close PDF preview'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'success');
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-preview-url', 'blob:pdf');
    });

    expect(loadAsset).toHaveBeenCalledTimes(3);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it.each(['%PDF-X.7', '%PDF-1.x', '%PDF-10.7'])('rejects malformed PDF header %s', async header => {
    const loadAsset = jest
      .fn()
      .mockResolvedValueOnce(png)
      .mockResolvedValueOnce(new Blob([header], {type: 'application/octet-stream'}));
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    await waitFor(() => {
      expect(screen.getByRole('dialog', {name: 'report.pdf'})).toHaveAttribute('data-status', 'unavailable');
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('shows the shared unavailable state when downloaded bytes are not a PDF', async () => {
    const invalidPdf = new Blob(['not a PDF'], {type: 'application/pdf'});
    const loadAsset = jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(invalidPdf);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'unavailable');
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it.each([
    new AssetRemoteData({assetKey: 'missing-key', assetDomain: 'wire.test', sha256: new Uint8Array(32)}),
    new AssetRemoteData({assetKey: 'missing-hash', assetDomain: 'wire.test', otrKey: new Uint8Array(32)}),
  ])('does not request an original PDF without complete encryption metadata', async originalResource => {
    const loadAsset = jest.fn().mockResolvedValue(png);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={originalResource}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'unavailable');
    });
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('uses the shared unavailable state when the encrypted asset load rejects', async () => {
    const loadAsset = jest
      .fn()
      .mockResolvedValueOnce(png)
      .mockRejectedValueOnce(new Error('Encrypted asset does not match its SHA-256 hash'));
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'unavailable');
    });
    expect(loadAsset).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Blob(['<svg onload="alert(1)"/>'], {type: 'image/svg+xml'}),
    new Blob([new Uint8Array(1_048_577)], {type: 'image/png'}),
    undefined,
  ])('does not expose unsupported thumbnail bytes', async blob => {
    const loadAsset = jest.fn().mockResolvedValue(blob);
    render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={loadAsset}
      />,
    );
    enterViewport();

    await waitFor(() => {
      expect(loadAsset).toHaveBeenCalledTimes(1);
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('revokes the thumbnail and PDF URLs when their owning scopes are disposed', async () => {
    const {unmount} = render(
      <PreviewHarness
        thumbnailResource={makeResource('thumbnail')}
        originalResource={makeResource('original')}
        label="Open PDF preview report.pdf"
        loadAsset={jest.fn().mockResolvedValueOnce(png).mockResolvedValueOnce(pdf)}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    });

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
  });
});
