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

import {useState, type FunctionComponent} from 'react';

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {noop} from 'noop-esm';

import {PdfAssetPreview} from './pdfAssetPreview';

import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {requireValueForTest} from '../../../../../../page/testSupport/rootContextTestSupport';

const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {type: 'application/octet-stream'});

interface PreviewHarnessProps {
  resource: AssetRemoteData;
  label: string;
  tabIndex?: number;
  onOpenPreview?: (trigger: HTMLElement) => void;
  loadAsset: (resource: AssetRemoteData) => Promise<Blob | undefined>;
}

const PreviewHarness: FunctionComponent<PreviewHarnessProps> = ({
  resource,
  label,
  tabIndex = 0,
  onOpenPreview = noop,
  loadAsset,
}: PreviewHarnessProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PdfAssetPreview
      id="pdf-preview"
      resource={resource}
      label={label}
      fileName="report.pdf"
      closeLabel="Close preview"
      loadingLabel="Loading preview"
      errorLabel="Preview unavailable"
      isOpen={isOpen}
      onOpenPreview={trigger => {
        onOpenPreview(trigger);
        setIsOpen(true);
      }}
      onClose={() => {
        return setIsOpen(false);
      }}
      tabIndex={tabIndex}
      loadAsset={loadAsset}
    />
  );
};

describe('PdfAssetPreview', () => {
  const makeResource = (): AssetRemoteData => {
    return new AssetRemoteData({
      assetKey: 'preview',
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
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
  });

  it('opens the loaded thumbnail at full size using the same raster URL', async () => {
    const loadAsset = jest.fn().mockResolvedValue(png);
    const onOpenPreview = jest.fn();
    render(
      <PreviewHarness
        resource={makeResource()}
        label="Open PDF preview report.pdf"
        onOpenPreview={onOpenPreview}
        loadAsset={loadAsset}
      />,
    );
    expect(loadAsset).not.toHaveBeenCalled();

    enterViewport();

    const thumbnailButton = await screen.findByRole('button', {name: 'Open PDF preview report.pdf'});
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'image/png'}));

    fireEvent.click(thumbnailButton);

    const dialog = await screen.findByRole('dialog', {name: 'Open PDF preview report.pdf'});
    const enlargedImage = within(dialog).getByRole('img', {name: 'report.pdf'});
    expect(enlargedImage.getAttribute('src')).toBe(thumbnailButton.querySelector('img')?.getAttribute('src'));
    expect(within(dialog).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', {name: 'Close preview'})).toHaveFocus();
    expect(onOpenPreview).toHaveBeenCalledWith(thumbnailButton);
    expect(loadAsset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', {name: 'Close preview'}));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('hides a thumbnail that the browser cannot display without retrying its download', async () => {
    const loadAsset = jest.fn().mockResolvedValue(png);
    render(<PreviewHarness resource={makeResource()} label="Open PDF preview report.pdf" loadAsset={loadAsset} />);
    enterViewport();
    await screen.findByRole('button', {name: 'Open PDF preview report.pdf'});

    fireEvent.error(screen.getByRole('presentation'));

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(loadAsset).toHaveBeenCalledTimes(1);
  });

  it('keeps the shared URL valid while the overlay is open and revokes it on unmount', async () => {
    const resource = makeResource();
    const cancel = jest.fn();
    resource.cancelDownload = cancel;
    const {unmount} = render(
      <PreviewHarness
        resource={resource}
        label="Open PDF preview report.pdf"
        loadAsset={jest.fn().mockResolvedValue(png)}
      />,
    );
    enterViewport();
    fireEvent.click(await screen.findByRole('button', {name: 'Open PDF preview report.pdf'}));
    await screen.findByRole('dialog', {name: 'Open PDF preview report.pdf'});

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(cancel).toHaveBeenCalled();
  });

  it('keeps the current thumbnail when a replaced request finishes last', async () => {
    let resolveOld: (blob: Blob) => void = noop;
    const first = makeResource();
    const second = makeResource();
    const loadAsset = jest
      .fn()
      .mockReturnValueOnce(
        new Promise<Blob>(resolve => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValueOnce(png);
    const {rerender} = render(<PreviewHarness resource={first} label="Download first.pdf" loadAsset={loadAsset} />);
    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    rerender(<PreviewHarness resource={second} label="Download second.pdf" loadAsset={loadAsset} />);
    await screen.findByRole('button', {name: 'Download second.pdf'});
    await act(async () => {
      return resolveOld(png);
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Download second.pdf'})).toBeInTheDocument();
  });

  it('ignores a completed request after unmount', async () => {
    let resolve: (blob: Blob) => void = noop;
    const loadAsset = jest.fn().mockReturnValue(
      new Promise<Blob>(done => {
        resolve = done;
      }),
    );
    const {unmount} = render(
      <PreviewHarness resource={makeResource()} label="Open PDF preview report.pdf" loadAsset={loadAsset} />,
    );
    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });
    unmount();

    await act(async () => {
      return resolve(png);
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([
    new AssetRemoteData({assetKey: 'missing-key', assetDomain: 'wire.test', sha256: new Uint8Array(32)}),
    new AssetRemoteData({assetKey: 'missing-hash', assetDomain: 'wire.test', otrKey: new Uint8Array(32)}),
  ])('does not fetch a preview with incomplete encryption metadata', resource => {
    const loadAsset = jest.fn();
    render(<PreviewHarness resource={resource} label="Open PDF preview report.pdf" loadAsset={loadAsset} />);

    enterViewport();

    expect(loadAsset).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    new Blob(['<svg onload="alert(1)"/>'], {type: 'image/svg+xml'}),
    new Blob([new Uint8Array(1024 * 1024 + 1)], {type: 'image/png'}),
    undefined,
  ])('leaves the ordinary file card when thumbnail bytes are unsupported', async blob => {
    const loadAsset = jest.fn().mockResolvedValue(blob);
    render(<PreviewHarness resource={makeResource()} label="Open PDF preview report.pdf" loadAsset={loadAsset} />);

    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not display bytes when integrity checking or decryption fails', async () => {
    const loadAsset = jest.fn().mockRejectedValue(new Error('Encrypted asset does not match its SHA-256 hash'));
    render(<PreviewHarness resource={makeResource()} label="Open PDF preview report.pdf" loadAsset={loadAsset} />);

    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
