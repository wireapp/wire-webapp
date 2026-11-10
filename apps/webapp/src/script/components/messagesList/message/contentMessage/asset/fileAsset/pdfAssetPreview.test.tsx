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

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {noop} from 'noop-esm';

import {PdfAssetPreview} from './pdfAssetPreview';

import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {requireValueForTest} from '../../../../../../page/testSupport/rootContextTestSupport';

describe('PdfAssetPreview', () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {type: 'application/octet-stream'});
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

  it('loads only the thumbnail on visibility and keeps the download action accessible', async () => {
    const loadAsset = jest.fn().mockResolvedValue(png);
    const download = jest.fn();
    render(
      <PdfAssetPreview
        resource={makeResource()}
        label="Download report.pdf"
        onDownload={download}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );
    expect(loadAsset).not.toHaveBeenCalled();

    enterViewport();

    const button = await screen.findByRole('button', {name: 'Download report.pdf'});
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'image/png'}));
    fireEvent.click(button);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('releases the decrypted preview URL and cancels its request on unmount', async () => {
    const resource = makeResource();
    const cancel = jest.fn();
    resource.cancelDownload = cancel;
    const {unmount} = render(
      <PdfAssetPreview
        resource={resource}
        label="Download report.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={jest.fn().mockResolvedValue(png)}
      />,
    );
    enterViewport();
    await screen.findByRole('button', {name: 'Download report.pdf'});

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
    const {rerender} = render(
      <PdfAssetPreview
        resource={first}
        label="Download first.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );
    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    rerender(
      <PdfAssetPreview
        resource={second}
        label="Download second.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );
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
      <PdfAssetPreview
        resource={makeResource()}
        label="Download report.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
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
    render(
      <PdfAssetPreview
        resource={resource}
        label="Download report.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );

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
    render(
      <PdfAssetPreview
        resource={makeResource()}
        label="Download report.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );

    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not display bytes when integrity checking or decryption fails', async () => {
    const loadAsset = jest.fn().mockRejectedValue(new Error('Encrypted asset does not match its SHA-256 hash'));
    render(
      <PdfAssetPreview
        resource={makeResource()}
        label="Download report.pdf"
        onDownload={jest.fn()}
        tabIndex={0}
        loadAsset={loadAsset}
      />,
    );

    enterViewport();
    await waitFor(() => {
      return expect(loadAsset).toHaveBeenCalledTimes(1);
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
